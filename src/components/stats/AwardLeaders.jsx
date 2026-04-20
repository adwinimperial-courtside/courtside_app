import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
  Trophy, Shield, Star, HelpCircle, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { resolveSettings } from "@/utils/awardDefaults";

// ─── helpers ────────────────────────────────────────────────────────────────

function isActualPlayedGame(g) {
  return (
    g.status === "final" &&
    !g.is_default_result &&
    g.result_type !== "default" &&
    !g.exclude_from_awards
  );
}

function didPlay(stat) {
  if (stat.did_play) return true;
  if ((stat.minutes_played || 0) > 0) return true;
  const total =
    (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
    (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
    (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
    (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0);
  return total > 0;
}

function calcGis(stat, game, cfg) {
  const isDigital = game.entry_type === "digital" && !game.edited;
  const pts = cfg.mvp_pts_weight * (
    (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) +
    (stat.points_3 || 0) * 3 +
    (stat.free_throws || 0)
  );
  return pts +
    cfg.mvp_oreb_weight * (stat.offensive_rebounds || 0) +
    cfg.mvp_dreb_weight * (stat.defensive_rebounds || 0) +
    cfg.mvp_ast_weight * (stat.assists || 0) +
    cfg.mvp_stl_weight * (stat.steals || 0) +
    cfg.mvp_blk_weight * (stat.blocks || 0) -
    cfg.mvp_turnover_penalty * (stat.turnovers || 0) -
    cfg.mvp_foul_penalty * (stat.fouls || 0) -
    cfg.mvp_tech_penalty * (stat.technical_fouls || 0) -
    cfg.mvp_unsportsmanlike_penalty * (stat.unsportsmanlike_fouls || 0);
}

function calcDefGis(stat, cfg) {
  return cfg.dpoy_stl_weight * (stat.steals || 0) +
    cfg.dpoy_blk_weight * (stat.blocks || 0) +
    cfg.dpoy_oreb_weight * (stat.offensive_rebounds || 0) +
    cfg.dpoy_dreb_weight * (stat.defensive_rebounds || 0) -
    cfg.dpoy_foul_penalty * (stat.fouls || 0) -
    cfg.dpoy_turnover_penalty * (stat.turnovers || 0) -
    cfg.dpoy_tech_penalty * (stat.technical_fouls || 0) -
    cfg.dpoy_unsportsmanlike_penalty * (stat.unsportsmanlike_fouls || 0);
}

// Build per-player accumulated data from a set of games
function accumulateMvp(playerId, teamId, gameSet, statMap, cfg) {
  let gp = 0, sumGis = 0, sumTech = 0, sumUnsp = 0;
  for (const game of gameSet) {
    const stat = statMap[`${game.id}__${playerId}`];
    if (!stat || !didPlay(stat)) continue;
    sumGis += calcGis(stat, game, cfg);
    sumTech += stat.technical_fouls || 0;
    sumUnsp += stat.unsportsmanlike_fouls || 0;
    gp++;
  }
  return { gp, sumGis, sumTech, sumUnsp };
}

function accumulateDpoy(playerId, gameSet, statMap, cfg) {
  let gp = 0, sumDefGis = 0, sumTech = 0, sumUnsp = 0;
  for (const game of gameSet) {
    const stat = statMap[`${game.id}__${playerId}`];
    if (!stat || !didPlay(stat)) continue;
    sumDefGis += calcDefGis(stat, cfg);
    sumTech += stat.technical_fouls || 0;
    sumUnsp += stat.unsportsmanlike_fouls || 0;
    gp++;
  }
  return { gp, sumDefGis, sumTech, sumUnsp };
}

function computeMvpScore(acc, teamData, cfg) {
  if (acc.gp === 0 || !teamData || teamData.gamesPlayed === 0) return null;
  const avgGis = acc.sumGis / acc.gp;
  const gpPct = acc.gp / teamData.gamesPlayed;
  const teamBonus = cfg.mvp_team_win_percent_weight * teamData.winPct;
  return cfg.mvp_avg_gis_weight * avgGis +
    cfg.mvp_gp_percent_weight * gpPct +
    teamBonus -
    cfg.mvp_tech_final_penalty * acc.sumTech -
    cfg.mvp_unsp_final_penalty * acc.sumUnsp;
}

function computeDpoyScore(acc, teamGamesCount, cfg) {
  if (acc.gp === 0 || !teamGamesCount) return null;
  const avgDefGis = acc.sumDefGis / acc.gp;
  const gpPct = acc.gp / teamGamesCount;
  return avgDefGis +
    cfg.dpoy_gp_percent_weight * gpPct -
    cfg.dpoy_tech_final_penalty * acc.sumTech -
    cfg.dpoy_unsp_final_penalty * acc.sumUnsp;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function AwardBadge({ rank, type }) {
  if (type === "mvp") {
    if (rank === 0) return <span className="inline-flex items-center gap-1 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"><Trophy className="w-3 h-3" />MVP</span>;
    if (rank === 1) return <span className="inline-flex items-center bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">Mythical 1</span>;
    if (rank === 2) return <span className="inline-flex items-center bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Mythical 2</span>;
    if (rank === 3) return <span className="inline-flex items-center bg-purple-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Mythical 3</span>;
    if (rank === 4) return <span className="inline-flex items-center bg-purple-300 text-purple-900 text-xs font-bold px-2 py-0.5 rounded-full">Mythical 4</span>;
  }
  if (type === "dpoy" && rank === 0) {
    return <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full"><Shield className="w-3 h-3" />DPOY</span>;
  }
  if (type === "pog") {
    return <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full"><Star className="w-3 h-3" />POG</span>;
  }
  return null;
}

function TrendIcon({ trend }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function MvpBreakdown({ stat, game, cfg }) {
  if (!stat) return <p className="text-slate-400 text-sm">No stat data available.</p>;
  const isDigital = game?.entry_type === "digital" && !game?.edited;
  const rawPts = isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0);
  const totalPts = rawPts + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
  const rows = [
    { label: "Points", value: totalPts, weight: cfg.mvp_pts_weight, positive: true },
    { label: "Off Rebounds", value: stat.offensive_rebounds || 0, weight: cfg.mvp_oreb_weight, positive: true },
    { label: "Def Rebounds", value: stat.defensive_rebounds || 0, weight: cfg.mvp_dreb_weight, positive: true },
    { label: "Assists", value: stat.assists || 0, weight: cfg.mvp_ast_weight, positive: true },
    { label: "Steals", value: stat.steals || 0, weight: cfg.mvp_stl_weight, positive: true },
    { label: "Blocks", value: stat.blocks || 0, weight: cfg.mvp_blk_weight, positive: true },
    { label: "Turnovers", value: stat.turnovers || 0, weight: cfg.mvp_turnover_penalty, positive: false },
    { label: "Fouls", value: stat.fouls || 0, weight: cfg.mvp_foul_penalty, positive: false },
    { label: "Technicals", value: stat.technical_fouls || 0, weight: cfg.mvp_tech_penalty, positive: false },
    { label: "Unsportsmanlike", value: stat.unsportsmanlike_fouls || 0, weight: cfg.mvp_unsportsmanlike_penalty, positive: false },
  ];
  return <BreakdownTable rows={rows} />;
}

function DpoyBreakdown({ stat, cfg }) {
  if (!stat) return <p className="text-slate-400 text-sm">No stat data available.</p>;
  const rows = [
    { label: "Steals", value: stat.steals || 0, weight: cfg.dpoy_stl_weight, positive: true },
    { label: "Blocks", value: stat.blocks || 0, weight: cfg.dpoy_blk_weight, positive: true },
    { label: "Off Rebounds", value: stat.offensive_rebounds || 0, weight: cfg.dpoy_oreb_weight, positive: true },
    { label: "Def Rebounds", value: stat.defensive_rebounds || 0, weight: cfg.dpoy_dreb_weight, positive: true },
    { label: "Turnovers", value: stat.turnovers || 0, weight: cfg.dpoy_turnover_penalty, positive: false },
    { label: "Fouls", value: stat.fouls || 0, weight: cfg.dpoy_foul_penalty, positive: false },
    { label: "Technicals", value: stat.technical_fouls || 0, weight: cfg.dpoy_tech_penalty, positive: false },
    { label: "Unsportsmanlike", value: stat.unsportsmanlike_fouls || 0, weight: cfg.dpoy_unsportsmanlike_penalty, positive: false },
  ];
  return <BreakdownTable rows={rows} />;
}

function BreakdownTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-1 pr-4 text-slate-500 font-medium">Stat</th>
            <th className="text-right py-1 pr-4 text-slate-500 font-medium">Value</th>
            <th className="text-right py-1 pr-4 text-slate-500 font-medium">Weight</th>
            <th className="text-right py-1 text-slate-500 font-medium">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const contribution = row.positive ? row.value * row.weight : -(row.value * row.weight);
            const colorClass = contribution > 0 ? "text-green-700" : contribution < 0 ? "text-red-600" : "text-slate-400";
            return (
              <tr key={row.label} className="border-b border-slate-100 last:border-0">
                <td className="py-1 pr-4 text-slate-700">{row.label}</td>
                <td className="py-1 pr-4 text-right text-slate-600">{row.value}</td>
                <td className="py-1 pr-4 text-right text-slate-500">×{row.weight.toFixed(1)}</td>
                <td className={`py-1 text-right font-semibold ${colorClass}`}>
                  {contribution >= 0 ? "+" : ""}{contribution.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HowCalculated({ children, accentClass }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className={`w-4 h-4 ${accentClass}`} />
          How is this calculated?
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="how"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-1 text-sm text-slate-600 space-y-2 border-t border-slate-100 bg-slate-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AwardLeadersComponent({ league, teams, games, players, stats, awardSettings }) {
  const cfg = resolveSettings(awardSettings);
  const [activeTab, setActiveTab] = useState("mvp");
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (key) => setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));

  // Build a fast lookup: "gameId__playerId" → stat
  const statMap = useMemo(() => {
    const m = {};
    for (const s of stats) {
      if (s.game_id && s.player_id) m[`${s.game_id}__${s.player_id}`] = s;
    }
    return m;
  }, [stats]);

  const leagueGames = useMemo(
    () => games.filter(isActualPlayedGame).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [games]
  );

  // Team stats for MVP formula
  const teamStats = useMemo(() => {
    const m = {};
    for (const team of teams) {
      const tg = leagueGames.filter(g => g.home_team_id === team.id || g.away_team_id === team.id);
      const wins = tg.filter(g =>
        g.home_team_id === team.id ? g.home_score > g.away_score : g.away_score > g.home_score
      ).length;
      m[team.id] = { gamesPlayed: tg.length, wins, winPct: tg.length > 0 ? wins / tg.length : 0 };
    }
    return m;
  }, [teams, leagueGames]);

  // Collect all player IDs that appear in any league game
  const leaguePlayerIds = useMemo(() => {
    const ids = new Set();
    for (const g of leagueGames) {
      for (const s of stats) {
        if (s.game_id === g.id) ids.add(s.player_id);
      }
    }
    return [...ids];
  }, [leagueGames, stats]);

  // ── MVP rankings ────────────────────────────────────────────────────────────
  const mvpRankings = useMemo(() => {
    const results = leaguePlayerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      if (!player) return null;
      const teamId = stats.find(s => s.player_id === playerId)?.team_id;
      const team = teams.find(t => t.id === teamId);
      if (!team) return null;
      const td = teamStats[teamId];
      if (!td) return null;

      const acc = accumulateMvp(playerId, teamId, leagueGames, statMap, cfg);
      if (acc.gp === 0) return null;

      const gpPct = td.gamesPlayed > 0 ? acc.gp / td.gamesPlayed : 0;
      const eligible = gpPct >= cfg.mvp_min_games_percent / 100;
      const gamesNeeded = eligible ? 0 : Math.ceil(cfg.mvp_min_games_percent / 100 * td.gamesPlayed) - acc.gp;

      const score = computeMvpScore(acc, td, cfg);

      // Trend: score without most recent game
      const playerGames = leagueGames.filter(g => {
        const s = statMap[`${g.id}__${playerId}`];
        return s && didPlay(s);
      });
      let trend = "neutral";
      if (playerGames.length >= 2) {
        const prevGames = playerGames.slice(0, -1);
        const lastGame = playerGames[playerGames.length - 1];
        const prevAcc = accumulateMvp(playerId, teamId, prevGames, statMap, cfg);
        // Recompute team stats for prev games (approximate: same team win%)
        const prevTd = { ...td };
        const lastGameInTeam = lastGame.home_team_id === teamId || lastGame.away_team_id === teamId;
        if (lastGameInTeam) {
          const prevTg = leagueGames.slice(0, -1).filter(g => g.home_team_id === teamId || g.away_team_id === teamId);
          const prevWins = prevTg.filter(g => g.home_team_id === teamId ? g.home_score > g.away_score : g.away_score > g.home_score).length;
          prevTd.gamesPlayed = prevTg.length;
          prevTd.wins = prevWins;
          prevTd.winPct = prevTg.length > 0 ? prevWins / prevTg.length : 0;
        }
        const prevScore = computeMvpScore(prevAcc, prevTd, cfg);
        if (score !== null && prevScore !== null) {
          const diff = score - prevScore;
          if (diff > 0.05) trend = "up";
          else if (diff < -0.05) trend = "down";
        }
      }

      return {
        playerId, player, team, teamId,
        gp: acc.gp,
        avgGis: acc.gp > 0 ? acc.sumGis / acc.gp : 0,
        score,
        eligible,
        gamesNeeded,
        trend,
        gpPct,
      };
    }).filter(Boolean);

    return results.filter(r => r.eligible).sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity)).slice(0, 10);
  }, [leaguePlayerIds, leagueGames, statMap, teamStats, players, teams, stats, cfg]);

  // ── DPOY rankings ───────────────────────────────────────────────────────────
  const dpoyRankings = useMemo(() => {
    const teamGameCounts = {};
    for (const team of teams) {
      teamGameCounts[team.id] = leagueGames.filter(g => g.home_team_id === team.id || g.away_team_id === team.id).length;
    }

    const results = leaguePlayerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      if (!player) return null;
      const teamId = stats.find(s => s.player_id === playerId)?.team_id;
      const team = teams.find(t => t.id === teamId);
      if (!team) return null;
      const tgCount = teamGameCounts[teamId] ?? 0;

      const acc = accumulateDpoy(playerId, leagueGames, statMap, cfg);
      if (acc.gp === 0) return null;

      const gpPct = tgCount > 0 ? acc.gp / tgCount : 0;
      const eligible = gpPct >= cfg.dpoy_min_games_percent / 100;
      const gamesNeeded = eligible ? 0 : Math.ceil(cfg.dpoy_min_games_percent / 100 * tgCount) - acc.gp;

      const score = computeDpoyScore(acc, tgCount, cfg);

      // Trend
      const playerGames = leagueGames.filter(g => {
        const s = statMap[`${g.id}__${playerId}`];
        return s && didPlay(s);
      });
      let trend = "neutral";
      if (playerGames.length >= 2) {
        const prevAcc = accumulateDpoy(playerId, playerGames.slice(0, -1), statMap, cfg);
        const prevScore = computeDpoyScore(prevAcc, tgCount, cfg);
        if (score !== null && prevScore !== null) {
          const diff = score - prevScore;
          if (diff > 0.05) trend = "up";
          else if (diff < -0.05) trend = "down";
        }
      }

      return {
        playerId, player, team, teamId,
        gp: acc.gp,
        avgDefGis: acc.gp > 0 ? acc.sumDefGis / acc.gp : 0,
        score,
        eligible,
        gamesNeeded,
        trend,
        gpPct,
      };
    }).filter(Boolean);

    return results.filter(r => r.eligible).sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity)).slice(0, 10);
  }, [leaguePlayerIds, leagueGames, statMap, players, teams, stats, cfg]);

  // ── POG log ──────────────────────────────────────────────────────────────────
  const pogLog = useMemo(() => {
    return games
      .filter(g => g.status === "final" && g.player_of_game && !g.exclude_from_pog)
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
  }, [games]);

  // ── early empty state ────────────────────────────────────────────────────────
  const hasCompletedGames = games.some(g => g.status === "final");
  if (!hasCompletedGames) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Award tracking begins after teams have completed enough games</p>
      </div>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="bg-white border border-slate-200 shadow-sm rounded-xl p-1 h-auto gap-1 mb-4 flex-wrap">
        <TabsTrigger
          value="mvp"
          className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700 data-[state=active]:shadow-sm text-slate-600 font-medium text-sm"
        >
          <Trophy className="w-4 h-4" /> MVP Race
        </TabsTrigger>
        <TabsTrigger
          value="dpoy"
          className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-slate-600 font-medium text-sm"
        >
          <Shield className="w-4 h-4" /> DPOY Race
        </TabsTrigger>
        <TabsTrigger
          value="pog"
          className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-sm text-slate-600 font-medium text-sm"
        >
          <Star className="w-4 h-4" /> Player of the Game
        </TabsTrigger>
      </TabsList>

      {/* ── MVP tab ─────────────────────────────────────────────────────────── */}
      <TabsContent value="mvp">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold text-slate-900">MVP Race — Top 10</h2>
          </div>
          {mvpRankings.filter(r => r.eligible).length === 0 ? (
            <div className="p-12 text-center text-slate-500">No eligible MVP candidates yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-4 py-3">Player</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Team</th>
                    <th className="text-center px-3 py-3">GP</th>
                    <th className="text-center px-3 py-3">Avg GIS</th>
                    <th className="text-center px-3 py-3">MVP Score</th>
                    <th className="text-center px-3 py-3 hidden sm:table-cell">Trend</th>
                    <th className="text-left px-4 py-3">Award</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {mvpRankings.map((row, idx) => {
                    const rank = mvpRankings.filter(r => r.eligible).indexOf(row);
                    const isIneligible = !row.eligible;
                    const rowKey = `mvp-${row.playerId}`;
                    const isExpanded = !!expandedRows[rowKey];
                    // Find most recent game stat for breakdown
                    const recentGame = leagueGames.filter(g => {
                      const s = statMap[`${g.id}__${row.playerId}`];
                      return s && didPlay(s);
                    }).at(-1);
                    const recentStat = recentGame ? statMap[`${recentGame.id}__${row.playerId}`] : null;

                    return (
                      <React.Fragment key={row.playerId}>
                        <tr
                          className={[
                            "border-b border-slate-100 transition-colors cursor-pointer",
                            isIneligible ? "opacity-50" : "",
                            !isIneligible && rank === 0 ? "bg-yellow-50/60 hover:bg-yellow-50" : "hover:bg-slate-50",
                          ].join(" ")}
                          onClick={() => toggleRow(rowKey)}
                        >
                          <td className="px-4 py-3 font-bold text-slate-500">
                            {isIneligible ? "—" : rank + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {row.player.name || row.player.full_name || "Unknown"}
                            {isIneligible && (
                              <div className="text-xs font-normal text-slate-400 mt-0.5">
                                Needs {row.gamesNeeded} more game{row.gamesNeeded !== 1 ? "s" : ""} to qualify
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                            {row.team.name}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-700">{row.gp}</td>
                          <td className="px-3 py-3 text-center text-slate-700">{row.avgGis.toFixed(1)}</td>
                          <td className="px-3 py-3 text-center font-bold text-purple-700">
                            {row.score !== null ? row.score.toFixed(1) : "—"}
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            {!isIneligible && <TrendIcon trend={row.trend} />}
                          </td>
                          <td className="px-4 py-3">
                            {!isIneligible && rank < 5 && <AwardBadge rank={rank} type="mvp" />}
                          </td>
                          <td className="px-2 py-3 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </td>
                        </tr>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr key={`${row.playerId}-detail`}>
                              <td colSpan={9} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                      Score Breakdown — Most Recent Game
                                      {recentGame && ` (${format(new Date(recentGame.scheduled_at), "MMM d")})`}
                                    </p>
                                    <MvpBreakdown stat={recentStat} game={recentGame} cfg={cfg} />
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 sm:px-6 pb-4">
            <HowCalculated accentClass="text-yellow-500">
              <p>The MVP is awarded to the player with the highest overall impact across the season.</p>
              <p><strong>Calculated automatically from:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All-around performance — scoring, rebounds, assists, steals, blocks</li>
                <li>Consistency — average Game Impact Score (GIS) per game, not just a single big game</li>
                <li>Availability — games played as a percentage of their team's completed games</li>
                <li>Team performance — team win percentage adds a bonus</li>
                <li>Sportsmanship — technical and unsportsmanlike fouls reduce the final score</li>
              </ul>
              <p>To be eligible, a player must appear in at least {cfg.mvp_min_games_percent}% of their team's completed games.</p>
              <p className="font-semibold">No votes. No opinions. No manual adjustments.</p>
            </HowCalculated>
          </div>
        </div>
      </TabsContent>

      {/* ── DPOY tab ────────────────────────────────────────────────────────── */}
      <TabsContent value="dpoy">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">DPOY Race — Top 10</h2>
          </div>
          {dpoyRankings.filter(r => r.eligible).length === 0 ? (
            <div className="p-12 text-center text-slate-500">No eligible DPOY candidates yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-4 py-3">Player</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Team</th>
                    <th className="text-center px-3 py-3">GP</th>
                    <th className="text-center px-3 py-3">Avg DEF_GIS</th>
                    <th className="text-center px-3 py-3">DPOY Score</th>
                    <th className="text-center px-3 py-3 hidden sm:table-cell">Trend</th>
                    <th className="text-left px-4 py-3">Award</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {dpoyRankings.map((row, idx) => {
                    const rank = dpoyRankings.filter(r => r.eligible).indexOf(row);
                    const isIneligible = !row.eligible;
                    const rowKey = `dpoy-${row.playerId}`;
                    const isExpanded = !!expandedRows[rowKey];
                    const recentGame = leagueGames.filter(g => {
                      const s = statMap[`${g.id}__${row.playerId}`];
                      return s && didPlay(s);
                    }).at(-1);
                    const recentStat = recentGame ? statMap[`${recentGame.id}__${row.playerId}`] : null;

                    return (
                      <React.Fragment key={row.playerId}>
                        <tr
                          className={[
                            "border-b border-slate-100 transition-colors cursor-pointer",
                            isIneligible ? "opacity-50" : "",
                            !isIneligible && rank === 0 ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-slate-50",
                          ].join(" ")}
                          onClick={() => toggleRow(rowKey)}
                        >
                          <td className="px-4 py-3 font-bold text-slate-500">
                            {isIneligible ? "—" : rank + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {row.player.name || row.player.full_name || "Unknown"}
                            {isIneligible && (
                              <div className="text-xs font-normal text-slate-400 mt-0.5">
                                Needs {row.gamesNeeded} more game{row.gamesNeeded !== 1 ? "s" : ""} to qualify
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{row.team.name}</td>
                          <td className="px-3 py-3 text-center text-slate-700">{row.gp}</td>
                          <td className="px-3 py-3 text-center text-slate-700">{row.avgDefGis.toFixed(1)}</td>
                          <td className="px-3 py-3 text-center font-bold text-blue-700">
                            {row.score !== null ? row.score.toFixed(1) : "—"}
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            {!isIneligible && <TrendIcon trend={row.trend} />}
                          </td>
                          <td className="px-4 py-3">
                            {!isIneligible && rank === 0 && <AwardBadge rank={0} type="dpoy" />}
                          </td>
                          <td className="px-2 py-3 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </td>
                        </tr>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr key={`${row.playerId}-detail`}>
                              <td colSpan={9} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                      Score Breakdown — Most Recent Game
                                      {recentGame && ` (${format(new Date(recentGame.scheduled_at), "MMM d")})`}
                                    </p>
                                    <DpoyBreakdown stat={recentStat} cfg={cfg} />
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 sm:px-6 pb-4">
            <HowCalculated accentClass="text-blue-600">
              <p>The Defensive Player of the Year recognises the player with the strongest defensive impact across the season.</p>
              <p><strong>Calculated from:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Defensive actions — steals, blocks, and rebounds</li>
                <li>Defensive discipline — fewer fouls and technicals score higher</li>
                <li>Consistency and availability throughout the season</li>
              </ul>
              <p>Scoring is not included — the DPOY calculation is fair for all positions.</p>
              <p>To be eligible, a player must appear in at least {cfg.dpoy_min_games_percent}% of their team's completed games.</p>
              <p className="font-semibold">Fully data-driven. No manual overrides.</p>
            </HowCalculated>
          </div>
        </div>
      </TabsContent>

      {/* ── POG tab ──────────────────────────────────────────────────────────── */}
      <TabsContent value="pog">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Star className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-slate-900">Player of the Game — Full Log</h2>
          </div>
          {pogLog.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium">No Player of the Game awards yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Game</th>
                    <th className="text-center px-3 py-3">Score</th>
                    <th className="text-left px-4 py-3">POG Winner</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {pogLog.map((game) => {
                    const homeTeam = teams.find(t => t.id === game.home_team_id);
                    const awayTeam = teams.find(t => t.id === game.away_team_id);
                    const pogPlayer = players.find(p => p.id === game.player_of_game);
                    const pogTeam = pogPlayer
                      ? teams.find(t =>
                          stats.find(s => s.game_id === game.id && s.player_id === pogPlayer.id)?.team_id === t.id
                        )
                      : null;

                    return (
                      <tr key={game.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {game.scheduled_at ? format(new Date(game.scheduled_at), "MMM d, yyyy") : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {homeTeam?.name ?? "?"} vs {awayTeam?.name ?? "?"}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {game.home_score ?? 0}–{game.away_score ?? 0}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <span className="flex items-center gap-2">
                            {pogPlayer?.name || pogPlayer?.full_name || "Unknown"}
                            <AwardBadge rank={0} type="pog" />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                          {pogTeam?.name ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
