import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
  Trophy, Shield, Star, HelpCircle, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { resolveSettings } from "@/utils/awardDefaults";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";
import { totalPoints, didPlay } from "@/lib/playerStats";

// ─── Helpers (unchanged scoring logic) ────────────────────────────────────────

function isActualPlayedGame(g) {
  return (
    g.status === "final" &&
    !g.is_default_result &&
    g.result_type !== "default" &&
    !g.exclude_from_awards
  );
}

function calcGis(stat, game, cfg) {
  // Use the shared totalPoints helper so manual entry (authoritative `points`)
  // and digital entry (summed from `points_2`/`points_3`/`free_throws` makes)
  // are both handled correctly.
  const pts = cfg.mvp_pts_weight * totalPoints(stat);
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function AwardBadge({ rank, type }) {
  const style = "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full";
  if (type === "mvp") {
    if (rank === 0) return <span className={style} style={{ background: "var(--ct-accent-gold)", color: "var(--ct-bg-page)" }}><Trophy className="w-3 h-3" />MVP</span>;
    if (rank === 1) return <span className={style} style={{ background: "#8B5CF6", color: "#ffffff" }}>Mythical 1</span>;
    if (rank === 2) return <span className={style} style={{ background: "#A78BFA", color: "#ffffff" }}>Mythical 2</span>;
    if (rank === 3) return <span className={style} style={{ background: "#C4B5FD", color: "#1E1B4B" }}>Mythical 3</span>;
    if (rank === 4) return <span className={style} style={{ background: "#DDD6FE", color: "#1E1B4B" }}>Mythical 4</span>;
  }
  if (type === "dpoy" && rank === 0) {
    return <span className={style} style={{ background: "var(--ct-accent)", color: "#ffffff" }}><Shield className="w-3 h-3" />DPOY</span>;
  }
  if (type === "pog") {
    return <span className={style} style={{ background: "var(--ct-success)", color: "#ffffff" }}><Star className="w-3 h-3" />POG</span>;
  }
  return null;
}

function TrendIcon({ trend }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4" style={{ color: "var(--ct-success)" }} />;
  if (trend === "down") return <TrendingDown className="w-4 h-4" style={{ color: "var(--ct-danger)" }} />;
  return <Minus className="w-4 h-4" style={{ color: "var(--ct-text-muted)" }} />;
}

function BreakdownTable({ rows }) {
  return (
    <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
      <colgroup>
        <col />
        <col style={{ width: 44 }} />
        <col style={{ width: 48 }} />
        <col style={{ width: 60 }} />
      </colgroup>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--ct-border)" }}>
          <th className="text-left py-1 pr-2 font-medium" style={{ color: "var(--ct-text-secondary)" }}>Stat</th>
          <th className="text-right py-1 px-1 font-medium" style={{ color: "var(--ct-text-secondary)" }}>Value</th>
          <th className="text-right py-1 px-1 font-medium" style={{ color: "var(--ct-text-secondary)" }}>Weight</th>
          <th className="text-right py-1 font-medium" style={{ color: "var(--ct-text-secondary)" }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const contribution = row.positive ? row.value * row.weight : -(row.value * row.weight);
          const color = contribution > 0 ? "var(--ct-success)" : contribution < 0 ? "var(--ct-danger)" : "var(--ct-text-muted)";
          return (
            <tr key={row.label} style={{ borderBottom: "1px solid var(--ct-border)" }}>
              <td className="py-1 pr-2 truncate" style={{ color: "var(--ct-text-primary)" }} title={row.label}>{row.label}</td>
              <td className="py-1 px-1 text-right" style={{ color: "var(--ct-text-secondary)" }}>{row.value}</td>
              <td className="py-1 px-1 text-right" style={{ color: "var(--ct-text-muted)" }}>×{row.weight.toFixed(1)}</td>
              <td className="py-1 text-right font-semibold" style={{ color }}>
                {contribution >= 0 ? "+" : ""}{contribution.toFixed(1)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MvpBreakdown({ stat, game, cfg }) {
  if (!stat) return <p className="text-sm" style={{ color: "var(--ct-text-muted)" }}>No stat data available.</p>;
  // Use shared helper: prefers `points` when set (manual entry), else derives from makes (digital).
  const totalPts = totalPoints(stat);
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
  if (!stat) return <p className="text-sm" style={{ color: "var(--ct-text-muted)" }}>No stat data available.</p>;
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

function HowCalculated({ children, accentColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--ct-border)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        style={{ background: "transparent", color: "var(--ct-text-primary)", border: "none", cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--ct-bg-elevated)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" style={{ color: accentColor }} />
          How is this calculated?
        </span>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: "var(--ct-text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--ct-text-muted)" }} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="how"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-4 pb-4 pt-3 text-sm space-y-2"
              style={{ color: "var(--ct-text-secondary)", borderTop: "1px solid var(--ct-border)", background: "var(--ct-bg-page)" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile hero card (rank 1) ────────────────────────────────────────────────

function HeroCard({ row, type, scoreLabel, isExpanded, onToggle, statMap, leagueGames, cfg }) {
  const playerName = row.player.name || row.player.full_name || "Unknown";
  const scoreVal = row.score !== null ? row.score.toFixed(1) : "—";
  const accentColor = type === "dpoy" ? "var(--ct-accent)" : "var(--ct-accent-gold)";

  const recentGame = leagueGames.filter(g => {
    const s = statMap[`${g.id}__${row.playerId}`];
    return s && didPlay(s);
  }).at(-1);
  const recentStat = recentGame ? statMap[`${recentGame.id}__${row.playerId}`] : null;

  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{
        background: "var(--ct-bg-card)",
        border: `2px solid ${accentColor}`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <AwardBadge rank={0} type={type} />
          <TrendIcon trend={row.trend} />
        </div>
        <h3 className="text-xl font-bold leading-tight mb-1" style={{ color: "var(--ct-text-primary)" }}>
          {playerName}
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--ct-text-secondary)" }}>{row.team.name}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold" style={{ color: accentColor }}>
            {scoreVal}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>
            {scoreLabel}
          </span>
          <span className="ml-auto text-xs" style={{ color: "var(--ct-text-muted)" }}>GP {row.gp}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            style={{ color: "var(--ct-text-muted)" }}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-4 rounded-lg p-3" style={{ background: "var(--ct-bg-page)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ct-text-muted)" }}>
                Score Breakdown — Most Recent Game
                {recentGame && ` (${format(new Date(recentGame.scheduled_at), "MMM d")})`}
              </p>
              {type === "mvp"
                ? <MvpBreakdown stat={recentStat} game={recentGame} cfg={cfg} />
                : <DpoyBreakdown stat={recentStat} cfg={cfg} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile rank row (ranks 2-10) ─────────────────────────────────────────────

function RankRow({ row, rank, type, isExpanded, onToggle, statMap, leagueGames, cfg }) {
  const playerName = row.player.name || row.player.full_name || "Unknown";
  const isIneligible = !row.eligible;
  const scoreVal = row.score !== null ? row.score.toFixed(1) : "—";
  const rankColor = isIneligible ? "var(--ct-text-muted)" : (rank <= 3 ? "var(--ct-text-primary)" : "var(--ct-text-secondary)");

  // Find most recent game for breakdown
  const recentGame = leagueGames.filter(g => {
    const s = statMap[`${g.id}__${row.playerId}`];
    return s && didPlay(s);
  }).at(-1);
  const recentStat = recentGame ? statMap[`${recentGame.id}__${row.playerId}`] : null;

  return (
    <div
      className="rounded-lg mb-1"
      style={{
        background: "var(--ct-bg-card)",
        border: "1px solid var(--ct-border)",
        opacity: isIneligible ? 0.6 : 1,
      }}
    >
      <button
        onClick={onToggle}
        disabled={isIneligible}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ background: "transparent", border: "none", cursor: isIneligible ? "default" : "pointer" }}
      >
        <span className="w-6 font-bold text-sm text-center flex-shrink-0" style={{ color: rankColor }}>
          {isIneligible ? "—" : rank}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: isIneligible ? "var(--ct-text-muted)" : "var(--ct-text-primary)" }}>
            {playerName}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--ct-text-muted)" }}>
            {row.team.name}
            {isIneligible && ` · Needs ${row.gamesNeeded} more game${row.gamesNeeded !== 1 ? "s" : ""}`}
          </div>
        </div>

        {rank >= 1 && rank <= 4 && !isIneligible && type === "mvp" && (
          <div className="flex-shrink-0 hidden sm:block">
            <AwardBadge rank={rank} type="mvp" />
          </div>
        )}

        <span className="font-bold text-base flex-shrink-0" style={{ color: "var(--ct-accent)" }}>
          {scoreVal}
        </span>

        {!isIneligible && (
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            style={{ color: "var(--ct-text-muted)" }}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && !isIneligible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="mx-3 mb-3 rounded-lg p-3"
              style={{ background: "var(--ct-bg-page)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ct-text-muted)" }}>
                Score Breakdown — Most Recent Game
                {recentGame && ` (${format(new Date(recentGame.scheduled_at), "MMM d")})`}
              </p>
              {type === "mvp"
                ? <MvpBreakdown stat={recentStat} game={recentGame} cfg={cfg} />
                : <DpoyBreakdown stat={recentStat} cfg={cfg} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AwardLeadersComponent({ league, teams, games, players, stats, awardSettings }) {
  const cfg = resolveSettings(awardSettings);
  const [activeTab, setActiveTab] = useState("mvp");
  const [expandedRows, setExpandedRows] = useState({});
  const isNarrow = useIsNarrowLayout();

  const toggleRow = (key) => setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));

  // Live stat tracker writes one row per action — aggregate all rows for the
  // same (game_id, player_id) into a single merged stat so breakdowns and GIS
  // reflect the full game total, not just the last action recorded.
  const statMap = useMemo(() => {
    const m = {};
    for (const s of stats) {
      if (!s.game_id || !s.player_id) continue;
      const key = `${s.game_id}__${s.player_id}`;
      if (!m[key]) {
        m[key] = { ...s };
      } else {
        const e = m[key];
        e.points                = (e.points                || 0) + (s.points                || 0);
        e.points_2              = (e.points_2              || 0) + (s.points_2              || 0);
        e.points_3              = (e.points_3              || 0) + (s.points_3              || 0);
        e.free_throws           = (e.free_throws           || 0) + (s.free_throws           || 0);
        e.offensive_rebounds    = (e.offensive_rebounds    || 0) + (s.offensive_rebounds    || 0);
        e.defensive_rebounds    = (e.defensive_rebounds    || 0) + (s.defensive_rebounds    || 0);
        e.assists               = (e.assists               || 0) + (s.assists               || 0);
        e.steals                = (e.steals                || 0) + (s.steals                || 0);
        e.blocks                = (e.blocks                || 0) + (s.blocks                || 0);
        e.turnovers             = (e.turnovers             || 0) + (s.turnovers             || 0);
        e.fouls                 = (e.fouls                 || 0) + (s.fouls                 || 0);
        e.technical_fouls       = (e.technical_fouls       || 0) + (s.technical_fouls       || 0);
        e.unsportsmanlike_fouls = (e.unsportsmanlike_fouls || 0) + (s.unsportsmanlike_fouls || 0);
        e.minutes_played        = Math.max(e.minutes_played || 0, s.minutes_played || 0);
        e.did_play              = e.did_play || s.did_play;
      }
    }
    return m;
  }, [stats]);

  const leagueGames = useMemo(
    () => games.filter(isActualPlayedGame).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [games]
  );

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

      const playerGames = leagueGames.filter(g => {
        const s = statMap[`${g.id}__${playerId}`];
        return s && didPlay(s);
      });
      let trend = "neutral";
      if (playerGames.length >= 2) {
        const prevGames = playerGames.slice(0, -1);
        const lastGame = playerGames[playerGames.length - 1];
        const prevAcc = accumulateMvp(playerId, teamId, prevGames, statMap, cfg);
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

  // ── POG log ─────────────────────────────────────────────────────────────────
  const pogLog = useMemo(() => {
    return games
      .filter(g => g.status === "final" && g.player_of_game && !g.exclude_from_pog)
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
  }, [games]);

  // ── Early empty state ──────────────────────────────────────────────────────
  const hasCompletedGames = games.some(g => g.status === "final");
  if (!hasCompletedGames) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
      >
        <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--ct-text-muted)" }} />
        <p className="font-medium" style={{ color: "var(--ct-text-secondary)" }}>
          Award tracking begins after teams have completed enough games
        </p>
      </div>
    );
  }

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "mvp",  short: "MVP",  long: "MVP Race",           icon: Trophy },
    { id: "dpoy", short: "DPOY", long: "DPOY Race",          icon: Shield },
    { id: "pog",  short: "POG",  long: "Player of the Game", icon: Star },
  ];

  const TabBar = (
    <div
      className="overflow-x-auto mb-4"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div
        className="inline-flex p-1 rounded-full gap-1"
        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap"
              style={{
                background: active ? "var(--ct-accent)" : "transparent",
                color:      active ? "#ffffff" : "var(--ct-text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Icon className="w-4 h-4" />
              {isNarrow ? tab.short : tab.long}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Mobile MVP/DPOY list renderer ──────────────────────────────────────────
  const renderMobileRankings = (rankings, type) => {
    if (rankings.length === 0) {
      return (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
        >
          <p style={{ color: "var(--ct-text-muted)" }}>No eligible {type.toUpperCase()} candidates yet</p>
        </div>
      );
    }

    const [first, ...rest] = rankings;
    const scoreLabel = type === "mvp" ? "MVP Score" : "DPOY Score";
    const heroKey = first ? `${type}-${first.playerId}` : null;
    return (
      <div>
        {first && (
          <HeroCard
            row={first}
            type={type}
            scoreLabel={scoreLabel}
            isExpanded={!!expandedRows[heroKey]}
            onToggle={() => toggleRow(heroKey)}
            statMap={statMap}
            leagueGames={leagueGames}
            cfg={cfg}
          />
        )}
        <div className="mb-4">
          {rest.map((row, i) => {
            const rank = i + 2;
            const key = `${type}-${row.playerId}`;
            return (
              <RankRow
                key={row.playerId}
                row={row}
                rank={rank}
                type={type}
                isExpanded={!!expandedRows[key]}
                onToggle={() => toggleRow(key)}
                statMap={statMap}
                leagueGames={leagueGames}
                cfg={cfg}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // ── Desktop MVP/DPOY table renderer ────────────────────────────────────────
  const renderDesktopTable = (rankings, type) => {
    if (rankings.length === 0) {
      return (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
        >
          <p style={{ color: "var(--ct-text-muted)" }}>No eligible {type.toUpperCase()} candidates yet</p>
        </div>
      );
    }

    const scoreCol = type === "mvp" ? "MVP Score" : "DPOY Score";
    const avgCol   = type === "mvp" ? "Avg GIS" : "Avg DEF_GIS";
    const avgKey   = type === "mvp" ? "avgGis" : "avgDefGis";

    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--ct-bg-elevated)", borderBottom: "1px solid var(--ct-border)" }}>
                {["#", "Player", "Team", "GP", avgCol, scoreCol, "Trend", "Award", ""].map((h, i) => (
                  <th
                    key={i}
                    className="py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color: "var(--ct-text-secondary)",
                      textAlign: i === 0 || i === 1 || i === 2 || i === 7 ? "left" : "center",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankings.map((row, idx) => {
                const rank = idx + 1;
                const rowKey = `${type}-${row.playerId}`;
                const isExpanded = !!expandedRows[rowKey];
                const playerName = row.player.name || row.player.full_name || "Unknown";
                const recentGame = leagueGames.filter(g => {
                  const s = statMap[`${g.id}__${row.playerId}`];
                  return s && didPlay(s);
                }).at(-1);
                const recentStat = recentGame ? statMap[`${recentGame.id}__${row.playerId}`] : null;
                const rowBg = rank === 1 ? (type === "mvp" ? "rgba(245, 158, 11, 0.08)" : "rgba(59, 130, 246, 0.08)") : "transparent";
                const showAward = type === "mvp" ? rank >= 1 && rank <= 5 : rank === 1;

                return (
                  <React.Fragment key={row.playerId}>
                    <tr
                      onClick={() => toggleRow(rowKey)}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--ct-border)", background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--ct-bg-elevated)"}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      <td className="px-4 py-3 font-bold" style={{ color: rank === 1 ? "var(--ct-accent-gold)" : "var(--ct-text-secondary)" }}>{rank}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ct-text-primary)" }}>{playerName}</td>
                      <td className="px-4 py-3" style={{ color: "var(--ct-text-secondary)" }}>{row.team.name}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--ct-text-primary)" }}>{row.gp}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--ct-text-primary)" }}>{row[avgKey].toFixed(1)}</td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: type === "mvp" ? "var(--ct-accent-gold)" : "var(--ct-accent)" }}>
                        {row.score !== null ? row.score.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex"><TrendIcon trend={row.trend} /></div>
                      </td>
                      <td className="px-4 py-3">
                        {showAward && <AwardBadge rank={rank - 1} type={type} />}
                      </td>
                      <td className="px-2 py-3" style={{ color: "var(--ct-text-muted)" }}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div
                                className="px-6 py-4"
                                style={{ background: "var(--ct-bg-page)", borderBottom: "1px solid var(--ct-border)" }}
                              >
                                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ct-text-muted)" }}>
                                  Score Breakdown — Most Recent Game
                                  {recentGame && ` (${format(new Date(recentGame.scheduled_at), "MMM d")})`}
                                </p>
                                {type === "mvp"
                                  ? <MvpBreakdown stat={recentStat} game={recentGame} cfg={cfg} />
                                  : <DpoyBreakdown stat={recentStat} cfg={cfg} />}
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
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {TabBar}

      {activeTab === "mvp" && (
        <>
          {isNarrow
            ? renderMobileRankings(mvpRankings, "mvp")
            : renderDesktopTable(mvpRankings, "mvp")}
          <HowCalculated accentColor="var(--ct-accent-gold)">
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
        </>
      )}

      {activeTab === "dpoy" && (
        <>
          {isNarrow
            ? renderMobileRankings(dpoyRankings, "dpoy")
            : renderDesktopTable(dpoyRankings, "dpoy")}
          <HowCalculated accentColor="var(--ct-accent)">
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
        </>
      )}

      {activeTab === "pog" && (
        <>
          {pogLog.length === 0 ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
            >
              <Star className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--ct-text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--ct-text-secondary)" }}>No Player of the Game awards yet</p>
            </div>
          ) : isNarrow ? (
            // Mobile: stacked cards
            <div>
              {pogLog.map(game => {
                const homeTeam = teams.find(t => t.id === game.home_team_id);
                const awayTeam = teams.find(t => t.id === game.away_team_id);
                const pogPlayer = players.find(p => p.id === game.player_of_game);
                const pogTeam = pogPlayer
                  ? teams.find(t =>
                      stats.find(s => s.game_id === game.id && s.player_id === pogPlayer.id)?.team_id === t.id
                    )
                  : null;
                const winner = (game.home_score || 0) > (game.away_score || 0) ? homeTeam : awayTeam;
                const pogName = pogPlayer?.name || pogPlayer?.full_name || "Unknown";
                return (
                  <div
                    key={game.id}
                    className="rounded-xl p-4 mb-2"
                    style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ct-text-muted)" }}>
                        <Calendar className="w-3.5 h-3.5" />
                        {game.scheduled_at ? format(new Date(game.scheduled_at), "MMM d, yyyy") : "—"}
                      </span>
                      <AwardBadge rank={0} type="pog" />
                    </div>
                    <div className="text-sm mb-2" style={{ color: "var(--ct-text-primary)" }}>
                      {homeTeam?.name ?? "?"} <span style={{ color: "var(--ct-text-muted)" }}>vs</span> {awayTeam?.name ?? "?"}
                    </div>
                    <div className="text-xs mb-3" style={{ color: "var(--ct-text-secondary)" }}>
                      Final: {game.home_score ?? 0}–{game.away_score ?? 0} · Winner: {winner?.name || "—"}
                    </div>
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--ct-border)" }}>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--ct-text-muted)" }}>
                          Player of the Game
                        </div>
                        <div className="text-sm font-semibold" style={{ color: "var(--ct-text-primary)" }}>{pogName}</div>
                      </div>
                      {pogTeam && (
                        <span className="text-xs" style={{ color: "var(--ct-text-secondary)" }}>{pogTeam.name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Desktop: table
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--ct-bg-elevated)", borderBottom: "1px solid var(--ct-border)" }}>
                      {["Date", "Game", "Score", "POG Winner", "Team"].map((h, i) => (
                        <th
                          key={h}
                          className="py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{
                            color: "var(--ct-text-secondary)",
                            textAlign: i === 2 ? "center" : "left",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pogLog.map(game => {
                      const homeTeam = teams.find(t => t.id === game.home_team_id);
                      const awayTeam = teams.find(t => t.id === game.away_team_id);
                      const pogPlayer = players.find(p => p.id === game.player_of_game);
                      const pogTeam = pogPlayer
                        ? teams.find(t =>
                            stats.find(s => s.game_id === game.id && s.player_id === pogPlayer.id)?.team_id === t.id
                          )
                        : null;
                      return (
                        <tr
                          key={game.id}
                          style={{ borderBottom: "1px solid var(--ct-border)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--ct-bg-elevated)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--ct-text-secondary)" }}>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" style={{ color: "var(--ct-text-muted)" }} />
                              {game.scheduled_at ? format(new Date(game.scheduled_at), "MMM d, yyyy") : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--ct-text-primary)" }}>
                            {homeTeam?.name ?? "?"} vs {awayTeam?.name ?? "?"}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold whitespace-nowrap" style={{ color: "var(--ct-text-primary)" }}>
                            {game.home_score ?? 0}–{game.away_score ?? 0}
                          </td>
                          <td className="px-4 py-3 font-semibold" style={{ color: "var(--ct-text-primary)" }}>
                            <span className="flex items-center gap-2">
                              {pogPlayer?.name || pogPlayer?.full_name || "Unknown"}
                              <AwardBadge rank={0} type="pog" />
                            </span>
                          </td>
                          <td className="px-4 py-3" style={{ color: "var(--ct-text-secondary)" }}>
                            {pogTeam?.name ?? "—"}
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
  );
}
