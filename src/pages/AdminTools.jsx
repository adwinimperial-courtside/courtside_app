import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Plus, Settings, Trash2, History, ChevronDown, ChevronUp,
  AlertTriangle, Trophy, RefreshCw, X, RotateCcw,
} from "lucide-react";
import { calculatePOGScore, findPlayerOfGame } from "@/components/utils/pogCalculator";
import { resolveSettings } from "@/utils/awardDefaults";
import { totalPoints } from "@/lib/playerStats";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyRow(player) {
  return {
    player_id: player.id,
    name: player.name,
    jersey_number: player.jersey_number || "",
    dnp: false,
    pts: 0, three_pt: 0, ft: 0,
    ast: 0, to_: 0, oreb: 0, dreb: 0,
    stl: 0, blk: 0, foul: 0, tf: 0, unspo: 0,
  };
}

function validateRow(row, teamName) {
  if (row.dnp) return null;
  const pts = Number(row.pts) || 0;
  const threePt = Number(row.three_pt) || 0;
  const ft = Number(row.ft) || 0;
  if (threePt * 3 + ft > pts) {
    return { player_id: row.player_id, name: row.name, team: teamName, message: "3PT and FT exceed total points" };
  }
  return null;
}

function validateAllRows(homeRows, awayRows, homeTeamName, awayTeamName) {
  const errors = [];
  for (const r of homeRows) {
    const e = validateRow(r, homeTeamName);
    if (e) errors.push(e);
  }
  for (const r of awayRows) {
    const e = validateRow(r, awayTeamName);
    if (e) errors.push(e);
  }
  return errors;
}

function calcTeamScore(rows) {
  return rows.filter(r => !r.dnp).reduce((s, r) => s + (Number(r.pts) || 0), 0);
}

function calcTeamTotals(rows) {
  const active = rows.filter(r => !r.dnp);
  return {
    pts:  active.reduce((s, r) => s + (Number(r.pts)  || 0), 0),
    reb:  active.reduce((s, r) => s + (Number(r.oreb) || 0) + (Number(r.dreb) || 0), 0),
    ast:  active.reduce((s, r) => s + (Number(r.ast)  || 0), 0),
    stl:  active.reduce((s, r) => s + (Number(r.stl)  || 0), 0),
    blk:  active.reduce((s, r) => s + (Number(r.blk)  || 0), 0),
  };
}

function rowToStats(row, teamId) {
  const pts = Number(row.pts) || 0;
  const threePt = Number(row.three_pt) || 0;
  const ft = Number(row.ft) || 0;
  const rem = pts - threePt * 3 - ft;
  const two_pt = rem >= 0 ? Math.floor(rem / 2) : 0;
  return {
    player_id: row.player_id,
    team_id: teamId,
    points: pts,
    points_2: two_pt,
    points_3: Number(row.three_pt) || 0,
    free_throws: Number(row.ft) || 0,
    offensive_rebounds: Number(row.oreb) || 0,
    defensive_rebounds: Number(row.dreb) || 0,
    assists: Number(row.ast) || 0,
    steals: Number(row.stl) || 0,
    blocks: Number(row.blk) || 0,
    turnovers: Number(row.to_) || 0,
    fouls: Number(row.foul) || 0,
    technical_fouls: Number(row.tf) || 0,
    unsportsmanlike_fouls: Number(row.unspo) || 0,
  };
}

function formatGameLabel(g) {
  const date = g.scheduled_at ? format(new Date(g.scheduled_at), "MMM d, yyyy") : "—";
  return `${g.home_team?.name ?? "?"} vs ${g.away_team?.name ?? "?"} — ${date} (${g.home_score ?? 0}–${g.away_score ?? 0})`;
}

function formatGameHeader(g) {
  const date = g.scheduled_at ? format(new Date(g.scheduled_at), "MMM d, yyyy · h:mm a") : "—";
  return `${g.home_team?.name ?? "?"} vs ${g.away_team?.name ?? "?"} — ${date}`;
}

// Move focus to the next [data-stat-input] element in document order
function focusNextStatInput(current) {
  const all = Array.from(document.querySelectorAll("[data-stat-input]"));
  const idx = all.indexOf(current);
  if (idx >= 0 && idx < all.length - 1) {
    all[idx + 1].focus();
    all[idx + 1].select();
  }
}

function focusPrevStatInput(current) {
  const all = Array.from(document.querySelectorAll("[data-stat-input]"));
  const idx = all.indexOf(current);
  if (idx > 0) {
    all[idx - 1].focus();
    all[idx - 1].select();
  }
}

// ─── StatRow ──────────────────────────────────────────────────────────────────

function StatRow({ row, onChange, hasError, errorMsg }) {
  function upd(field, value) {
    const digits = value.replace(/[^0-9]/g, "");
    const num = digits === "" ? 0 : parseInt(digits, 10);
    onChange({ ...row, [field]: num });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      focusNextStatInput(e.target);
    } else if (e.key === "Tab" && e.shiftKey) {
      // let browser handle shift+tab naturally
    }
  }

  const baseCls = "h-7 w-14 text-center text-xs px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const inputCls = `${baseCls}${hasError ? " border-red-400 bg-red-50" : ""}`;
  const disabledCls = `${baseCls} bg-[var(--ct-bg-elevated)] text-[var(--ct-text-muted)] cursor-not-allowed`;

  const rowBg = hasError && !row.dnp
    ? "border-l-4 border-red-500 bg-red-50"
    : row.dnp
    ? "opacity-40"
    : "";

  return (
    <>
      <tr className={rowBg}>
        <td className="py-1 px-2 text-xs text-[var(--ct-text-secondary)] text-center">{row.jersey_number || "—"}</td>
        <td className="py-1 px-2 text-sm font-medium whitespace-nowrap">{row.name}</td>
        <td className="py-1 px-1 text-center">
          <input
            type="checkbox"
            checked={row.dnp}
            onChange={e => onChange({ ...row, dnp: e.target.checked })}
            className="accent-slate-600"
          />
        </td>
        {/* PTS, 3PT, FT, and other stats */}
        {[
          ["pts", row.pts],
          ["three_pt", row.three_pt],
          ["ft", row.ft],
        ].map(([field, val]) => (
          <td key={field} className="py-1 px-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              data-stat-input
              value={row.dnp ? "" : (val === 0 ? "" : String(val))}
              disabled={row.dnp}
              onChange={e => upd(field, e.target.value)}
              onFocus={e => e.target.select()}
              onKeyDown={handleKeyDown}
              className={row.dnp ? disabledCls : inputCls}
              placeholder="0"
            />
          </td>
        ))}
        {[
          ["ast", row.ast], ["to_", row.to_], ["oreb", row.oreb], ["dreb", row.dreb],
          ["stl", row.stl], ["blk", row.blk], ["foul", row.foul], ["tf", row.tf], ["unspo", row.unspo],
        ].map(([field, val]) => (
          <td key={field} className="py-1 px-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              data-stat-input
              value={row.dnp ? "" : (val === 0 ? "" : String(val))}
              disabled={row.dnp}
              onChange={e => upd(field, e.target.value)}
              onFocus={e => e.target.select()}
              onKeyDown={handleKeyDown}
              className={row.dnp ? disabledCls : inputCls}
              placeholder="0"
            />
          </td>
        ))}
      </tr>
      {hasError && !row.dnp && errorMsg && (
        <tr className="bg-red-50">
          <td colSpan={15} className="pb-1 px-2">
            <span className="text-xs text-red-600">{errorMsg}</span>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── StatsTable ───────────────────────────────────────────────────────────────

function StatsTable({ teamName, rows, onChange, teamColor = "slate", errors = [] }) {
  const totals = calcTeamTotals(rows);
  const errorMap = Object.fromEntries(errors.map(e => [e.player_id, e.message]));

  function clearAll() {
    onChange(rows.map(r => ({ ...r, dnp: false, pts: 0, three_pt: 0, ft: 0, ast: 0, to_: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, foul: 0, tf: 0, unspo: 0 })));
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-semibold text-${teamColor}-700`}>{teamName}</h4>
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs text-[var(--ct-text-secondary)] px-2">
          <RotateCcw className="w-3 h-3 mr-1" /> Clear All
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-[var(--ct-border)] rounded">
          <thead className="bg-[var(--ct-bg-page)] text-xs text-[var(--ct-text-secondary)]">
            <tr>
              <th className="py-1 px-2 text-center">#</th>
              <th className="py-1 px-2 text-left">Player</th>
              <th className="py-1 px-1 text-center">DNP</th>
              <th className="py-1 px-1 text-center">PTS</th>
              <th className="py-1 px-1 text-center">3PT</th>
              <th className="py-1 px-1 text-center">FT</th>
              <th className="py-1 px-1 text-center">AST</th>
              <th className="py-1 px-1 text-center">TO</th>
              <th className="py-1 px-1 text-center">OREB</th>
              <th className="py-1 px-1 text-center">DREB</th>
              <th className="py-1 px-1 text-center">STL</th>
              <th className="py-1 px-1 text-center">BLK</th>
              <th className="py-1 px-1 text-center">FOUL</th>
              <th className="py-1 px-1 text-center">TF</th>
              <th className="py-1 px-1 text-center">UNSPO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ct-border)]">
            {rows.map((row, i) => (
              <StatRow
                key={row.player_id}
                row={row}
                hasError={!!errorMap[row.player_id]}
                errorMsg={errorMap[row.player_id]}
                onChange={updated => {
                  const next = [...rows];
                  next[i] = updated;
                  onChange(next);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--ct-text-secondary)] mt-1">
        {teamName} — Total: <b>{totals.pts}</b> PTS | <b>{totals.reb}</b> REB | <b>{totals.ast}</b> AST | <b>{totals.stl}</b> STL | <b>{totals.blk}</b> BLK
      </p>
    </div>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ errors, onDismiss }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">
              {errors.length} {errors.length === 1 ? "player has" : "players have"} invalid stats — fix highlighted rows before saving
            </p>
            <ul className="space-y-0.5">
              {errors.map(e => (
                <li key={e.player_id} className="text-xs text-red-700">
                  <span className="font-medium">{e.name}</span> ({e.team}): {e.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Pre-save Modal ────────────────────────────────────────────────────────────

function PreSaveModal({ open, onClose, onSave, homeTeam, awayTeam, homeRows, awayRows, homeScore, awayScore, awardSettings, saving, mode = "manual" }) {
  const [pogOverride, setPogOverride] = useState(null);

  const gameObj = { entry_type: "manual", edited: false, home_team_id: homeTeam?.id, away_team_id: awayTeam?.id, home_score: homeScore, away_score: awayScore };
  const allStats = [
    ...homeRows.filter(r => !r.dnp).map(r => ({ ...rowToStats(r, homeTeam?.id), player_id: r.player_id })),
    ...awayRows.filter(r => !r.dnp).map(r => ({ ...rowToStats(r, awayTeam?.id), player_id: r.player_id })),
  ];

  const computedPogId = findPlayerOfGame(allStats, gameObj, awardSettings);
  const allPlayers = [...homeRows, ...awayRows];
  const computedPog = allPlayers.find(r => r.player_id === computedPogId);

  const winningTeamId = homeScore > awayScore ? homeTeam?.id : awayScore > homeScore ? awayTeam?.id : null;
  const pogEligibleRows = winningTeamId
    ? (winningTeamId === homeTeam?.id ? homeRows : awayRows).filter(r => !r.dnp)
    : allPlayers.filter(r => !r.dnp);

  const effectivePogId = pogOverride ?? computedPogId;
  const effectivePog = allPlayers.find(r => r.player_id === effectivePogId);
  const pogStats = allStats.find(s => s.player_id === effectivePogId);
  const pogScore = pogStats ? calculatePOGScore(pogStats, awardSettings, gameObj).toFixed(1) : "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Confirm Changes" : "Confirm Game"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-[var(--ct-bg-page)] rounded-lg p-4 text-center">
            <p className="text-sm text-[var(--ct-text-secondary)] mb-1">Final Score</p>
            <p className="text-2xl font-bold text-[var(--ct-text-primary)]">
              {homeTeam?.name} <span className="text-orange-600">{homeScore}</span>
              {" — "}
              <span className="text-orange-600">{awayScore}</span> {awayTeam?.name}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--ct-text-primary)] mb-1">Player of the Game</p>
            <div className="flex items-center gap-2 bg-amber-50 rounded-lg p-3 mb-2">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{computedPog?.name ?? "—"}</p>
                <p className="text-xs text-[var(--ct-text-secondary)]">Calculated GIS: {pogScore}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-[var(--ct-text-secondary)]">Override POG (optional)</Label>
              <Select value={pogOverride ?? "__auto__"} onValueChange={v => setPogOverride(v === "__auto__" ? null : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Use calculated POG" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Use calculated POG</SelectItem>
                  {pogEligibleRows.map(r => (
                    <SelectItem key={r.player_id} value={r.player_id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {effectivePog && pogOverride && (
              <p className="text-xs text-[var(--ct-text-secondary)] mt-1">Saving with: {effectivePog.name}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={() => onSave(effectivePogId)}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
            {mode === "edit" ? "Save Changes" : "Save Game"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminTools() {
  const { currentUser, isAppAdmin, userType } = useAuth();

  // ── Shared data ──────────────────────────────────────────────────────────────
  const [leagues, setLeagues] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    if (isAppAdmin) {
      supabase.from("leagues").select("id, name").eq("is_active", true).order("name")
        .then(({ data }) => setLeagues(data ?? []));
    } else {
      supabase.from("user_league_memberships")
        .select("leagues(id, name)")
        .eq("user_id", currentUser.id)
        .eq("role", "league_admin")
        .eq("is_active", true)
        .then(({ data }) => setLeagues((data ?? []).map(r => r.leagues).filter(Boolean)));
    }
  }, [currentUser, isAppAdmin]);

  const canAccess = isAppAdmin || userType === "league_admin";

  // ── Manual Entry state ───────────────────────────────────────────────────────
  const [showManual, setShowManual] = useState(false);
  const [manualStep, setManualStep] = useState(1);
  const [manualLeagueId, setManualLeagueId] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("19:00");
  const [manualHomeId, setManualHomeId] = useState("");
  const [manualAwayId, setManualAwayId] = useState("");
  const [manualVenue, setManualVenue] = useState("");
  const [manualTeams, setManualTeams] = useState([]);
  const [homeRows, setHomeRows] = useState([]);
  const [awayRows, setAwayRows] = useState([]);
  const [awardSettings, setAwardSettings] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualErrors, setManualErrors] = useState([]);

  useEffect(() => {
    if (!manualLeagueId) { setManualTeams([]); return; }
    supabase.from("teams").select("id, name").eq("league_id", manualLeagueId).eq("is_active", true).order("name")
      .then(({ data }) => setManualTeams(data ?? []));
    supabase.from("league_award_settings").select("*").eq("league_id", manualLeagueId).maybeSingle()
      .then(({ data }) => setAwardSettings(data));
  }, [manualLeagueId]);

  async function loadPlayers(teamId, setter) {
    const { data } = await supabase.from("players")
      .select("id, name, jersey_number")
      .eq("team_id", teamId).eq("is_active", true)
      .order("jersey_number");
    setter((data ?? []).map(emptyRow));
  }

  useEffect(() => { if (manualHomeId) loadPlayers(manualHomeId, setHomeRows); }, [manualHomeId]);
  useEffect(() => { if (manualAwayId) loadPlayers(manualAwayId, setAwayRows); }, [manualAwayId]);

  const manualHomeTeam = manualTeams.find(t => t.id === manualHomeId);
  const manualAwayTeam = manualTeams.find(t => t.id === manualAwayId);
  const manualHomeScore = calcTeamScore(homeRows);
  const manualAwayScore = calcTeamScore(awayRows);
  const manualStep1Valid = manualLeagueId && manualDate && manualHomeId && manualAwayId && manualHomeId !== manualAwayId;

  function resetManual() {
    setShowManual(false); setManualStep(1);
    setManualLeagueId(""); setManualDate(""); setManualTime("19:00");
    setManualHomeId(""); setManualAwayId(""); setManualVenue("");
    setHomeRows([]); setAwayRows([]); setManualErrors([]);
  }

  function handleManualSaveClick() {
    const errors = validateAllRows(homeRows, awayRows, manualHomeTeam?.name ?? "Home", manualAwayTeam?.name ?? "Away");
    setManualErrors(errors);
    if (errors.length > 0) return;
    setShowManualModal(true);
  }

  async function saveManualGame(pogId) {
    setManualSaving(true);
    try {
      const scheduledAt = manualDate
        ? new Date(`${manualDate}T${manualTime || "19:00"}:00`).toISOString()
        : new Date().toISOString();

      const { data: game, error: gameErr } = await supabase.from("games").insert({
        league_id: manualLeagueId,
        home_team_id: manualHomeId,
        away_team_id: manualAwayId,
        scheduled_at: scheduledAt,
        venue: manualVenue || null,
        status: "final",
        entry_type: "manual",
        home_score: manualHomeScore,
        away_score: manualAwayScore,
        player_of_game: pogId || null,
      }).select("id").single();

      if (gameErr) throw gameErr;

      const statsRows = [
        ...homeRows.filter(r => !r.dnp).map(r => ({ ...rowToStats(r, manualHomeId), game_id: game.id, league_id: manualLeagueId })),
        ...awayRows.filter(r => !r.dnp).map(r => ({ ...rowToStats(r, manualAwayId), game_id: game.id, league_id: manualLeagueId })),
      ];

      if (statsRows.length > 0) {
        const { error: statsErr } = await supabase.from("player_stats").insert(statsRows);
        if (statsErr) throw statsErr;
      }

      toast({ title: "Game saved successfully" });
      setShowManualModal(false);
      resetManual();
    } catch (err) {
      toast({ title: "Error saving game", description: err.message, variant: "destructive" });
    } finally {
      setManualSaving(false);
    }
  }

  // ── Edit Game state ──────────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editLeagueId, setEditLeagueId] = useState("");
  const [editGames, setEditGames] = useState([]);
  const [editGameId, setEditGameId] = useState("");
  const [editGame, setEditGame] = useState(null);
  const [editHomeRows, setEditHomeRows] = useState([]);
  const [editAwayRows, setEditAwayRows] = useState([]);
  const [editAwardSettings, setEditAwardSettings] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [editErrors, setEditErrors] = useState([]);

  useEffect(() => {
    if (!editLeagueId) { setEditGames([]); return; }
    supabase.from("games")
      .select("id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id, player_of_game, entry_type, edited, home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name)")
      .eq("league_id", editLeagueId)
      .in("status", ["final", "completed"])
      .order("scheduled_at", { ascending: false })
      .then(({ data }) => setEditGames(data ?? []));
    supabase.from("league_award_settings").select("*").eq("league_id", editLeagueId).maybeSingle()
      .then(({ data }) => setEditAwardSettings(data));
  }, [editLeagueId]);

  useEffect(() => {
    setEditGame(editGames.find(x => x.id === editGameId) ?? null);
  }, [editGameId, editGames]);

  useEffect(() => {
    if (!editGame) return;
    async function loadEditStats() {
      const [{ data: homeP }, { data: awayP }] = await Promise.all([
        supabase.from("players").select("id, name, jersey_number").eq("team_id", editGame.home_team_id).eq("is_active", true).order("jersey_number"),
        supabase.from("players").select("id, name, jersey_number").eq("team_id", editGame.away_team_id).eq("is_active", true).order("jersey_number"),
      ]);
      const { data: existingStats } = await supabase.from("player_stats").select("*").eq("game_id", editGame.id);

      function populateRows(players, teamId) {
        return (players ?? []).map(p => {
          const s = (existingStats ?? []).find(x => x.player_id === p.id && x.team_id === teamId);
          if (!s) return emptyRow(p);
          return {
            player_id: p.id,
            name: p.name,
            jersey_number: p.jersey_number || "",
            dnp: false,
            pts: totalPoints(s),
            three_pt: s.points_3 || 0,
            ft: s.free_throws || 0,
            ast: s.assists || 0,
            to_: s.turnovers || 0,
            oreb: s.offensive_rebounds || 0,
            dreb: s.defensive_rebounds || 0,
            stl: s.steals || 0,
            blk: s.blocks || 0,
            foul: s.fouls || 0,
            tf: s.technical_fouls || 0,
            unspo: s.unsportsmanlike_fouls || 0,
          };
        });
      }

      setEditHomeRows(populateRows(homeP, editGame.home_team_id));
      setEditAwayRows(populateRows(awayP, editGame.away_team_id));
    }
    loadEditStats();
  }, [editGame]);

  const editHomeScore = calcTeamScore(editHomeRows);
  const editAwayScore = calcTeamScore(editAwayRows);

  function resetEdit() {
    setShowEdit(false); setEditStep(1);
    setEditLeagueId(""); setEditGameId(""); setEditGame(null);
    setEditHomeRows([]); setEditAwayRows([]); setEditErrors([]);
  }

  function handleEditSaveClick() {
    const errors = validateAllRows(editHomeRows, editAwayRows, editGame?.home_team?.name ?? "Home", editGame?.away_team?.name ?? "Away");
    setEditErrors(errors);
    if (errors.length > 0) return;
    setShowEditModal(true);
  }

  async function saveEditGame(pogId) {
    if (!editGame) return;
    setEditSaving(true);
    try {
      const { error: gameErr } = await supabase.from("games").update({
        home_score: editHomeScore,
        away_score: editAwayScore,
        player_of_game: pogId || null,
        edited: true,
        last_edited_by: currentUser.id,
        last_edited_at: new Date().toISOString(),
      }).eq("id", editGame.id);
      if (gameErr) throw gameErr;

      const allRows = [
        ...editHomeRows.filter(r => !r.dnp).map(r => ({ ...rowToStats(r, editGame.home_team_id), game_id: editGame.id, league_id: editLeagueId })),
        ...editAwayRows.filter(r => !r.dnp).map(r => ({ ...rowToStats(r, editGame.away_team_id), game_id: editGame.id, league_id: editLeagueId })),
      ];

      for (const row of allRows) {
        await supabase.from("player_stats").upsert(row, { onConflict: "game_id,player_id" });
      }

      await supabase.from("game_edits_audit").insert({
        game_id: editGame.id,
        league_id: editLeagueId,
        changed_by: currentUser.id,
        field_name: "player_stats",
        description: `Stats updated for ${editHomeRows.length + editAwayRows.length} players`,
      });

      if (pogId !== editGame.player_of_game) {
        await supabase.from("game_edits_audit").insert({
          game_id: editGame.id,
          league_id: editLeagueId,
          changed_by: currentUser.id,
          field_name: "player_of_game",
          description: "POG changed",
        });
      }

      toast({ title: "Game updated successfully" });
      setShowEditModal(false);
      resetEdit();
    } catch (err) {
      toast({ title: "Error updating game", description: err.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete Game state ────────────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLeagueId, setDeleteLeagueId] = useState("");
  const [deleteGames, setDeleteGames] = useState([]);
  const [deleteGameId, setDeleteGameId] = useState("");
  const [deleteGame, setDeleteGame] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!deleteLeagueId) { setDeleteGames([]); return; }
    supabase.from("games")
      .select("id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id, home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name)")
      .eq("league_id", deleteLeagueId)
      .order("scheduled_at", { ascending: false })
      .then(({ data }) => setDeleteGames(data ?? []));
  }, [deleteLeagueId]);

  useEffect(() => {
    setDeleteGame(deleteGames.find(g => g.id === deleteGameId) ?? null);
  }, [deleteGameId, deleteGames]);

  async function confirmDelete() {
    if (!deleteGame) return;
    setDeleting(true);
    try {
      const homeTeamName = deleteGame.home_team?.name ?? "?";
      const awayTeamName = deleteGame.away_team?.name ?? "?";
      const gameDate = deleteGame.scheduled_at
        ? format(new Date(deleteGame.scheduled_at), "MMM d, yyyy")
        : "unknown date";
      const gameLabel = `${homeTeamName} vs ${awayTeamName} — ${gameDate} (${deleteGame.home_score ?? 0}–${deleteGame.away_score ?? 0})`;

      // Insert audit record BEFORE deletion (FK becomes NULL after cascade)
      await supabase.from("game_edits_audit").insert({
        game_id: deleteGame.id,
        league_id: deleteLeagueId,
        changed_by: currentUser.id,
        field_name: "game_deleted",
        description: gameLabel,
      });

      const { error } = await supabase.from("games").delete().eq("id", deleteGame.id);
      if (error) throw error;

      toast({ title: "Game deleted successfully" });
      setShowDeleteModal(false);
      setDeleteConfirm("");
      setDeleteGameId(""); setDeleteGame(null);
    } catch (err) {
      toast({ title: "Error deleting game", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  // ── Change History state ─────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [historyLeagueId, setHistoryLeagueId] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 20;

  useEffect(() => {
    if (!showHistory) return;
    setHistoryLoading(true);
    let query = supabase.from("game_edits_audit")
      .select(`
        id, changed_at, field_name, description,
        changed_by_profile:profiles!game_edits_audit_changed_by_fkey(display_name),
        game:games!game_id(scheduled_at, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name))
      `)
      .order("changed_at", { ascending: false })
      .range(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE - 1);

    if (historyLeagueId) query = query.eq("league_id", historyLeagueId);

    query.then(({ data }) => {
      if (historyPage === 0) setHistoryData(data ?? []);
      else setHistoryData(prev => [...prev, ...(data ?? [])]);
      setHistoryLoading(false);
    });
  }, [showHistory, historyLeagueId, historyPage]);

  // ── Access check ─────────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] to-[var(--ct-bg-elevated)] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[var(--ct-bg-card)] rounded-xl border border-red-200 p-8 text-center">
            <Settings className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[var(--ct-text-primary)] mb-2">Access Denied</h1>
            <p className="text-[var(--ct-text-secondary)]">You don't have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] to-[var(--ct-bg-elevated)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--ct-text-primary)] flex items-center gap-3">
            <Settings className="w-8 h-8 text-orange-600" />
            Admin Tools
          </h1>
          <p className="text-[var(--ct-text-secondary)] mt-1">Manage and maintain league data</p>
        </div>

        <div className="grid gap-6">

          {/* ── Manual Game Entry ─────────────────────────────────────────── */}
          <Card className="border-[var(--ct-border)] ">
            <CardHeader
              className="border-b border-[var(--ct-border)] bg-[var(--ct-bg-card)] cursor-pointer select-none"
              onClick={() => { setShowManual(v => !v); if (showManual) resetManual(); }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Plus className="w-5 h-5 text-orange-600" />
                    Manual Game Entry
                  </CardTitle>
                  <p className="text-sm text-[var(--ct-text-secondary)] mt-1">Add a completed game with full statistics</p>
                </div>
                {showManual ? <ChevronUp className="w-5 h-5 text-[var(--ct-text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--ct-text-muted)]" />}
              </div>
            </CardHeader>

            {showManual && (
              <CardContent className="pt-6">
                {manualStep === 1 ? (
                  <div className="max-w-xl space-y-4">
                    <div>
                      <Label>League</Label>
                      <Select value={manualLeagueId} onValueChange={v => { setManualLeagueId(v); setManualHomeId(""); setManualAwayId(""); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                        <SelectContent>{leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Game Date</Label>
                        <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <Input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Home Team</Label>
                        <Select value={manualHomeId} onValueChange={setManualHomeId} disabled={!manualLeagueId}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger>
                          <SelectContent>
                            {manualTeams.filter(t => t.id !== manualAwayId).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Away Team</Label>
                        <Select value={manualAwayId} onValueChange={setManualAwayId} disabled={!manualLeagueId}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger>
                          <SelectContent>
                            {manualTeams.filter(t => t.id !== manualHomeId).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Venue <span className="text-[var(--ct-text-muted)]">(optional)</span></Label>
                      <Input value={manualVenue} onChange={e => setManualVenue(e.target.value)} placeholder="Arena / gym name" className="mt-1" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={resetManual}>Cancel</Button>
                      <Button
                        disabled={!manualStep1Valid}
                        onClick={() => setManualStep(2)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Next: Enter Player Stats
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-[var(--ct-text-secondary)]">
                        <span className="font-semibold">{manualHomeTeam?.name} vs {manualAwayTeam?.name}</span>
                        {manualDate && <span className="ml-2 text-[var(--ct-text-muted)]">— {format(new Date(manualDate), "MMM d, yyyy")}</span>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setManualStep(1)}>Edit Details</Button>
                    </div>

                    <ErrorBanner errors={manualErrors} onDismiss={() => setManualErrors([])} />

                    <StatsTable
                      teamName={manualHomeTeam?.name ?? "Home"}
                      rows={homeRows}
                      onChange={setHomeRows}
                      teamColor="blue"
                      errors={manualErrors.filter(e => homeRows.some(r => r.player_id === e.player_id))}
                    />
                    <StatsTable
                      teamName={manualAwayTeam?.name ?? "Away"}
                      rows={awayRows}
                      onChange={setAwayRows}
                      teamColor="red"
                      errors={manualErrors.filter(e => awayRows.some(r => r.player_id === e.player_id))}
                    />

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={resetManual}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                      <Button
                        onClick={handleManualSaveClick}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Trophy className="w-4 h-4 mr-2" /> Complete &amp; Save Game
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* ── Edit Game ─────────────────────────────────────────────────── */}
          <Card className="border-[var(--ct-border)] ">
            <CardHeader
              className="border-b border-[var(--ct-border)] bg-[var(--ct-bg-card)] cursor-pointer select-none"
              onClick={() => { setShowEdit(v => !v); if (showEdit) resetEdit(); }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Edit Game
                  </CardTitle>
                  <p className="text-sm text-[var(--ct-text-secondary)] mt-1">Edit statistics for a completed game</p>
                </div>
                {showEdit ? <ChevronUp className="w-5 h-5 text-[var(--ct-text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--ct-text-muted)]" />}
              </div>
            </CardHeader>

            {showEdit && (
              <CardContent className="pt-6">
                {editStep === 1 ? (
                  <div className="max-w-xl space-y-4">
                    <div>
                      <Label>League</Label>
                      <Select value={editLeagueId} onValueChange={v => { setEditLeagueId(v); setEditGameId(""); setEditGame(null); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                        <SelectContent>{leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {editLeagueId && (
                      <div>
                        <Label>Game</Label>
                        <Select value={editGameId} onValueChange={setEditGameId}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select game" /></SelectTrigger>
                          <SelectContent>
                            {editGames.map(g => <SelectItem key={g.id} value={g.id}>{formatGameLabel(g)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={resetEdit}>Cancel</Button>
                      <Button
                        disabled={!editGameId}
                        onClick={() => setEditStep(2)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Edit Stats
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-[var(--ct-text-secondary)]">
                        <span className="font-semibold">Editing: {editGame ? formatGameHeader(editGame) : ""}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setEditStep(1)}>Change Game</Button>
                    </div>

                    <ErrorBanner errors={editErrors} onDismiss={() => setEditErrors([])} />

                    <StatsTable
                      teamName={editGame?.home_team?.name ?? "Home"}
                      rows={editHomeRows}
                      onChange={setEditHomeRows}
                      teamColor="blue"
                      errors={editErrors.filter(e => editHomeRows.some(r => r.player_id === e.player_id))}
                    />
                    <StatsTable
                      teamName={editGame?.away_team?.name ?? "Away"}
                      rows={editAwayRows}
                      onChange={setEditAwayRows}
                      teamColor="red"
                      errors={editErrors.filter(e => editAwayRows.some(r => r.player_id === e.player_id))}
                    />

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={resetEdit}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                      <Button
                        onClick={handleEditSaveClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Next: Select Player of the Game
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* ── Delete Game ───────────────────────────────────────────────── */}
          <Card style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}>
            <CardHeader
              className="cursor-pointer select-none"
              style={{ borderBottom: "1px solid var(--ct-border)" }}
              onClick={() => setShowDelete(v => !v)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2" style={{ color: "var(--ct-danger)" }}>
                    <Trash2 className="w-5 h-5" />
                    Delete Game
                  </CardTitle>
                  <p className="text-sm mt-1" style={{ color: "var(--ct-text-secondary)" }}>
                    Permanently delete a game and all associated data
                  </p>
                </div>
                {showDelete
                  ? <ChevronUp className="w-5 h-5" style={{ color: "var(--ct-text-muted)" }} />
                  : <ChevronDown className="w-5 h-5" style={{ color: "var(--ct-text-muted)" }} />}
              </div>
            </CardHeader>

            {showDelete && (
              <CardContent className="pt-6">
                <div className="max-w-xl space-y-4">
                  <div>
                    <Label>League</Label>
                    <Select value={deleteLeagueId} onValueChange={v => { setDeleteLeagueId(v); setDeleteGameId(""); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                      <SelectContent>{leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {deleteLeagueId && (
                    <div>
                      <Label>Game</Label>
                      <Select value={deleteGameId} onValueChange={setDeleteGameId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select game" /></SelectTrigger>
                        <SelectContent>
                          {deleteGames.map(g => <SelectItem key={g.id} value={g.id}>{formatGameLabel(g)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {deleteGame && (
                    <div className="bg-[var(--ct-bg-page)] rounded-lg p-4 space-y-1">
                      <p className="font-semibold text-sm">{deleteGame.home_team?.name} vs {deleteGame.away_team?.name}</p>
                      <p className="text-sm text-[var(--ct-text-secondary)]">
                        {deleteGame.scheduled_at ? format(new Date(deleteGame.scheduled_at), "MMM d, yyyy · h:mm a") : "—"}
                      </p>
                      <p className="text-sm">Score: {deleteGame.home_score ?? 0} – {deleteGame.away_score ?? 0}</p>
                      <Badge variant="outline" className="text-xs capitalize">{deleteGame.status}</Badge>
                    </div>
                  )}

                  {deleteGame && (
                    <div
                      className="rounded-lg p-3 flex items-start gap-2"
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--ct-danger)" }} />
                      <p className="text-sm" style={{ color: "var(--ct-danger)" }}>
                        This will permanently delete the game, all player stats, and all game logs.
                      </p>
                    </div>
                  )}

                  <Button
                    variant="destructive"
                    disabled={!deleteGame}
                    onClick={() => { setDeleteConfirm(""); setShowDeleteModal(true); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Game
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* ── Change History ────────────────────────────────────────────── */}
          <Card className="border-[var(--ct-border)] ">
            <CardHeader
              className="border-b border-[var(--ct-border)] bg-[var(--ct-bg-card)] cursor-pointer select-none"
              onClick={() => { setShowHistory(v => !v); setHistoryPage(0); }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    Change History
                  </CardTitle>
                  <p className="text-sm text-[var(--ct-text-secondary)] mt-1">Audit trail of game edits</p>
                </div>
                {showHistory ? <ChevronUp className="w-5 h-5 text-[var(--ct-text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--ct-text-muted)]" />}
              </div>
            </CardHeader>

            {showHistory && (
              <CardContent className="pt-6">
                <div className="mb-4 max-w-xs">
                  <Select value={historyLeagueId || "__all__"} onValueChange={v => { setHistoryLeagueId(v === "__all__" ? "" : v); setHistoryPage(0); setHistoryData([]); }}>
                    <SelectTrigger><SelectValue placeholder="All leagues" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All leagues</SelectItem>
                      {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {historyLoading && historyPage === 0 ? (
                  <p className="text-sm text-[var(--ct-text-secondary)]">Loading...</p>
                ) : historyData.length === 0 ? (
                  <p className="text-sm text-[var(--ct-text-secondary)]">No edit history found.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-[var(--ct-text-secondary)] border-b">
                          <tr>
                            <th className="py-2 px-3 text-left">Date</th>
                            <th className="py-2 px-3 text-left">Changed By</th>
                            <th className="py-2 px-3 text-left">Game</th>
                            <th className="py-2 px-3 text-left">Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ct-border)]">
                          {historyData.map(row => {
                            const isDeleted = row.field_name === "game_deleted";
                            const rowCls = isDeleted
                              ? "bg-red-50 border-l-4 border-red-500"
                              : "hover:bg-[var(--ct-bg-elevated)]";
                            const gameLabel = row.game
                              ? `${row.game.home_team?.name} vs ${row.game.away_team?.name}`
                              : isDeleted
                              ? row.description
                              : "—";
                            return (
                              <tr key={row.id} className={rowCls}>
                                <td className="py-2 px-3 whitespace-nowrap text-[var(--ct-text-secondary)] text-xs">
                                  {row.changed_at ? format(new Date(row.changed_at), "MMM d, yyyy · h:mm a") : "—"}
                                </td>
                                <td className="py-2 px-3 text-[var(--ct-text-primary)]">{row.changed_by_profile?.display_name ?? "—"}</td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  {isDeleted ? (
                                    <span className="text-red-700 font-medium">{gameLabel}</span>
                                  ) : (
                                    <span className="text-[var(--ct-text-primary)]">{gameLabel}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  {isDeleted ? (
                                    <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
                                      <Trash2 className="w-3.5 h-3.5" /> Game Deleted
                                    </span>
                                  ) : (
                                    <span className="text-[var(--ct-text-secondary)]">{row.description || row.field_name}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {historyData.length % HISTORY_PAGE_SIZE === 0 && (
                      <Button variant="outline" size="sm" className="mt-3" disabled={historyLoading}
                        onClick={() => setHistoryPage(p => p + 1)}>
                        Load More
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* ── Pre-save Modal (Manual) ─────────────────────────────────────── */}
      <PreSaveModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSave={saveManualGame}
        homeTeam={manualHomeTeam}
        awayTeam={manualAwayTeam}
        homeRows={homeRows}
        awayRows={awayRows}
        homeScore={manualHomeScore}
        awayScore={manualAwayScore}
        awardSettings={awardSettings}
        saving={manualSaving}
        mode="manual"
      />

      {/* ── Pre-save Modal (Edit) ───────────────────────────────────────── */}
      <PreSaveModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={saveEditGame}
        homeTeam={editGame?.home_team}
        awayTeam={editGame?.away_team}
        homeRows={editHomeRows}
        awayRows={editAwayRows}
        homeScore={editHomeScore}
        awayScore={editAwayScore}
        awardSettings={editAwardSettings}
        saving={editSaving}
        mode="edit"
      />

      {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
      <Dialog open={showDeleteModal} onOpenChange={v => { if (!v) setShowDeleteModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {deleteGame && (
              <div className="bg-[var(--ct-bg-page)] rounded-lg p-3 text-sm">
                <p className="font-semibold">{deleteGame.home_team?.name} vs {deleteGame.away_team?.name}</p>
                <p className="text-[var(--ct-text-secondary)]">{deleteGame.scheduled_at ? format(new Date(deleteGame.scheduled_at), "MMM d, yyyy") : "—"}</p>
              </div>
            )}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <p className="font-semibold mb-1">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-0.5 text-red-600">
                <li>The game record</li>
                <li>All player statistics</li>
                <li>All game log entries</li>
              </ul>
            </div>
            <div>
              <Label className="text-sm">Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
              <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={confirmDelete}
            >
              {deleting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Yes, Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
