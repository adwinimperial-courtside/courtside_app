import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  format, startOfWeek, endOfWeek, addWeeks, startOfDay,
  isSameDay, isWithinInterval,
} from "date-fns";
import {
  Plus, Calendar, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";

import CreateGameDialog from "@/components/schedule/CreateGameDialog";
import EditGameSettingsDialog from "@/components/schedule/EditGameSettingsDialog";
import DefaultWinnerDialog from "@/components/schedule/DefaultWinnerDialog";
import ScheduleGameCard from "@/components/schedule/ScheduleGameCard";
import ScoreStrip from "@/components/schedule/ScoreStrip";

// ─── constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "live-today", label: "Live & today", short: "Today" },
  { id: "week",       label: "This week",    short: "Week"  },
  { id: "results",    label: "Results",      short: "Results" },
  { id: "upcoming",   label: "Upcoming",     short: "Upcoming" },
];

const RESULTS_PAGE_SIZE = 20;

// ─── themed native select ────────────────────────────────────────────────────

function ThemedSelect({ value, onChange, options, ariaLabel, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`px-3 py-2 rounded-lg text-sm font-medium focus:outline-none appearance-none cursor-pointer ${className}`}
      style={{
        background: `var(--ct-bg-card) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23A0A0B8'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd' /></svg>") no-repeat right 10px center`,
        backgroundSize: "16px",
        border: "1px solid var(--ct-border)",
        color: "var(--ct-text-primary)",
        paddingRight: "32px",
        minHeight: 40,
      }}
    >
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          style={{ background: "var(--ct-bg-card)", color: "var(--ct-text-primary)" }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNarrow = useIsNarrowLayout();
  const { currentUser, isAppAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState("live-today");
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [resultsPage, setResultsPage] = useState(1);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editSettingsFor, setEditSettingsFor] = useState(null);
  const [markDefaultFor, setMarkDefaultFor] = useState(null);

  // ── memberships + profile ──────────────────────────────────────────────────
  const userId = currentUser?.id;

  const { data: memberships = [] } = useQuery({
    queryKey: ["league-memberships", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_league_memberships")
        .select("role, league:leagues(id, name)")
        .eq("user_id", userId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("default_league_id")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const accessibleLeagues = memberships.map((m) => m.league).filter(Boolean);

  useEffect(() => {
    if (selectedLeague) return;
    if (profile?.default_league_id) setSelectedLeague(profile.default_league_id);
    else if (accessibleLeagues.length === 1) setSelectedLeague(accessibleLeagues[0].id);
  }, [memberships, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentMembership = memberships.find((m) => m.league?.id === selectedLeague);
  const canManage = isAppAdmin || currentMembership?.role === "league_admin";

  // ── teams for selected league ──────────────────────────────────────────────
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", selectedLeague],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, short_name, color, logo_url, league_id")
        .eq("league_id", selectedLeague)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLeague,
  });

  // ── all games for selected league (single query, client-side filtering) ──
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["schedule-games", selectedLeague],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select(`
          *,
          home_team:teams!home_team_id(id, name, short_name, color),
          away_team:teams!away_team_id(id, name, short_name, color),
          league:leagues!league_id(id, name),
          pog_player:players!player_of_game(id, name, first_name, last_name, jersey_number)
        `)
        .eq("league_id", selectedLeague)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLeague,
    staleTime: 15000,
  });

  // ── Team-filtered games ────────────────────────────────────────────────────
  const byTeam = useMemo(() => {
    if (selectedTeam === "all") return games;
    return games.filter((g) => g.home_team_id === selectedTeam || g.away_team_id === selectedTeam);
  }, [games, selectedTeam]);

  // ── Live-game period lookup (from game_logs) ───────────────────────────────
  const liveGameIds = useMemo(
    () => byTeam.filter((g) => g.status === "live").map((g) => g.id),
    [byTeam]
  );
  const { data: livePeriods = {} } = useQuery({
    queryKey: ["live-periods", [...liveGameIds].sort().join(",")],
    queryFn: async () => {
      if (!liveGameIds.length) return {};
      const { data, error } = await supabase
        .from("game_logs")
        .select("game_id, period, created_at")
        .in("game_id", liveGameIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = {};
      for (const log of data || []) {
        if (log.period != null && map[log.game_id] == null) map[log.game_id] = log.period;
      }
      return map;
    },
    enabled: liveGameIds.length > 0,
    refetchInterval: 30000,
  });

  // ── Tab-specific sections + score-strip contents ──────────────────────────
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const sections = useMemo(() => {
    if (activeTab === "live-today") {
      const live = byTeam.filter((g) => g.status === "live");
      const todayUpcoming = byTeam
        .filter((g) => g.status === "scheduled" && g.scheduled_at && isSameDay(new Date(g.scheduled_at), today))
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
      const recentResults = byTeam
        .filter((g) => g.status === "final")
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
        .slice(0, 3);

      const out = [];
      if (live.length) out.push({ label: "Live now", games: live });
      if (todayUpcoming.length)
        out.push({ label: `Today · ${format(today, "EEE, MMM d")}`, games: todayUpcoming });
      if (recentResults.length) out.push({ label: "Recent results", games: recentResults });
      return out;
    }

    if (activeTab === "week") {
      const weekGames = byTeam.filter(
        (g) => g.scheduled_at && isWithinInterval(new Date(g.scheduled_at), { start: weekStart, end: weekEnd })
      );
      // Group by day
      const byDay = new Map();
      for (const g of weekGames) {
        const key = format(startOfDay(new Date(g.scheduled_at)), "yyyy-MM-dd");
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(g);
      }
      return [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dayKey, gs]) => ({
          label: format(new Date(dayKey), "EEEE, MMMM d"),
          games: gs.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
        }));
    }

    if (activeTab === "results") {
      const all = byTeam
        .filter((g) => g.status === "final")
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
      const page = all.slice(0, resultsPage * RESULTS_PAGE_SIZE);
      const byDay = new Map();
      for (const g of page) {
        const key = g.scheduled_at
          ? format(startOfDay(new Date(g.scheduled_at)), "yyyy-MM-dd")
          : "tbd";
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(g);
      }
      const secs = [...byDay.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([k, gs]) => ({
          label: k === "tbd" ? "Date TBD" : format(new Date(k), "EEEE, MMMM d"),
          games: gs,
        }));
      return secs.map((s, i) =>
        i === secs.length - 1 && page.length < all.length ? { ...s, _hasMore: true, _total: all.length } : s
      );
    }

    if (activeTab === "upcoming") {
      const all = byTeam
        .filter((g) => g.status === "scheduled")
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
      const byDay = new Map();
      for (const g of all) {
        const key = g.scheduled_at
          ? format(startOfDay(new Date(g.scheduled_at)), "yyyy-MM-dd")
          : "tbd";
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(g);
      }
      return [...byDay.entries()]
        .sort((a, b) => {
          if (a[0] === "tbd") return 1;
          if (b[0] === "tbd") return -1;
          return a[0].localeCompare(b[0]);
        })
        .map(([k, gs]) => ({
          label: k === "tbd" ? "Date TBD" : format(new Date(k), "EEEE, MMMM d"),
          games: gs,
        }));
    }

    return [];
  }, [activeTab, byTeam, today, weekStart, weekEnd, resultsPage]);

  const scoreStripGames = useMemo(() => {
    if (activeTab === "live-today") {
      const live = byTeam.filter((g) => g.status === "live");
      const todaysGames = byTeam.filter(
        (g) => g.scheduled_at && isSameDay(new Date(g.scheduled_at), today)
      );
      return [...live, ...todaysGames.filter((g) => g.status !== "live")];
    }
    if (activeTab === "week") {
      return byTeam
        .filter((g) => g.scheduled_at && isWithinInterval(new Date(g.scheduled_at), { start: weekStart, end: weekEnd }))
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    }
    if (activeTab === "results") {
      return byTeam
        .filter((g) => g.status === "final")
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
        .slice(0, 10);
    }
    if (activeTab === "upcoming") {
      return byTeam
        .filter((g) => g.status === "scheduled")
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        .slice(0, 10);
    }
    return [];
  }, [activeTab, byTeam, today, weekStart, weekEnd]);

  // ── Create game mutation ───────────────────────────────────────────────────
  const createGameMutation = useMutation({
    mutationFn: async (gameData) => {
      const { error } = await supabase.from("games").insert({
        league_id: gameData.league_id,
        home_team_id: gameData.home_team_id,
        away_team_id: gameData.away_team_id,
        scheduled_at: gameData.scheduled_at || null,
        venue: gameData.venue || null,
        status: "scheduled",
        home_score: 0,
        away_score: 0,
        game_stage: gameData.game_stage || "regular",
        exclude_from_awards: gameData.exclude_from_awards || false,
        game_mode: gameData.game_mode || "timed",
        period_type: gameData.period_type || null,
        period_count: gameData.period_count || null,
        period_minutes: gameData.period_minutes || null,
        overtime_minutes: gameData.overtime_minutes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-games"] });
      setShowCreateDialog(false);
      toast({ title: "Game scheduled" });
    },
    onError: (err) => {
      toast({ title: "Failed to schedule game", description: err.message, variant: "destructive" });
    },
  });

  // ── Score-strip tile click → smooth-scroll to card ─────────────────────────
  const scrollToGame = (gameId) => {
    const el = document.getElementById(`schedule-game-${gameId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Dropdown options ───────────────────────────────────────────────────────
  const leagueOptions = accessibleLeagues.map((l) => ({ value: l.id, label: l.name }));
  const teamOptions = [
    { value: "all", label: "All teams" },
    ...teams.map((t) => ({ value: t.id, label: t.name })),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--ct-bg-page)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-8">

        {/* Header */}
        <div className={isNarrow ? "flex flex-col gap-3 mb-4" : "flex items-center justify-between gap-4 mb-5"}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`rounded-xl flex items-center justify-center flex-shrink-0 ${isNarrow ? "w-10 h-10" : "w-11 h-11"}`}
              style={{ background: "var(--ct-success)" }}
            >
              <Calendar className={`${isNarrow ? "w-5 h-5" : "w-5 h-5"} text-white`} />
            </div>
            <div className="min-w-0">
              <h1
                className={`font-bold leading-tight truncate ${isNarrow ? "text-2xl" : "text-3xl"}`}
                style={{ color: "var(--ct-text-primary)" }}
              >
                {t("schedule.title", "Schedule")}
              </h1>
              <p className="text-xs sm:text-sm truncate" style={{ color: "var(--ct-text-muted)" }}>
                {t("schedule.subtitle", "Game schedules and matchups")}
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={teams.length < 2}
              className={`${isNarrow ? "w-full h-11 rounded-lg" : "h-10 px-4 rounded-lg"}`}
              style={{ background: "var(--ct-accent)", color: "#ffffff", border: "none" }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Schedule Game
            </Button>
          )}
        </div>

        {/* Tab bar */}
        <div
          className="overflow-x-auto mb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div
            className="inline-flex p-1 rounded-full gap-1"
            style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setResultsPage(1); }}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap"
                  style={{
                    background: active ? "var(--ct-accent)" : "transparent",
                    color:      active ? "#ffffff" : "var(--ct-text-secondary)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {isNarrow ? tab.short : tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters row (team + league selects) */}
        <div className={`flex ${isNarrow ? "flex-col gap-2" : "flex-row gap-3"} mb-4`}>
          {accessibleLeagues.length > 0 && (
            <ThemedSelect
              ariaLabel="League"
              value={selectedLeague || ""}
              onChange={(v) => {
                setSelectedLeague(v);
                setSelectedTeam("all");
                setResultsPage(1);
              }}
              options={leagueOptions}
              className={isNarrow ? "w-full" : "w-56"}
            />
          )}
          {teams.length > 0 && (
            <ThemedSelect
              ariaLabel="Team"
              value={selectedTeam}
              onChange={(v) => setSelectedTeam(v)}
              options={teamOptions}
              className={isNarrow ? "w-full" : "w-56"}
            />
          )}
        </div>

        {/* Week navigator — only on "This week" tab */}
        {activeTab === "week" && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Previous week"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: "var(--ct-bg-card)",
                border: "1px solid var(--ct-border)",
                color: "var(--ct-text-secondary)",
                cursor: "pointer",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium" style={{ color: "var(--ct-text-primary)" }}>
              Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: "var(--ct-bg-card)",
                border: "1px solid var(--ct-border)",
                color: "var(--ct-text-secondary)",
                cursor: "pointer",
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Score strip */}
        {scoreStripGames.length > 0 && (
          <div className="mb-5">
            <ScoreStrip
              games={scoreStripGames}
              livePeriods={livePeriods}
              onTileClick={scrollToGame}
            />
          </div>
        )}

        {/* Content */}
        {!selectedLeague ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" style={{ color: "var(--ct-accent)" }} />}
            title={t("schedule.selectLeague", "Select a League")}
            message={t("schedule.selectLeagueDescription", "Select a league to view and manage games.")}
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ct-text-muted)" }} />
          </div>
        ) : sections.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" style={{ color: "var(--ct-text-muted)" }} />}
            title={
              activeTab === "live-today"
                ? "Nothing live or scheduled today"
                : activeTab === "week"
                ? "No games this week"
                : activeTab === "results"
                ? "No completed games yet"
                : "No upcoming games"
            }
            message={
              teams.length < 2
                ? t("schedule.needMoreTeamsDescription", "You need at least 2 teams to schedule a game.")
                : "Try another filter or tab."
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {sections.map((s, idx) => (
              <section key={`${activeTab}-${idx}-${s.label}`}>
                <h3
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: "var(--ct-text-secondary)" }}
                >
                  {s.label}
                </h3>
                <div className="flex flex-col gap-3">
                  {s.games.map((g) => (
                    <ScheduleGameCard
                      key={g.id}
                      game={g}
                      canManage={canManage}
                      period={livePeriods[g.id]}
                      onStartGame={() => navigate(`/LiveGame?gameId=${g.id}`)}
                      onEditSettings={() => setEditSettingsFor(g)}
                      onMarkDefault={() => setMarkDefaultFor(g)}
                    />
                  ))}
                </div>
                {s._hasMore && activeTab === "results" && (
                  <div className="flex justify-center mt-3">
                    <Button
                      onClick={() => setResultsPage((p) => p + 1)}
                      className="rounded-lg"
                      style={{
                        background: "var(--ct-bg-card)",
                        border: "1px solid var(--ct-border)",
                        color: "var(--ct-text-secondary)",
                        height: 40,
                      }}
                    >
                      Load more ({s._total - resultsPage * RESULTS_PAGE_SIZE} left)
                    </Button>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <CreateGameDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={(data) => createGameMutation.mutate(data)}
          isLoading={createGameMutation.isPending}
          leagues={accessibleLeagues}
          teams={teams}
          defaultLeagueId={selectedLeague}
        />

        <EditGameSettingsDialog
          open={!!editSettingsFor}
          onOpenChange={(v) => { if (!v) setEditSettingsFor(null); }}
          game={editSettingsFor}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["schedule-games"] });
            setEditSettingsFor(null);
          }}
        />

        <DefaultWinnerDialog
          open={!!markDefaultFor}
          onOpenChange={(v) => { if (!v) setMarkDefaultFor(null); }}
          game={markDefaultFor}
          homeTeam={markDefaultFor?.home_team}
          awayTeam={markDefaultFor?.away_team}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["schedule-games"] });
            setMarkDefaultFor(null);
          }}
        />
      </div>
    </div>
  );
}

// ─── tiny empty-state helper ─────────────────────────────────────────────────

function EmptyState({ icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "var(--ct-bg-elevated)" }}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold" style={{ color: "var(--ct-text-primary)" }}>{title}</h3>
      <p className="text-center max-w-md text-sm" style={{ color: "var(--ct-text-secondary)" }}>{message}</p>
    </div>
  );
}
