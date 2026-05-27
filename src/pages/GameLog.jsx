import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";
import { FileText, Download, List, LayoutList, Clock, User, ChevronDown, Search } from "lucide-react";
import { format } from "date-fns";
import DropdownPill from "@/components/ui/DropdownPill";

// ─── Constants ────────────────────────────────────────────────────────────────
const PERIOD_LABELS = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4", 5: "OT" };

const POINTS_STAT_TYPES = ["points_2", "points_3", "free_throws"];

const STAT_COLORS = {
  points_2:             "bg-green-100 text-green-800",
  points_3:             "bg-green-100 text-green-800",
  free_throws:          "bg-green-100 text-green-800",
  free_throws_missed:   "bg-red-100 text-red-800",
  offensive_rebounds:   "bg-blue-100 text-blue-800",
  defensive_rebounds:   "bg-blue-100 text-blue-800",
  assists:              "bg-cyan-100 text-cyan-800",
  steals:               "bg-teal-100 text-teal-800",
  blocks:               "bg-indigo-100 text-indigo-800",
  turnovers:            "bg-red-100 text-red-800",
  fouls:                "bg-amber-100 text-amber-800",
  technical_fouls:      "bg-red-200 text-red-900",
  unsportsmanlike_fouls:"bg-red-200 text-red-900",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const periodLabel = (p) => PERIOD_LABELS[p] ?? `P${p}`;

const clockDisplay = (seconds) => {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const isAdded = (log) => (log.new_value ?? 0) > (log.old_value ?? 0);

const parseStatLabel = (label) => {
  if (!label) return null;
  try {
    const parsed = JSON.parse(label);
    return parsed?.display ?? label;
  } catch {
    return label;
  }
};

const statBadgeColor = (statType) => STAT_COLORS[statType] ?? "bg-[var(--ct-bg-elevated)] text-[var(--ct-text-primary)]";

const scoreAtAction = (log, homeTeamId) => {
  let home = log.old_home_score ?? 0;
  let away = log.old_away_score ?? 0;
  const delta = (log.stat_points ?? 0) * (isAdded(log) ? 1 : -1);
  if (log.team_id === homeTeamId) home += delta;
  else away += delta;
  return `${home} – ${away}`;
};

// ─── CSV / Excel export ───────────────────────────────────────────────────────
const buildRows = (logs) => logs.map((log) => ({
  Time:         log.created_at ? format(new Date(log.created_at), "HH:mm:ss") : "",
  Period:       periodLabel(log.period),
  Clock:        clockDisplay(log.clock_time),
  Player:       log.players?.name ?? "Unknown",
  Jersey:       log.players?.jersey_number ?? "",
  Team:         log.teams?.name ?? "",
  Action:       isAdded(log) ? "Added" : "Removed",
  Stat:         parseStatLabel(log.stat_label) ?? log.stat_type,
  "Old Value":  log.old_value ?? "",
  "New Value":  log.new_value ?? "",
  "Home Score": log.old_home_score ?? "",
  "Away Score": log.old_away_score ?? "",
  Undone:       log.undone ? "Yes" : "No",
  "Logged By":  log.logged_by ?? "",
  Device:       log.device_name ?? "",
}));

const downloadCSV = (logs, gameId) => {
  const rows = buildRows(logs);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `game-log-${gameId}.csv`;
  a.click();
};

const downloadExcel = (logs, gameId) => {
  const rows = buildRows(logs);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const tableRows = [
    `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`,
    ...rows.map(r => `<tr>${headers.map(h => `<td>${r[h]}</td>`).join("")}</tr>`),
  ].join("");
  const html = `<html><head><meta charset="UTF-8"></head><body><table>${tableRows}</table></body></html>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel" }));
  a.download = `game-log-${gameId}.xls`;
  a.click();
};

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ log, index, homeTeamId, homeName, awayName }) {
  const added = isAdded(log);
  const undone = log.undone;

  return (
    <div className={`px-4 py-3 flex flex-wrap items-start justify-between gap-2 hover:bg-[var(--ct-bg-elevated)] transition-colors ${undone ? "opacity-50" : ""}`}>
      {/* Left: index + player + action */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-[var(--ct-text-muted)] font-mono w-6 text-right shrink-0">{index + 1}</span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: log.teams?.color || "#94a3b8" }}
        >
          {log.players?.jersey_number ?? "?"}
        </div>
        <div className="min-w-0">
          <div className={`flex flex-wrap items-center gap-1.5 ${undone ? "line-through" : ""}`}>
            <span className="font-semibold text-[var(--ct-text-primary)] text-sm">{log.players?.name ?? "Unknown"}</span>
            <span className="text-xs text-[var(--ct-text-muted)]">({log.teams?.name ?? "—"})</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <Badge className={`text-xs px-1.5 py-0 ${added ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {added ? "Added" : "Removed"}
            </Badge>
            <Badge className={`text-xs px-1.5 py-0 ${statBadgeColor(log.stat_type)}`}>
              {parseStatLabel(log.stat_label) ?? log.stat_type}
            </Badge>
            <span className="text-xs text-[var(--ct-text-secondary)] font-mono">{log.old_value ?? 0} → {log.new_value ?? 0}</span>
            {undone && <Badge className="text-xs px-1.5 py-0 bg-[var(--ct-bg-elevated)] text-[var(--ct-text-secondary)]">Undone</Badge>}
          </div>
        </div>
      </div>

      {/* Right: score + logger + time */}
      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
        <span className="text-xs font-mono text-[var(--ct-text-primary)] bg-[var(--ct-bg-elevated)] rounded px-2 py-0.5">
          {homeName} {scoreAtAction(log, homeTeamId)} {awayName}
        </span>
        <span className="text-xs text-[var(--ct-text-muted)]">{periodLabel(log.period)} · {clockDisplay(log.clock_time)}</span>
        <div className="flex items-center gap-1 text-xs text-[var(--ct-text-muted)]">
          <User className="w-3 h-3" />
          <span>{log.logged_by ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--ct-text-muted)]">
          <Clock className="w-3 h-3" />
          <span>{log.created_at ? format(new Date(log.created_at), "HH:mm:ss") : "—"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────
function TimelineView({ logs, homeTeamId, homeName, awayName }) {
  const periods = [...new Set(logs.map(l => l.period).filter(Boolean))].sort((a, b) => a - b);

  if (!periods.length) return <p className="text-center py-8 text-[var(--ct-text-muted)] text-sm">No data to display</p>;

  return (
    <div className="space-y-4">
      {periods.map(period => {
        const periodLogs = logs.filter(l => l.period === period);
        const maxClock = 600; // 10 minutes per period

        return (
          <Card key={period} className="border-[var(--ct-border)]">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold text-[var(--ct-text-secondary)]">{periodLabel(period)}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Timeline bar */}
              <div className="relative h-8 bg-[var(--ct-bg-elevated)] rounded-full mb-3 overflow-hidden">
                {periodLogs.map(log => {
                  const pct = log.clock_time != null
                    ? ((maxClock - log.clock_time) / maxClock) * 100
                    : 50;
                  const added = isAdded(log);
                  return (
                    <div
                      key={log.id}
                      title={`${log.players?.name ?? "?"} · ${parseStatLabel(log.stat_label)} · ${clockDisplay(log.clock_time)}`}
                      className={`absolute top-1 w-2 h-6 rounded-full cursor-pointer ${log.undone ? "opacity-30" : ""} ${added ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ left: `calc(${Math.min(pct, 97)}% - 4px)` }}
                    />
                  );
                })}
              </div>
              {/* Mini action list */}
              <div className="divide-y divide-[var(--ct-border)] rounded-lg border border-[var(--ct-border)] overflow-hidden">
                {periodLogs.map((log, i) => (
                  <LogRow key={log.id} log={log} index={i} homeTeamId={homeTeamId} homeName={homeName} awayName={awayName} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Mobile helpers ──────────────────────────────────────────────────────────

function CollapsibleSearch({ value, onChange, placeholder }) {
  const [expanded, setExpanded] = useState(!!value);
  const inputRef = useRef(null);

  useEffect(() => { if (expanded) inputRef.current?.focus(); }, [expanded]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "var(--ct-bg-elevated)", border: "none", cursor: "pointer", color: "var(--ct-text-secondary)" }}
        aria-label="Search"
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative flex-1 min-w-[120px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--ct-text-muted)" }} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => { if (!value) setExpanded(false); }}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-1.5 rounded-full text-sm focus:outline-none"
        style={{ background: "var(--ct-bg-elevated)", border: "1px solid var(--ct-border)", color: "var(--ct-text-primary)" }}
      />
    </div>
  );
}

const FOUL_TYPES = ["fouls", "technical_fouls", "unsportsmanlike_fouls"];
const SUB_TYPES  = ["substitution", "sub_in", "sub_out"];

// Pick a timeline-dot colour for an action row
function actionDotColor(log) {
  if (log.undone) return "var(--ct-danger)";
  if (POINTS_STAT_TYPES.includes(log.stat_type) && isAdded(log)) return "var(--ct-success)";
  if (FOUL_TYPES.includes(log.stat_type)) return "var(--ct-accent-gold)";
  if (SUB_TYPES.includes(log.stat_type)) return "var(--ct-accent)";
  return "var(--ct-text-muted)";
}

// ─── Mobile timeline ─────────────────────────────────────────────────────────

function MobileTimeline({ logs, homeTeamId, homeName, awayName }) {
  if (!logs.length) {
    return <p className="text-center py-8 text-sm" style={{ color: "var(--ct-text-muted)" }}>No log entries</p>;
  }

  return (
    <div className="relative pl-5">
      {/* Vertical timeline line */}
      <div
        className="absolute left-1.5 top-2 bottom-2"
        style={{ width: "2px", background: "var(--ct-bg-elevated)" }}
      />
      {logs.map(log => {
        const undone = log.undone;
        const actionText = parseStatLabel(log.stat_label) ?? log.stat_type;
        const added = isAdded(log);
        const dotColor = actionDotColor(log);
        const playerName = log.players?.name ?? "Unknown";
        const ts = log.created_at ? format(new Date(log.created_at), "HH:mm:ss") : "—";

        return (
          <div
            key={log.id}
            className="relative rounded-lg p-3 mb-2 ml-4"
            style={{
              background: "var(--ct-bg-card)",
              border: "1px solid var(--ct-border)",
              opacity: undone ? 0.5 : 1,
            }}
          >
            {/* Dot on timeline */}
            <div
              className="absolute rounded-full"
              style={{
                width: 12,
                height: 12,
                background: dotColor,
                left: -23,
                top: 15,
                border: "2px solid var(--ct-bg-page)",
              }}
            />
            {/* Top row: player name + period badge */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-medium truncate" style={{ color: "var(--ct-text-primary)" }}>
                {playerName}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                style={{ background: "var(--ct-bg-elevated)", color: "var(--ct-text-secondary)" }}
              >
                {periodLabel(log.period)}
              </span>
            </div>
            {/* Bottom row: action + timestamp */}
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-sm"
                style={{
                  color: "var(--ct-text-secondary)",
                  textDecoration: undone ? "line-through" : "none",
                }}
              >
                {added ? "+" : "−"} {actionText}{" "}
                <span style={{ color: "var(--ct-text-muted)" }}>({log.teams?.name ?? "—"})</span>
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--ct-text-muted)" }}>
                {ts}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GameLog() {
  const { currentUser, userType, isAppAdmin } = useAuth();
  const isAuthorized = isAppAdmin || userType === "league_admin";
  const isNarrow = useIsNarrowLayout();

  const [leagues, setLeagues] = useState([]);
  const [games, setGames] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [playerSearch, setPlayerSearch] = useState("");
  const [filterPoints, setFilterPoints] = useState(false);
  const [filterUndone, setFilterUndone] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Load accessible leagues
  useEffect(() => {
    if (!isAuthorized || !currentUser) return;
    const load = async () => {
      if (isAppAdmin) {
        const { data } = await supabase.from("leagues").select("id, name").eq("is_active", true).order("name");
        if (data) setLeagues(data);
      } else {
        const { data } = await supabase
          .from("user_league_memberships")
          .select("leagues(id, name)")
          .eq("user_id", currentUser.id)
          .eq("role", "league_admin")
          .eq("is_active", true);
        if (data) setLeagues(data.map(m => m.leagues).filter(Boolean));
      }
    };
    load();
  }, [currentUser, isAppAdmin, isAuthorized]);

  // Auto-select first league
  useEffect(() => {
    if (!selectedLeagueId && leagues.length > 0) setSelectedLeagueId(leagues[0].id);
  }, [leagues, selectedLeagueId]);

  // Load games for selected league
  useEffect(() => {
    if (!selectedLeagueId) return;
    setSelectedGameId(null);
    setGames([]);
    setLogs([]);
    setLoadingGames(true);
    supabase
      .from("games")
      .select("id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id, home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name)")
      .eq("league_id", selectedLeagueId)
      .in("status", ["final", "live"])
      .order("scheduled_at", { ascending: false })
      .then(({ data, error }) => {
        console.log("[GameLog] games fetch:", { data, error });
        if (data) setGames(data);
        setLoadingGames(false);
      });
  }, [selectedLeagueId]);

  // Load logs for selected game
  useEffect(() => {
    if (!selectedGameId) { setLogs([]); return; }
    setLoadingLogs(true);
    supabase
      .from("game_logs")
      .select("*, players(id, name, jersey_number), teams(id, name, color)")
      .eq("game_id", selectedGameId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setLogs(data);
        setLoadingLogs(false);
      });
  }, [selectedGameId]);

  const selectedGame = games.find(g => g.id === selectedGameId);
  const homeName = selectedGame?.home_team?.name ?? "Home";
  const awayName = selectedGame?.away_team?.name ?? "Away";
  const homeTeamId = selectedGame?.home_team_id;

  // Apply filters
  const filteredLogs = logs.filter(log => {
    if (filterPoints && !POINTS_STAT_TYPES.includes(log.stat_type)) return false;
    if (filterUndone && !log.undone) return false;
    if (periodFilter !== "all" && String(log.period) !== periodFilter) return false;
    if (playerSearch.trim()) {
      const name = log.players?.name?.toLowerCase() ?? "";
      if (!name.includes(playerSearch.toLowerCase())) return false;
    }
    return true;
  });

  const uniquePeriods = [...new Set(logs.map(l => l.period).filter(Boolean))].sort((a, b) => a - b);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[var(--ct-text-secondary)] text-sm">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--ct-text-primary)] flex items-center gap-2">
          <FileText className="w-6 h-6 text-orange-500" />
          Game Log
        </h1>
        <p className="text-[var(--ct-text-secondary)] text-sm mt-1">Every stat action recorded during a game</p>
      </div>

      {/* Mobile: compact sticky filter row (league + game + period + player search) */}
      {isNarrow && (
        <div
          className="sticky top-0 z-10 py-2 mb-3"
          style={{ background: "var(--color-bg-page)" }}
        >
          <div
            className="flex gap-2 items-center overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {leagues.length > 0 && (
              <DropdownPill
                active
                label={leagues.find(l => l.id === selectedLeagueId)?.name || "League"}
                options={leagues.map(l => ({ id: l.id, label: l.name }))}
                selectedId={selectedLeagueId}
                onChange={v => { setSelectedLeagueId(v); setSelectedGameId(null); }}
              />
            )}
            {games.length > 0 && (
              <DropdownPill
                label={
                  selectedGameId
                    ? (() => {
                        const g = games.find(x => x.id === selectedGameId);
                        return g ? `${g.home_team?.name ?? "?"} vs ${g.away_team?.name ?? "?"}` : "Game";
                      })()
                    : (loadingGames ? "Loading…" : "Game")
                }
                options={games.map(g => ({
                  id: g.id,
                  label: `${g.home_team?.name ?? "?"} vs ${g.away_team?.name ?? "?"} — ${g.scheduled_at ? format(new Date(g.scheduled_at), "MMM d") : "—"}`,
                }))}
                selectedId={selectedGameId}
                onChange={setSelectedGameId}
              />
            )}
            {selectedGameId && uniquePeriods.length > 0 && (
              <DropdownPill
                label={periodFilter === "all" ? "All periods" : periodLabel(Number(periodFilter))}
                options={[
                  { id: "all", label: "All periods" },
                  ...uniquePeriods.map(p => ({ id: String(p), label: periodLabel(p) })),
                ]}
                selectedId={periodFilter}
                onChange={setPeriodFilter}
              />
            )}
            {selectedGameId && (
              <CollapsibleSearch
                value={playerSearch}
                onChange={setPlayerSearch}
                placeholder="Search player…"
              />
            )}
          </div>
        </div>
      )}

      {/* Desktop: Filters row 1: league + game */}
      {!isNarrow && (
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <Select
          value={selectedLeagueId ?? ""}
          onValueChange={v => { setSelectedLeagueId(v); setSelectedGameId(null); }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Select League" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={selectedGameId ?? ""}
          onValueChange={setSelectedGameId}
          disabled={!selectedLeagueId || loadingGames}
        >
          <SelectTrigger className="w-full sm:w-96">
            <SelectValue placeholder={loadingGames ? "Loading games…" : "Select Game"} />
          </SelectTrigger>
          <SelectContent>
            {games.map(g => (
              <SelectItem key={g.id} value={g.id}>
                {g.home_team?.name ?? "?"} vs {g.away_team?.name ?? "?"} — {g.scheduled_at ? format(new Date(g.scheduled_at), "MMM d, yyyy") : "—"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      )}

      {/* Desktop-only: Filters row 2 (period + player + points toggle + list/timeline) */}
      {!isNarrow && selectedGameId && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All periods</SelectItem>
              {uniquePeriods.map(p => (
                <SelectItem key={p} value={String(p)}>{periodLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search player…"
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            className="h-8 w-40 text-xs"
          />

          <button
            onClick={() => { setFilterPoints(false); setFilterUndone(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterPoints && !filterUndone ? "bg-[var(--ct-accent)] text-white" : "bg-[var(--ct-bg-elevated)] text-[var(--ct-text-secondary)] hover:bg-[var(--ct-bg-elevated)]"}`}
          >
            All Actions
          </button>
          <button
            onClick={() => { setFilterPoints(true); setFilterUndone(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterPoints ? "bg-orange-500 text-white" : "bg-[var(--ct-bg-elevated)] text-[var(--ct-text-secondary)] hover:bg-[var(--ct-bg-elevated)]"}`}
          >
            Points Only (2PT / 3PT / FT)
          </button>
          <button
            onClick={() => { setFilterUndone(true); setFilterPoints(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterUndone ? "bg-rose-500 text-white" : "bg-[var(--ct-bg-elevated)] text-[var(--ct-text-secondary)] hover:bg-[var(--ct-bg-elevated)]"}`}
          >
            Undone Only
          </button>

          <div className="ml-auto flex gap-1">
            <Button
              size="sm" variant={viewMode === "list" ? "default" : "outline"}
              className="h-8 px-2 gap-1 text-xs"
              onClick={() => setViewMode("list")}
            >
              <List className="w-3.5 h-3.5" /> List
            </Button>
            <Button
              size="sm" variant={viewMode === "timeline" ? "default" : "outline"}
              className="h-8 px-2 gap-1 text-xs"
              onClick={() => setViewMode("timeline")}
            >
              <LayoutList className="w-3.5 h-3.5" /> Timeline
            </Button>
          </div>
        </div>
      )}

      {/* Game Header */}
      {selectedGame && (
        <Card className="mb-5 border-[var(--ct-border)]">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-lg font-bold text-[var(--ct-text-primary)]">
                <span>{homeName}</span>
                <span className="text-2xl font-bold text-[var(--ct-text-primary)]">
                  {selectedGame.home_score ?? 0} – {selectedGame.away_score ?? 0}
                </span>
                <span>{awayName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[var(--ct-bg-elevated)] text-[var(--ct-text-primary)]">
                  {selectedGame.scheduled_at ? format(new Date(selectedGame.scheduled_at), "MMM d, yyyy · h:mm a") : "—"}
                </Badge>
                <Badge className={
                  selectedGame.status === "final" ? "bg-green-100 text-green-800" :
                  selectedGame.status === "live" ? "bg-orange-100 text-orange-800" :
                  "bg-blue-100 text-blue-800"
                }>
                  {selectedGame.status?.replace("_", " ")}
                </Badge>
                <Badge className="bg-[var(--ct-bg-elevated)] text-[var(--ct-text-secondary)]">{logs.length} actions</Badge>
                {logs.length > 0 && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => downloadCSV(logs, selectedGameId)}>
                      <Download className="w-3 h-3" /> CSV
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => downloadExcel(logs, selectedGameId)}>
                      <Download className="w-3 h-3" /> Excel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty states */}
      {!selectedLeagueId && (
        <div className="text-center py-16 text-[var(--ct-text-muted)] text-sm">Select a league to get started</div>
      )}
      {selectedLeagueId && !selectedGameId && !loadingGames && (
        <div className="text-center py-16 text-[var(--ct-text-muted)] text-sm">Select a game to view its log</div>
      )}
      {selectedGameId && loadingLogs && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-[var(--ct-border)] border-t-slate-800 rounded-full animate-spin" />
        </div>
      )}
      {selectedGameId && !loadingLogs && logs.length === 0 && (
        <div className="text-center py-16 text-[var(--ct-text-muted)] text-sm">No log entries found for this game</div>
      )}
      {selectedGameId && !loadingLogs && logs.length > 0 && filteredLogs.length === 0 && (
        <div className="text-center py-8 text-[var(--ct-text-muted)] text-sm">No actions match your filters</div>
      )}

      {/* Log content */}
      {filteredLogs.length > 0 && (
        isNarrow ? (
          <MobileTimeline
            logs={filteredLogs}
            homeTeamId={homeTeamId}
            homeName={homeName}
            awayName={awayName}
          />
        ) : viewMode === "list" ? (
          <Card className="border-[var(--ct-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--ct-text-secondary)]">
                Game Activity Log
                {filteredLogs.length !== logs.length && (
                  <span className="ml-2 text-xs font-normal text-[var(--ct-text-muted)]">
                    (showing {filteredLogs.length} of {logs.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--ct-border)]">
                {filteredLogs.map((log, i) => (
                  <LogRow key={log.id} log={log} index={i} homeTeamId={homeTeamId} homeName={homeName} awayName={awayName} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <TimelineView logs={filteredLogs} homeTeamId={homeTeamId} homeName={homeName} awayName={awayName} />
        )
      )}
    </div>
  );
}
