import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";
import { totalPoints as calcPts } from "@/lib/playerStats";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeStatsByPlayer(statRows) {
  const groups = {};
  statRows.forEach(s => {
    if (!groups[s.player_id]) groups[s.player_id] = [];
    groups[s.player_id].push(s);
  });

  return Object.values(groups).map(rows => {
    // Sort descending by created_at to find most recent row for is_active
    const sorted = [...rows].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    );
    const latest = sorted[0];
    const minutesMax = Math.max(...rows.map(r => r.minutes_played || 0));

    const pts3   = rows.reduce((a, s) => a + (s.points_3 || 0), 0);
    const ft     = rows.reduce((a, s) => a + (s.free_throws || 0), 0);
    const oreb   = rows.reduce((a, s) => a + (s.offensive_rebounds || 0), 0);
    const dreb   = rows.reduce((a, s) => a + (s.defensive_rebounds || 0), 0);

    return {
      ...latest,
      points:            rows.reduce((a, s) => a + calcPts(s), 0),
      points_3:          pts3,
      free_throws:       ft,
      offensive_rebounds: oreb,
      defensive_rebounds: dreb,
      rebounds:          oreb + dreb,
      assists:           rows.reduce((a, s) => a + (s.assists || 0), 0),
      steals:            rows.reduce((a, s) => a + (s.steals || 0), 0),
      blocks:            rows.reduce((a, s) => a + (s.blocks || 0), 0),
      turnovers:         rows.reduce((a, s) => a + (s.turnovers || 0), 0),
      fouls:             rows.reduce((a, s) => a + (s.fouls || 0), 0),
      minutes_played:    minutesMax,
      is_active:         latest.is_active,
    };
  });
}

function formatClock(seconds) {
  if (seconds == null || isNaN(seconds)) return "--:--";
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function periodLabel(period) {
  if (!period || period <= 4) return `Q${period || 1}`;
  return "OT";
}

// ─── Team Logo (inline — no dependency on TeamLogo component) ─────────────────

function TeamAvatar({ team, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-12 h-12 text-lg", lg: "w-16 h-16 text-2xl" };
  if (team?.logo_url) {
    return (
      <img
        src={team.logo_url}
        alt={team.name}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: team?.color || "#3b82f6" }}
    >
      {team?.name?.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function useLiveClock(game) {
  const [display, setDisplay] = useState(null);

  useEffect(() => {
    if (!game) return;

    const compute = () => {
      if (game.clock_running && game.clock_started_at) {
        const elapsed = (Date.now() - new Date(game.clock_started_at).getTime()) / 1000;
        return Math.max(0, (game.clock_time_left || 0) - elapsed);
      }
      return game.clock_time_left ?? null;
    };

    setDisplay(compute());

    if (!game.clock_running) return;

    const id = setInterval(() => setDisplay(compute()), 1000);
    return () => clearInterval(id);
  }, [game?.clock_running, game?.clock_started_at, game?.clock_time_left]);

  return display;
}

// ─── Stat table for one team ──────────────────────────────────────────────────

function StatTable({ team, playerStats, players, showMin }) {
  const teamPlayers = useMemo(() => {
    return playerStats
      .map(stat => ({ ...stat, player: players.find(p => p.id === stat.player_id) }))
      .sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return (b.points || 0) - (a.points || 0);
      });
  }, [playerStats, players]);

  if (teamPlayers.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-6">No stats recorded yet.</p>;
  }

  const totals = {
    points:             teamPlayers.reduce((a, s) => a + (s.points || 0), 0),
    points_3:           teamPlayers.reduce((a, s) => a + (s.points_3 || 0), 0),
    free_throws:        teamPlayers.reduce((a, s) => a + (s.free_throws || 0), 0),
    offensive_rebounds: teamPlayers.reduce((a, s) => a + (s.offensive_rebounds || 0), 0),
    defensive_rebounds: teamPlayers.reduce((a, s) => a + (s.defensive_rebounds || 0), 0),
    rebounds:           teamPlayers.reduce((a, s) => a + (s.rebounds || 0), 0),
    assists:            teamPlayers.reduce((a, s) => a + (s.assists || 0), 0),
    steals:             teamPlayers.reduce((a, s) => a + (s.steals || 0), 0),
    blocks:             teamPlayers.reduce((a, s) => a + (s.blocks || 0), 0),
    turnovers:          teamPlayers.reduce((a, s) => a + (s.turnovers || 0), 0),
    fouls:              teamPlayers.reduce((a, s) => a + (s.fouls || 0), 0),
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <TeamAvatar team={team} size="sm" />
        <h3 className="font-bold text-lg text-slate-900">{team?.name}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs">
              <th className="py-2 px-3 text-left font-semibold">Player</th>
              {showMin && <th className="py-2 px-2 text-center font-semibold">MIN</th>}
              <th className="py-2 px-2 text-center font-semibold">PTS</th>
              <th className="py-2 px-2 text-center font-semibold">3PT</th>
              <th className="py-2 px-2 text-center font-semibold">FT</th>
              <th className="py-2 px-2 text-center font-semibold">OREB</th>
              <th className="py-2 px-2 text-center font-semibold">DREB</th>
              <th className="py-2 px-2 text-center font-semibold">REB</th>
              <th className="py-2 px-2 text-center font-semibold">AST</th>
              <th className="py-2 px-2 text-center font-semibold">STL</th>
              <th className="py-2 px-2 text-center font-semibold">BLK</th>
              <th className="py-2 px-2 text-center font-semibold">TO</th>
              <th className="py-2 px-2 text-center font-semibold">F</th>
            </tr>
          </thead>
          <tbody>
            {teamPlayers.map(stat => (
              <tr
                key={stat.player_id}
                className={`border-b border-slate-100 last:border-0 ${
                  stat.is_active
                    ? "border-l-4 border-green-500 bg-green-50"
                    : ""
                }`}
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-5 text-right flex-shrink-0">
                      {stat.player?.jersey_number ?? ""}
                    </span>
                    <span className="text-slate-900 text-sm">
                      {stat.player?.name || stat.player?.first_name
                        ? (stat.player.name || `${stat.player.first_name || ""} ${stat.player.last_name || ""}`.trim())
                        : "Unknown"}
                    </span>
                  </div>
                </td>
                {showMin && (
                  <td className="py-2.5 px-2 text-center text-slate-700 text-sm">
                    {stat.minutes_played != null ? Number(stat.minutes_played).toFixed(1) : "0.0"}
                  </td>
                )}
                <td className="py-2.5 px-2 text-center font-semibold text-slate-900">{stat.points || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.points_3 || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.free_throws || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.offensive_rebounds || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.defensive_rebounds || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.rebounds || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.assists || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.steals || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.blocks || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.turnovers || 0}</td>
                <td className="py-2.5 px-2 text-center text-slate-700">{stat.fouls || 0}</td>
              </tr>
            ))}
            {/* TEAM TOTALS */}
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
              <td className="py-2.5 px-3 text-sm">TEAM TOTALS</td>
              {showMin && <td className="py-2.5 px-2 text-center text-slate-400">—</td>}
              <td className="py-2.5 px-2 text-center">{totals.points}</td>
              <td className="py-2.5 px-2 text-center">{totals.points_3}</td>
              <td className="py-2.5 px-2 text-center">{totals.free_throws}</td>
              <td className="py-2.5 px-2 text-center">{totals.offensive_rebounds}</td>
              <td className="py-2.5 px-2 text-center">{totals.defensive_rebounds}</td>
              <td className="py-2.5 px-2 text-center">{totals.rebounds}</td>
              <td className="py-2.5 px-2 text-center">{totals.assists}</td>
              <td className="py-2.5 px-2 text-center">{totals.steals}</td>
              <td className="py-2.5 px-2 text-center">{totals.blocks}</td>
              <td className="py-2.5 px-2 text-center">{totals.turnovers}</td>
              <td className="py-2.5 px-2 text-center">{totals.fouls}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Stat label map ───────────────────────────────────────────────────────────

const STAT_LABELS = {
  '2PT':          '2-Point Field Goal',
  '3PT':          '3-Point Field Goal',
  'FTM':          'Free Throw Made',
  'FTX':          'Free Throw Missed',
  'DREB':         'Defensive Rebound',
  'OREB':         'Offensive Rebound',
  'AST':          'Assist',
  'STL':          'Steal',
  'BLK':          'Block',
  'TO':           'Turnover',
  'FOUL':         'Foul',
  'TECH':         'Technical Foul',
  'UNSP':         'Unsportsmanlike Foul',
  'substitution': 'Substitution',
  'timeout':      'Timeout',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveBoxScore() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const gameId      = new URLSearchParams(window.location.search).get("gameId");

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ["game", gameId],
    queryFn:  () =>
      supabase.from("games").select("*").eq("id", gameId).single()
        .then(({ data, error }) => { if (error) throw error; return data; }),
    enabled:       !!gameId,
    refetchInterval: 5000,
    staleTime:       0,
  });

  const { data: homeTeam } = useQuery({
    queryKey: ["team", game?.home_team_id],
    queryFn:  () =>
      supabase.from("teams").select("*").eq("id", game.home_team_id).single()
        .then(({ data, error }) => { if (error) throw error; return data; }),
    enabled:       !!game?.home_team_id,
    staleTime:     60000,
  });

  const { data: awayTeam } = useQuery({
    queryKey: ["team", game?.away_team_id],
    queryFn:  () =>
      supabase.from("teams").select("*").eq("id", game.away_team_id).single()
        .then(({ data, error }) => { if (error) throw error; return data; }),
    enabled:       !!game?.away_team_id,
    staleTime:     60000,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players_box", game?.home_team_id, game?.away_team_id],
    queryFn:  () =>
      supabase.from("players").select("*")
        .in("team_id", [game.home_team_id, game.away_team_id])
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled:   !!(game?.home_team_id && game?.away_team_id),
    staleTime: 60000,
  });

  const { data: allStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["player_stats", gameId],
    queryFn:  () =>
      supabase.from("player_stats").select("*").eq("game_id", gameId)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled:         !!gameId,
    refetchInterval: 5000,
    staleTime:       0,
  });

  const { data: latestLogArr = [] } = useQuery({
    queryKey: ["game_logs_latest", gameId],
    queryFn:  () =>
      supabase.from("game_logs").select("*").eq("game_id", gameId)
        .order("created_at", { ascending: false }).limit(1)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled:         !!gameId,
    refetchInterval: 5000,
    staleTime:       0,
  });
  const latestLog = latestLogArr[0] || null;

  // ── Realtime subscriptions ─────────────────────────────────────────────────

  useEffect(() => {
    if (!gameId) return;
    const uid = Math.random().toString(36).slice(2, 8);

    const gameChannel = supabase
      .channel(`boxscore-game-${gameId}-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }))
      .subscribe();

    const statsChannel = supabase
      .channel(`boxscore-stats-${gameId}-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_stats", filter: `game_id=eq.${gameId}` },
        () => queryClient.invalidateQueries({ queryKey: ["player_stats", gameId] }))
      .subscribe();

    const logsChannel = supabase
      .channel(`boxscore-logs-${gameId}-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_logs", filter: `game_id=eq.${gameId}` },
        () => queryClient.invalidateQueries({ queryKey: ["game_logs_latest", gameId] }))
      .subscribe();

    return () => {
      gameChannel.unsubscribe();  supabase.removeChannel(gameChannel);
      statsChannel.unsubscribe(); supabase.removeChannel(statsChannel);
      logsChannel.unsubscribe();  supabase.removeChannel(logsChannel);
    };
  }, [gameId, queryClient]);

  // ── Live clock ─────────────────────────────────────────────────────────────

  const clockDisplay = useLiveClock(game);

  // ── Merged stats ───────────────────────────────────────────────────────────

  const mergedStats = useMemo(() => mergeStatsByPlayer(allStats), [allStats]);

  const homeStats = useMemo(
    () => mergedStats.filter(s => s.team_id === game?.home_team_id),
    [mergedStats, game?.home_team_id]
  );
  const awayStats = useMemo(
    () => mergedStats.filter(s => s.team_id === game?.away_team_id),
    [mergedStats, game?.away_team_id]
  );

  // Score from player stats (source of truth)
  const homeScore = useMemo(() => homeStats.reduce((a, s) => a + (s.points || 0), 0), [homeStats]);
  const awayScore = useMemo(() => awayStats.reduce((a, s) => a + (s.points || 0), 0), [awayStats]);

  // ── Latest activity label ──────────────────────────────────────────────────

  const latestActivityLabel = useMemo(() => {
    if (!latestLog) return null;

    // Match team by team_id against loaded team objects
    const team     = latestLog.team_id === homeTeam?.id ? homeTeam
                   : latestLog.team_id === awayTeam?.id ? awayTeam
                   : null;
    const teamName = team?.name || "";
    const statType = latestLog.stat_type || "";
    const label    = STAT_LABELS[latestLog.stat_label] || STAT_LABELS[statType] || latestLog.stat_label || statType;

    // Timeout or substitution — no player line
    if (statType === "timeout") {
      return { who: "• Timeout", label, teamName };
    }
    if (statType === "substitution") {
      return { who: "• Substitution", label, teamName };
    }

    // Stat with player
    const player = players.find(p => p.id === latestLog.player_id);
    if (player) {
      const jersey = player.jersey_number != null ? `#${player.jersey_number} ` : "";
      const name   = player.name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown";
      return { who: `• ${jersey}${name}`, label, teamName };
    }

    // Fallback
    return { who: `• ${latestLog.stat_label || statType}`, label, teamName };
  }, [latestLog, players, homeTeam, awayTeam]);

  const showMin = game?.game_mode === "timed";

  // ── Early returns ──────────────────────────────────────────────────────────

  if (!gameId) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No game ID provided.</p>
          <button
            onClick={() => navigate(createPageUrl("Schedule"))}
            className="text-purple-600 underline text-sm"
          >
            Back to Schedule
          </button>
        </div>
      </div>
    );
  }

  if (gameLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-700 font-semibold mb-2">Game not found.</p>
          <button
            onClick={() => navigate(createPageUrl("Schedule"))}
            className="text-purple-600 underline text-sm"
          >
            Back to Schedule
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 md:py-8">

        {/* Top nav */}
        <button
          onClick={() => navigate(createPageUrl("Schedule"))}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Schedule
        </button>

        {/* Page header */}
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Live Box Score</h1>
          {game.status === "live" && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 uppercase tracking-wide">
              Live
            </span>
          )}
          {game.status === "final" && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600 uppercase tracking-wide">
              Final
            </span>
          )}
        </div>

        {/* Score header card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4">
          <div className="grid grid-cols-3 gap-2 items-center">

            {/* Home team */}
            <div className="flex flex-col items-center gap-2">
              <TeamAvatar team={homeTeam} size="lg" />
              <p className="font-bold text-slate-900 text-sm text-center leading-tight">{homeTeam?.name}</p>
              <p className="text-4xl sm:text-5xl font-bold text-slate-900">{homeScore}</p>
            </div>

            {/* Center: clock + status + latest activity */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-purple-600 font-semibold text-xs uppercase tracking-wide">
                {periodLabel(game.clock_period)}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {formatClock(clockDisplay)}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                game.status === "live"
                  ? "bg-orange-100 text-orange-700"
                  : game.status === "final"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {game.status === "live" ? "In Progress"
                  : game.status === "final" ? "Final"
                  : game.status === "scheduled" ? "Scheduled"
                  : game.status}
              </span>

              {latestActivityLabel && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full max-w-[200px] text-center">
                  <p className="text-slate-800 text-xs font-semibold">{latestActivityLabel.who}</p>
                  <p className="text-slate-500 text-[11px]">{latestActivityLabel.label}</p>
                  <p className="text-slate-400 text-[11px]">{latestActivityLabel.teamName}</p>
                </div>
              )}
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center gap-2">
              <TeamAvatar team={awayTeam} size="lg" />
              <p className="font-bold text-slate-900 text-sm text-center leading-tight">{awayTeam?.name}</p>
              <p className="text-4xl sm:text-5xl font-bold text-slate-900">{awayScore}</p>
            </div>

          </div>
        </div>

        {/* Stat tables */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <StatTable
              team={homeTeam}
              playerStats={homeStats}
              players={players}
              showMin={showMin}
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <StatTable
              team={awayTeam}
              playerStats={awayStats}
              players={players}
              showMin={showMin}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
