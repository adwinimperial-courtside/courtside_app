import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";
import { Trophy, Loader2, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";

// ─── Helpers (unchanged) ──────────────────────────────────────────────────────

function getGameResult(teamId, game) {
  if (game.is_default_result) {
    if (game.default_winner_team_id === teamId) return 'W';
    if (game.default_loser_team_id === teamId) return 'L';
    return null;
  }
  const isHome = game.home_team_id === teamId;
  const ts = isHome ? (game.home_score || 0) : (game.away_score || 0);
  const os = isHome ? (game.away_score || 0) : (game.home_score || 0);
  return ts > os ? 'W' : 'L';
}

function getTeamStreak(teamId, games) {
  const teamGames = games
    .filter(g => g.home_team_id === teamId || g.away_team_id === teamId)
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
  if (teamGames.length === 0) return null;
  const type = getGameResult(teamId, teamGames[0]);
  if (!type) return null;
  let count = 0;
  for (const g of teamGames) {
    if (getGameResult(teamId, g) === type) count++;
    else break;
  }
  return { type, count };
}

function getMiniStats(teamId, subGames) {
  let wins = 0, losses = 0, pf = 0, pa = 0;
  subGames.forEach(g => {
    if (g.home_team_id !== teamId && g.away_team_id !== teamId) return;
    if (g.is_default_result) {
      if (g.default_winner_team_id === teamId) wins++;
      else if (g.default_loser_team_id === teamId) losses++;
      return;
    }
    const isHome = g.home_team_id === teamId;
    const ts = isHome ? (g.home_score || 0) : (g.away_score || 0);
    const os = isHome ? (g.away_score || 0) : (g.home_score || 0);
    if (ts > os) wins++; else losses++;
    pf += ts; pa += os;
  });
  const total = wins + losses;
  return { winPct: total > 0 ? wins / total : 0, diff: pf - pa };
}

function sortTiedGroup(group, allGames) {
  if (group.length === 1) return group;

  if (group.length === 2) {
    const [a, b] = group;
    const h2hGames = allGames.filter(g =>
      (g.home_team_id === a.id && g.away_team_id === b.id) ||
      (g.home_team_id === b.id && g.away_team_id === a.id)
    );
    const sa = getMiniStats(a.id, h2hGames);
    const sb = getMiniStats(b.id, h2hGames);
    if (sb.winPct !== sa.winPct) return sb.winPct > sa.winPct ? [b, a] : [a, b];
    return b.pointsDiff >= a.pointsDiff ? [b, a] : [a, b];
  }

  return [...group].sort((a, b) => b.pointsDiff - a.pointsDiff);
}

function computeStandings(teams, games) {
  const unsorted = teams.map(team => {
    let wins = 0, losses = 0, pf = 0, pa = 0;

    games.forEach(g => {
      if (g.home_team_id !== team.id && g.away_team_id !== team.id) return;

      if (g.is_default_result) {
        if (g.default_winner_team_id === team.id) wins++;
        else if (g.default_loser_team_id === team.id) losses++;
        return;
      }

      const isHome = g.home_team_id === team.id;
      const ts = isHome ? (g.home_score || 0) : (g.away_score || 0);
      const os = isHome ? (g.away_score || 0) : (g.home_score || 0);
      if (ts > os) wins++; else losses++;
      pf += ts;
      pa += os;
    });

    const total = wins + losses;
    const winPct = total > 0 ? wins / total : 0;
    return { ...team, wins, losses, winPct, pf, pa, pointsDiff: pf - pa };
  });

  const sorted = [];
  const seen = new Set();
  const byWinPct = [...unsorted].sort((a, b) => b.winPct - a.winPct);

  byWinPct.forEach(team => {
    if (seen.has(team.id)) return;
    const group = byWinPct.filter(t => t.winPct === team.winPct);
    group.forEach(t => seen.add(t.id));
    sortTiedGroup(group, games).forEach(t => sorted.push(t));
  });

  return sorted;
}

function getLast5Results(teamId, games) {
  return games
    .filter(g => g.home_team_id === teamId || g.away_team_id === teamId)
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
    .slice(0, 5)
    .map(g => getGameResult(teamId, g))
    .filter(Boolean);
}

// ─── Mobile team card ─────────────────────────────────────────────────────────

function TeamCard({ team, rank, isExpanded, onToggle }) {
  const rankColor =
    rank === 1 ? "var(--ct-accent-gold)" :
    rank <= 3 ? "var(--ct-text-primary)" :
    "var(--ct-text-secondary)";

  const diff = team.pointsDiff;
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
  const winPctStr = `${(team.winPct * 100).toFixed(0)}%`;

  return (
    <div
      className="rounded-xl mb-2"
      style={{
        background: "var(--ct-bg-card)",
        border: "1px solid var(--ct-border)",
        padding: "16px",
      }}
    >
      {/* Main tappable area */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 text-left bg-transparent border-0 p-0 cursor-pointer"
      >
        {/* Rank */}
        <span
          className="text-lg font-bold flex-shrink-0 leading-none pt-2.5 w-5 text-center"
          style={{ color: rankColor }}
        >
          {rank}
        </span>

        {/* Team initial circle */}
        <div
          className="rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            backgroundColor: team.color || "var(--ct-accent)",
          }}
        >
          {team.name.charAt(0).toUpperCase()}
        </div>

        {/* Name + stats stacked */}
        <div className="flex-1 min-w-0">
          {/* Top row: team name + trend arrow */}
          <div className="flex items-center gap-1.5">
            <span
              className="text-base font-semibold truncate"
              style={{ color: "var(--ct-text-primary)" }}
            >
              {team.name}
            </span>
            {team.trend === "up" &&
              <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-success)" }} />}
            {team.trend === "down" &&
              <TrendingDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-danger)" }} />}
            {team.trend === "neutral" &&
              <Minus className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-text-secondary)" }} />}
          </div>

          {/* Second row: W-L • Win% • +/- */}
          <div className="text-sm mt-1 flex items-center gap-1.5 flex-wrap">
            <span>
              <span style={{ color: "var(--ct-success)", fontWeight: 600 }}>{team.wins}</span>
              <span style={{ color: "var(--ct-text-secondary)" }}> - </span>
              <span style={{ color: "var(--ct-danger)", fontWeight: 600 }}>{team.losses}</span>
            </span>
            <span style={{ color: "var(--ct-text-secondary)" }}>•</span>
            <span style={{ color: "var(--ct-text-secondary)" }}>{winPctStr}</span>
            <span style={{ color: "var(--ct-text-secondary)" }}>•</span>
            <span style={{ color: "var(--ct-text-secondary)" }}>{diffStr}</span>
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 mt-2 ${isExpanded ? "rotate-180" : ""}`}
          style={{ color: "var(--ct-text-muted)" }}
        />
      </button>

      {/* Expandable section (Framer Motion) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="rounded-lg flex flex-col gap-2.5"
              style={{
                background: "var(--ct-bg-page)",
                padding: "12px",
                marginTop: "8px",
              }}
            >
              {/* Streak */}
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider w-14"
                  style={{ color: "var(--ct-text-muted)" }}
                >
                  Streak
                </span>
                {team.streak ? (
                  <span
                    className="text-sm font-bold"
                    style={{ color: team.streak.type === "W" ? "var(--ct-success)" : "var(--ct-danger)" }}
                  >
                    {team.streak.type}{team.streak.count}
                  </span>
                ) : (
                  <span className="text-sm font-bold" style={{ color: "var(--ct-text-muted)" }}>—</span>
                )}
              </div>

              {/* Last 5 */}
              {team.last5.length > 0 && (
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider w-14"
                    style={{ color: "var(--ct-text-muted)" }}
                  >
                    Last 5
                  </span>
                  <div className="flex gap-1.5">
                    {team.last5.map((r, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ background: r === "W" ? "var(--ct-success)" : "var(--ct-danger)" }}
                        title={r === "W" ? "Win" : "Loss"}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Standings() {
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [expandedTeamId, setExpandedTeamId]     = useState(null);
  const isNarrow = useIsNarrowLayout();

  // 1. Fetch active leagues
  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['leagues', 'active'],
    queryFn: () =>
      supabase
        .from('leagues')
        .select('*')
        .eq('is_active', true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
  });

  useEffect(() => {
    if (leagues.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(leagues[0].id);
    }
  }, [leagues, selectedLeagueId]);

  // 2. Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', selectedLeagueId],
    queryFn: () =>
      supabase
        .from('teams')
        .select('*')
        .eq('league_id', selectedLeagueId)
        .eq('is_active', true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: !!selectedLeagueId,
  });

  // 3. Fetch final games
  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games', selectedLeagueId, 'final'],
    queryFn: () =>
      supabase
        .from('games')
        .select('*')
        .eq('league_id', selectedLeagueId)
        .eq('status', 'final')
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: !!selectedLeagueId,
  });

  const standings = useMemo(() => {
    const current = computeStandings(teams, games);
    return current.map((team, idx) => {
      const currentRank = idx + 1;

      const streak = getTeamStreak(team.id, games);
      const last5  = getLast5Results(team.id, games);

      const teamGames = games
        .filter(g => g.home_team_id === team.id || g.away_team_id === team.id)
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

      let trend = 'neutral';
      if (teamGames.length > 0) {
        const withoutLast = games.filter(g => g.id !== teamGames[0].id);
        const prev = computeStandings(teams, withoutLast);
        const prevRank = prev.findIndex(t => t.id === team.id) + 1;
        if (prevRank > currentRank) trend = 'up';
        else if (prevRank < currentRank) trend = 'down';
      }

      return { ...team, streak, trend, last5 };
    });
  }, [teams, games]);

  const isLoading = leaguesLoading || teamsLoading || gamesLoading;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-page)" }}>

      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-3">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--ct-accent-gold)" }}
          >
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "var(--ct-text-primary)" }}>
              Team Standings
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: "var(--ct-text-muted)" }}>
              Team rankings and records
            </p>
          </div>
        </div>
      </div>

      {/* League pills — shown on all viewports, sticky on mobile only */}
      <div
        className="sticky top-0 z-10 md:static"
        style={{
          background: "var(--color-bg-page)",
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {leaguesLoading ? (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "var(--ct-text-muted)" }} />
            ) : leagues.length === 0 ? (
              <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>No leagues available</span>
            ) : (
              leagues.map(league => {
                const active = selectedLeagueId === league.id;
                return (
                  <button
                    key={league.id}
                    onClick={() => setSelectedLeagueId(league.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                    style={{
                      background: active ? "var(--ct-accent)" : "var(--ct-bg-elevated)",
                      color:      active ? "#ffffff" : "var(--ct-text-secondary)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {league.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pb-6">

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ct-text-muted)" }} />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && standings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "var(--ct-bg-elevated)" }}
            >
              <Trophy className="w-8 h-8" style={{ color: "var(--ct-text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--ct-text-muted)" }}>
              No teams in this league yet.
            </p>
          </div>
        )}

        {!isLoading && standings.length > 0 && (
          <>
            {/* ── Narrow layout: stacked cards (real mobile OR phone/tablet preview) ── */}
            {isNarrow && (
              <div>
                {standings.map((team, i) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    rank={i + 1}
                    isExpanded={expandedTeamId === team.id}
                    onToggle={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                  />
                ))}
              </div>
            )}

            {/* ── Desktop: dark table (unchanged) ─────────────────────────── */}
            {!isNarrow && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <Trophy className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                <span className="font-semibold text-base" style={{ color: "var(--color-text-primary)" }}>
                  Team Standings
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border)" }}>
                      {[
                        { label: "#",      align: "left",   cls: "pl-4 pr-2 w-12" },
                        { label: "Team",   align: "left",   cls: "" },
                        { label: "W",      align: "center", cls: "w-16" },
                        { label: "L",      align: "center", cls: "w-16" },
                        { label: "Win%",   align: "center", cls: "w-20" },
                        { label: "Streak", align: "center", cls: "w-20" },
                        { label: "+/-",    align: "center", cls: "pr-4 w-20" },
                      ].map(col => (
                        <th
                          key={col.label}
                          className={`py-3 font-semibold text-xs uppercase tracking-wider ${col.cls}`}
                          style={{ color: "var(--color-text-secondary)", textAlign: col.align }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, i) => {
                      const rank = i + 1;
                      return (
                        <tr
                          key={team.id}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid var(--color-border)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg-card-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td
                            className="py-3 pl-4 pr-2 font-bold"
                            style={{ color: rank === 1 ? "var(--ct-accent-gold)" : "var(--color-text-secondary)" }}
                          >
                            {rank}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                style={{ backgroundColor: team.color || "var(--ct-accent)" }}
                              >
                                {team.name.charAt(0).toUpperCase()}
                              </div>
                              <span
                                className="font-bold uppercase tracking-wide"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {team.name}
                              </span>
                              {team.trend === "up"      && <TrendingUp   className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-success)" }} />}
                              {team.trend === "down"    && <TrendingDown  className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-danger)" }} />}
                              {team.trend === "neutral" && <Minus         className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-text-muted)" }} />}
                            </div>
                          </td>
                          <td className="py-3 text-center font-bold" style={{ color: "var(--ct-success)" }}>
                            {team.wins}
                          </td>
                          <td className="py-3 text-center font-bold" style={{ color: "var(--ct-danger)" }}>
                            {team.losses}
                          </td>
                          <td className="py-3 text-center font-bold" style={{ color: "var(--color-text-primary)" }}>
                            {(team.winPct * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 text-center font-bold">
                            {team.streak ? (
                              <span style={{ color: team.streak.type === "W" ? "var(--ct-success)" : "var(--ct-danger)" }}>
                                {team.streak.type}{team.streak.count}
                              </span>
                            ) : (
                              <span style={{ color: "var(--ct-text-muted)" }}>—</span>
                            )}
                          </td>
                          <td
                            className="py-3 text-center font-bold pr-4"
                            style={{
                              color: team.pointsDiff > 0 ? "var(--ct-success)" : team.pointsDiff < 0 ? "var(--ct-danger)" : "var(--ct-text-muted)",
                            }}
                          >
                            {team.pointsDiff > 0 ? "+" : ""}{team.pointsDiff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
