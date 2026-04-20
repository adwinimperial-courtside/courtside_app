import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Trophy, Shield, Star, Users, Save, RotateCcw, Info,
  ChevronDown, ChevronUp, SlidersHorizontal, CheckCircle, AlertCircle,
} from "lucide-react";

// ─── Defaults matching DB column names ───────────────────────────────────────
const DEFAULTS = {
  mvp_points_weight: 1.0,
  mvp_oreb_weight: 1.2,
  mvp_dreb_weight: 1.0,
  mvp_ast_weight: 1.5,
  mvp_stl_weight: 2.5,
  mvp_blk_weight: 2.0,
  mvp_to_penalty: 2.0,
  mvp_foul_penalty: 0.5,
  mvp_tech_penalty: 3.0,
  mvp_unsport_penalty: 4.0,
  mvp_gis_contribution: 0.6,
  mvp_games_played_contribution: 20,
  mvp_team_win_contribution: 20,
  mvp_season_tech_penalty: 3.0,
  mvp_season_unsport_penalty: 5.0,
  mvp_min_games_pct: 60,
  dpoy_stl_weight: 3.0,
  dpoy_blk_weight: 2.5,
  dpoy_oreb_weight: 1.5,
  dpoy_dreb_weight: 1.0,
  dpoy_foul_penalty: 1.5,
  dpoy_to_penalty: 2.0,
  dpoy_tech_penalty: 3.0,
  dpoy_unsport_penalty: 4.0,
  dpoy_games_played_contribution: 10,
  dpoy_season_tech_penalty: 2.0,
  dpoy_season_unsport_penalty: 3.0,
  dpoy_min_games_pct: 60,
  pog_points_weight: 1.0,
  pog_oreb_weight: 1.2,
  pog_dreb_weight: 1.0,
  pog_ast_weight: 1.5,
  pog_stl_weight: 2.5,
  pog_blk_weight: 2.0,
  pog_to_penalty: 2.0,
  pog_foul_penalty: 0.5,
  pog_tech_penalty: 3.0,
  pog_unsport_penalty: 4.0,
  pog_winning_team_only: true,
  mythical_source: "mvp_rankings",
  mythical_count: 5,
};

// ─── Validation ──────────────────────────────────────────────────────────────
function validateField(key, value) {
  if (key === "pog_winning_team_only" || key === "mythical_source") return null;
  if (key.endsWith("_pct") || key.endsWith("_contribution") || key === "mythical_count") {
    const n = parseInt(value, 10);
    if (isNaN(n)) return "Must be a whole number";
    if (key === "mythical_count" && (n < 1 || n > 15)) return "Must be between 1 and 15";
    if (key !== "mythical_count" && (n < 0 || n > 100)) return "Must be between 0 and 100";
    return null;
  }
  if (key.includes("_penalty") || key.includes("season_")) {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0 || n > 20) return "Penalty must be between 0 and 20";
    return null;
  }
  if (key === "mvp_gis_contribution") {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0 || n > 1) return "Must be between 0 and 1";
    return null;
  }
  // weights
  const n = parseFloat(value);
  if (isNaN(n) || n < 0 || n > 10) return "Weight must be between 0 and 10";
  return null;
}

// ─── NumField ─────────────────────────────────────────────────────────────────
function NumField({ label, fieldKey, value, onChange, errors, step = 0.1, min = 0, max = 20, tooltip }) {
  const error = errors[fieldKey];
  const isZeroWeight = !error && !fieldKey.includes("_penalty") && !fieldKey.includes("season_") &&
    !fieldKey.endsWith("_pct") && !fieldKey.endsWith("_contribution") && !fieldKey.includes("mythical") &&
    fieldKey !== "mvp_gis_contribution" && parseFloat(value) === 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        {tooltip && (
          <span className="group relative cursor-help">
            <Info className="w-3 h-3 text-slate-400" />
            <span className="invisible group-hover:visible absolute left-0 bottom-5 z-10 w-56 rounded-md bg-slate-800 text-white text-xs px-2 py-1.5 shadow-lg">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(fieldKey, e.target.value)}
        className={`h-8 w-full rounded-md border px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-400 ${
          error ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {isZeroWeight && !error && (
        <p className="text-xs text-amber-600">This stat will not affect rankings</p>
      )}
    </div>
  );
}

function FieldGrid({ children }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>;
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">{children}</p>;
}

function FormulaBox({ children }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
      {children}
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mt-4">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ─── Award Cards ──────────────────────────────────────────────────────────────
function AwardCard({ icon: Icon, iconColor, title, onReset, formula, insight, children }) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-slate-500 hover:text-slate-800 gap-1">
            <RotateCcw className="w-3 h-3" /> Reset to Default
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <Collapsible open={formulaOpen} onOpenChange={setFormulaOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium mb-2">
            {formulaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            View Formula
          </CollapsibleTrigger>
          <CollapsibleContent>
            <FormulaBox>{formula}</FormulaBox>
          </CollapsibleContent>
        </Collapsible>
        {children}
        {insight && <InfoBox>{insight}</InfoBox>}
      </CardContent>
    </Card>
  );
}

// ─── Change History ───────────────────────────────────────────────────────────
function ChangeHistory({ leagueId }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    let q = supabase
      .from("league_award_settings_audit")
      .select("*, profiles!league_award_settings_audit_changed_by_profiles_fkey(display_name)")
      .eq("league_id", leagueId)
      .order("changed_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (filter !== "all") q = q.eq("award_type", filter);
    const { data, error } = await q;
    if (error) console.error("[ChangeHistory] select error:", error);
    setRows(prev => page === 0 ? (data || []) : [...prev, ...(data || [])]);
    setLoading(false);
  }, [leagueId, filter, page]);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => { setPage(0); setRows([]); }, [filter, leagueId]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 w-full">
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Change History
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={v => { setFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All awards</SelectItem>
                <SelectItem value="mvp">MVP</SelectItem>
                <SelectItem value="dpoy">DPOY</SelectItem>
                <SelectItem value="pog">POG</SelectItem>
                <SelectItem value="mythical_five">Mythical Five</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading && page === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No changes recorded yet</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                  <tr>
                    {["Date", "Changed By", "Award", "Setting", "From", "To"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {new Date(r.changed_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.profiles?.display_name ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600 uppercase">{r.award_type}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono">{r.field_name}</td>
                      <td className="px-3 py-2 text-red-600">{r.old_value ?? "—"}</td>
                      <td className="px-3 py-2 text-green-700">{r.new_value ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length === (page + 1) * PAGE_SIZE && (
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setPage(p => p + 1)}>
              Load More
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeagueAwardSettings() {
  const { currentUser, userType, isAppAdmin } = useAuth();
  const isAuthorized = isAppAdmin || userType === "league_admin";

  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [settings, setSettings] = useState({ ...DEFAULTS });
  const [savedSettings, setSavedSettings] = useState({ ...DEFAULTS });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Load accessible leagues
  useEffect(() => {
    if (!currentUser || !isAuthorized) return;
    const loadLeagues = async () => {
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
    loadLeagues();
  }, [currentUser, isAppAdmin, isAuthorized]);

  // Auto-select first league
  useEffect(() => {
    if (!selectedLeagueId && leagues.length > 0) setSelectedLeagueId(leagues[0].id);
  }, [leagues, selectedLeagueId]);

  // Fetch settings for selected league
  useEffect(() => {
    if (!selectedLeagueId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("league_award_settings")
        .select("*")
        .eq("league_id", selectedLeagueId)
        .single();
      if (data) {
        const merged = { ...DEFAULTS, ...data };
        setSettings(merged);
        setSavedSettings(merged);
        setErrors({});
      }
    };
    fetch();
  }, [selectedLeagueId]);

  const handleChange = (key, raw) => {
    const value = key === "pog_winning_team_only" ? raw : raw;
    setSettings(prev => ({ ...prev, [key]: value }));
    const err = validateField(key, value);
    setErrors(prev => ({ ...prev, [key]: err || undefined }));
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetSection = (prefix) => {
    const patch = {};
    Object.keys(DEFAULTS).forEach(k => {
      if (k.startsWith(prefix)) patch[k] = DEFAULTS[k];
    });
    setSettings(prev => ({ ...prev, ...patch }));
    setErrors(prev => {
      const next = { ...prev };
      Object.keys(patch).forEach(k => delete next[k]);
      return next;
    });
  };

  const resetAll = () => {
    setSettings({ ...DEFAULTS });
    setErrors({});
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const showMsg = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleSave = async () => {
    if (hasErrors || !selectedLeagueId) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("league_award_settings")
        .update({ ...settings, updated_by: currentUser.id, updated_at: now })
        .eq("league_id", selectedLeagueId);

      if (error) throw error;

      // Build audit records for changed fields
      const awardTypeFor = (key) => {
        if (key.startsWith("mvp_")) return "mvp";
        if (key.startsWith("dpoy_")) return "dpoy";
        if (key.startsWith("pog_")) return "pog";
        if (key.startsWith("mythical_")) return "mythical_five";
        return "other";
      };

      const auditRows = Object.keys(settings)
        .filter(k => !["id", "league_id", "created_at", "updated_at", "updated_by"].includes(k))
        .filter(k => String(settings[k]) !== String(savedSettings[k]))
        .map(k => ({
          league_id: selectedLeagueId,
          changed_by: currentUser.id,
          changed_at: now,
          award_type: awardTypeFor(k),
          field_name: k,
          old_value: String(savedSettings[k]),
          new_value: String(settings[k]),
        }));

      if (auditRows.length > 0) {
        const { error: auditError } = await supabase
          .from("league_award_settings_audit")
          .insert(auditRows);
        if (auditError) throw auditError;
      }

      setSavedSettings({ ...settings });
      showMsg("success", "Settings saved. Rankings are being recalculated.");
    } catch (err) {
      showMsg("error", err.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500 text-sm">Access denied.</p>
      </div>
    );
  }

  const s = settings;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SlidersHorizontal className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-slate-900">League Award Settings</h1>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm border ${
          statusMsg.type === "error"
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-green-50 border-green-200 text-green-700"
        }`}>
          {statusMsg.type === "error"
            ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* League selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 shrink-0">League</label>
        <Select value={selectedLeagueId ?? ""} onValueChange={setSelectedLeagueId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a league" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── MVP ─────────────────────────────────────────────────────── */}
      <AwardCard
        icon={Trophy} iconColor="text-yellow-500" title="MVP Settings"
        onReset={() => resetSection("mvp_")}
        formula={`Per-Game GIS =
  (PTS × points_weight) + (OREB × oreb_weight) + (DREB × dreb_weight)
  + (AST × ast_weight) + (STL × stl_weight) + (BLK × blk_weight)
  − (TO × to_penalty) − (PF × foul_penalty)
  − (TECH × tech_penalty) − (UNSPORT × unsport_penalty)

Season GIS Avg = sum(Per-Game GIS) / games_played

MVP Score =
  (Season GIS Avg × gis_contribution)
  + (games_played_% × games_contribution / 100)
  + (team_win_% × win_contribution / 100)
  − (season_techs × season_tech_penalty)
  − (season_unsports × season_unsport_penalty)

Eligibility: Must play ≥ min_games_% of team's games`}
        insight="MVP rewards consistent all-round performance across the season. Adjust weights to reflect how your league values different contributions."
      >
        <SectionLabel>Statistic Weights</SectionLabel>
        <FieldGrid>
          <NumField label="Points" fieldKey="mvp_points_weight" value={s.mvp_points_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Off Rebound" fieldKey="mvp_oreb_weight" value={s.mvp_oreb_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Def Rebound" fieldKey="mvp_dreb_weight" value={s.mvp_dreb_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Assists" fieldKey="mvp_ast_weight" value={s.mvp_ast_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Steals" fieldKey="mvp_stl_weight" value={s.mvp_stl_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Blocks" fieldKey="mvp_blk_weight" value={s.mvp_blk_weight} onChange={handleChange} errors={errors} min={0} max={10} />
        </FieldGrid>

        <SectionLabel>Penalties (per game)</SectionLabel>
        <FieldGrid>
          <NumField label="Turnover" fieldKey="mvp_to_penalty" value={s.mvp_to_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Personal Foul" fieldKey="mvp_foul_penalty" value={s.mvp_foul_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Technical" fieldKey="mvp_tech_penalty" value={s.mvp_tech_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Unsportsmanlike" fieldKey="mvp_unsport_penalty" value={s.mvp_unsport_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
        </FieldGrid>

        <SectionLabel>Final Score &amp; Eligibility</SectionLabel>
        <FieldGrid>
          <NumField
            label="Avg GIS contribution"
            fieldKey="mvp_gis_contribution"
            value={s.mvp_gis_contribution}
            onChange={handleChange}
            errors={errors}
            min={0} max={1} step={0.01}
            tooltip="Game Impact Score (GIS) measures a player's overall contribution in a single game. It combines positive stats (points, rebounds, assists, steals, blocks) weighted by their importance, minus penalties for turnovers and fouls."
          />
          <NumField label="Games played %" fieldKey="mvp_games_played_contribution" value={s.mvp_games_played_contribution} onChange={handleChange} errors={errors} min={0} max={100} step={1} />
          <NumField label="Team win %" fieldKey="mvp_team_win_contribution" value={s.mvp_team_win_contribution} onChange={handleChange} errors={errors} min={0} max={100} step={1} />
          <NumField label="Season tech penalty" fieldKey="mvp_season_tech_penalty" value={s.mvp_season_tech_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Season unsport penalty" fieldKey="mvp_season_unsport_penalty" value={s.mvp_season_unsport_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Min games %" fieldKey="mvp_min_games_pct" value={s.mvp_min_games_pct} onChange={handleChange} errors={errors} min={0} max={100} step={1} />
        </FieldGrid>
      </AwardCard>

      {/* ── DPOY ────────────────────────────────────────────────────── */}
      <AwardCard
        icon={Shield} iconColor="text-blue-500" title="DPOY Settings"
        onReset={() => resetSection("dpoy_")}
        formula={`Per-Game Defensive Score =
  (STL × stl_weight) + (BLK × blk_weight)
  + (OREB × oreb_weight) + (DREB × dreb_weight)
  − (PF × foul_penalty) − (TO × to_penalty)
  − (TECH × tech_penalty) − (UNSPORT × unsport_penalty)

DPOY Score =
  Season Avg Defensive Score
  + (games_played_% × games_contribution / 100)
  − (season_techs × season_tech_penalty)
  − (season_unsports × season_unsport_penalty)

Eligibility: Must play ≥ min_games_% of team's games`}
        insight="DPOY focuses on defensive impact. Steals and blocks are the primary drivers; turnovers are penalised because they negate defensive effort."
      >
        <SectionLabel>Statistic Weights</SectionLabel>
        <FieldGrid>
          <NumField label="Steals" fieldKey="dpoy_stl_weight" value={s.dpoy_stl_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Blocks" fieldKey="dpoy_blk_weight" value={s.dpoy_blk_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Off Rebound" fieldKey="dpoy_oreb_weight" value={s.dpoy_oreb_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Def Rebound" fieldKey="dpoy_dreb_weight" value={s.dpoy_dreb_weight} onChange={handleChange} errors={errors} min={0} max={10} />
        </FieldGrid>

        <SectionLabel>Penalties (per game)</SectionLabel>
        <FieldGrid>
          <NumField label="Personal Foul" fieldKey="dpoy_foul_penalty" value={s.dpoy_foul_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Turnover" fieldKey="dpoy_to_penalty" value={s.dpoy_to_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Technical" fieldKey="dpoy_tech_penalty" value={s.dpoy_tech_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Unsportsmanlike" fieldKey="dpoy_unsport_penalty" value={s.dpoy_unsport_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
        </FieldGrid>

        <SectionLabel>Final Score &amp; Eligibility</SectionLabel>
        <FieldGrid>
          <NumField label="Games played %" fieldKey="dpoy_games_played_contribution" value={s.dpoy_games_played_contribution} onChange={handleChange} errors={errors} min={0} max={100} step={1} />
          <NumField label="Season tech penalty" fieldKey="dpoy_season_tech_penalty" value={s.dpoy_season_tech_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Season unsport penalty" fieldKey="dpoy_season_unsport_penalty" value={s.dpoy_season_unsport_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Min games %" fieldKey="dpoy_min_games_pct" value={s.dpoy_min_games_pct} onChange={handleChange} errors={errors} min={0} max={100} step={1} />
        </FieldGrid>
      </AwardCard>

      {/* ── POG ─────────────────────────────────────────────────────── */}
      <AwardCard
        icon={Star} iconColor="text-orange-500" title="Player of the Game Settings"
        onReset={() => resetSection("pog_")}
        formula={`Game Score =
  (PTS × points_weight) + (OREB × oreb_weight) + (DREB × dreb_weight)
  + (AST × ast_weight) + (STL × stl_weight) + (BLK × blk_weight)
  − (TO × to_penalty) − (PF × foul_penalty)
  − (TECH × tech_penalty) − (UNSPORT × unsport_penalty)

Winner: Highest Game Score
  (from winning team only if pog_winning_team_only is true)`}
        insight="POG is awarded per game, not per season. Enable 'Winning team only' to require the winner to come from the victorious side."
      >
        <SectionLabel>Statistic Weights</SectionLabel>
        <FieldGrid>
          <NumField label="Points" fieldKey="pog_points_weight" value={s.pog_points_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Off Rebound" fieldKey="pog_oreb_weight" value={s.pog_oreb_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Def Rebound" fieldKey="pog_dreb_weight" value={s.pog_dreb_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Assists" fieldKey="pog_ast_weight" value={s.pog_ast_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Steals" fieldKey="pog_stl_weight" value={s.pog_stl_weight} onChange={handleChange} errors={errors} min={0} max={10} />
          <NumField label="Blocks" fieldKey="pog_blk_weight" value={s.pog_blk_weight} onChange={handleChange} errors={errors} min={0} max={10} />
        </FieldGrid>

        <SectionLabel>Penalties (per game)</SectionLabel>
        <FieldGrid>
          <NumField label="Turnover" fieldKey="pog_to_penalty" value={s.pog_to_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Personal Foul" fieldKey="pog_foul_penalty" value={s.pog_foul_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Technical" fieldKey="pog_tech_penalty" value={s.pog_tech_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
          <NumField label="Unsportsmanlike" fieldKey="pog_unsport_penalty" value={s.pog_unsport_penalty} onChange={handleChange} errors={errors} min={0} max={20} />
        </FieldGrid>

        <SectionLabel>Eligibility</SectionLabel>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={s.pog_winning_team_only}
            onChange={() => handleToggle("pog_winning_team_only")}
            className="accent-orange-500 w-4 h-4"
          />
          <span className="text-sm text-slate-700">Winning team only</span>
        </label>
      </AwardCard>

      {/* ── Mythical Five ────────────────────────────────────────────── */}
      <AwardCard
        icon={Users} iconColor="text-purple-500" title="Mythical Five Settings"
        onReset={() => resetSection("mythical_")}
        formula={`Mythical Five selects the top N players by ranking source.

  Source: mvp_rankings — uses the MVP season score rankings
  Count: number of players selected (default 5)`}
        insight="The Mythical Five is typically the top 5 players of the season. Increase the count for larger leagues."
      >
        <FieldGrid>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Source</label>
            <Select value={s.mythical_source} onValueChange={v => handleChange("mythical_source", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mvp_rankings">MVP Rankings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumField
            label="Count"
            fieldKey="mythical_count"
            value={s.mythical_count}
            onChange={handleChange}
            errors={errors}
            min={1} max={15} step={1}
          />
        </FieldGrid>
      </AwardCard>

      {/* ── Footer buttons ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSettings({ ...savedSettings })}>
            Cancel
          </Button>
          <Button variant="outline" onClick={resetAll} className="gap-1">
            <RotateCcw className="w-4 h-4" /> Reset All to Default
          </Button>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || hasErrors || !selectedLeagueId}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {/* ── Change History ────────────────────────────────────────────── */}
      {selectedLeagueId && (
        <div className="pt-4 border-t border-slate-200">
          <ChangeHistory leagueId={selectedLeagueId} />
        </div>
      )}
    </div>
  );
}
