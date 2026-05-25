import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  BarChart3, Play, Settings, AlertTriangle, Trophy, Edit as EditIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { totalPoints } from "@/lib/playerStats";
import { findPlayerOfGame } from "@/components/utils/pogCalculator";
import { Button } from "@/components/ui/button";

const STAGE_LABELS = {
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  championship: "Championship",
  final: "Grand Final",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const mergeStatsByPlayer = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const k = row.player_id;
    if (!map.has(k)) { map.set(k, { ...row }); continue; }
    const e = map.get(k);
    e.points_2              = (e.points_2              || 0) + (row.points_2              || 0);
    e.points_3              = (e.points_3              || 0) + (row.points_3              || 0);
    e.free_throws           = (e.free_throws           || 0) + (row.free_throws           || 0);
    e.offensive_rebounds    = (e.offensive_rebounds    || 0) + (row.offensive_rebounds    || 0);
    e.defensive_rebounds    = (e.defensive_rebounds    || 0) + (row.defensive_rebounds    || 0);
    e.assists               = (e.assists               || 0) + (row.assists               || 0);
    e.steals                = (e.steals                || 0) + (row.steals                || 0);
    e.blocks                = (e.blocks                || 0) + (row.blocks                || 0);
    e.turnovers             = (e.turnovers             || 0) + (row.turnovers             || 0);
    e.fouls                 = (e.fouls                 || 0) + (row.fouls                 || 0);
    e.unsportsmanlike_fouls = (e.unsportsmanlike_fouls || 0) + (row.unsportsmanlike_fouls || 0);
    e.minutes_played        = Math.max(e.minutes_played || 0, row.minutes_played || 0);
    e.points                = (e.points                || 0) + (row.points                || 0);
  }
  return [...map.values()];
};

function useCountdown(targetIso) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!targetIso) { setText(""); return; }
    const compute = () => {
      const diff = new Date(targetIso) - new Date();
      if (diff <= 0) { setText("Starting soon"); return; }
      const totalMin = Math.floor(diff / 60000);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      const days = Math.floor(hours / 24);
      if (days >= 1) { setText(`Starts in ${days} day${days > 1 ? "s" : ""}`); return; }
      if (hours >= 1) { setText(`Starts in ${hours}h ${mins}m`); return; }
      setText(`Starts in ${totalMin}m`);
    };
    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [targetIso]);
  return text;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ScheduleGameCard({
  game, canManage, period, onStartGame, onGameUpdated,
  onEditSettings, onMarkDefault,
}) {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const homeTeam = game.home_team;
  const awayTeam = game.away_team;
  const pogPlayer = game.pog_player;
  const pogName = pogPlayer
    ? pogPlayer.name || `${pogPlayer.first_name || ""} ${pogPlayer.last_name || ""}`.trim()
    : null;

  const isLive = game.status === "live";
  const isFinal = game.status === "final";
  const isScheduled = game.status === "scheduled";
  const showScore = isLive || isFinal;
  const homeScore = game.home_score || 0;
  const awayScore = game.away_score || 0;
  const homeWon = isFinal && homeScore > awayScore;
  const awayWon = isFinal && awayScore > homeScore;

  const countdown = useCountdown(isScheduled ? game.scheduled_at : null);

  // Backfill player_of_game for final games that were missed — same pattern as legacy GameCard
  useEffect(() => {
    if (!isFinal || game.player_of_game) return;
    let cancelled = false;
    (async () => {
      const { data: stats } = await supabase
        .from("player_stats")
        .select("*")
        .eq("game_id", game.id);
      if (cancelled || !stats || stats.length === 0) return;
      const pogId = findPlayerOfGame(stats, game, null);
      if (!pogId) return;
      await supabase.from("games").update({ player_of_game: pogId }).eq("id", game.id);
      if (!cancelled) queryClient.invalidateQueries({ queryKey: ["schedule-games"] });
    })();
    return () => { cancelled = true; };
  }, [game.id, isFinal, game.player_of_game, queryClient]);

  // Box-score player stats — only fetched when card is expanded
  const { data: playerStats = [] } = useQuery({
    queryKey: ["player-stats", game.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select(`
          id, player_id, team_id,
          points, points_2, points_3, free_throws,
          offensive_rebounds, defensive_rebounds,
          assists, steals, blocks, turnovers, fouls,
          unsportsmanlike_fouls, minutes_played,
          player:players(id, first_name, last_name, name, jersey_number)
        `)
        .eq("game_id", game.id);
      if (error) throw error;
      return data;
    },
    enabled: isFinal && isExpanded,
    staleTime: 300000,
  });

  const homeStats = mergeStatsByPlayer(playerStats.filter((s) => s.team_id === game.home_team_id));
  const awayStats = mergeStatsByPlayer(playerStats.filter((s) => s.team_id === game.away_team_id));

  const defaultWinnerTeam = game.is_default_result
    ? (homeTeam?.id === game.default_winner_team_id ? homeTeam : awayTeam)
    : null;

  const renderBoxScore = (stats, team) => {
    if (stats.length === 0) {
      return <p className="text-sm text-center py-4" style={{ color: "var(--ct-text-muted)" }}>No stats recorded</p>;
    }
    const sorted = [...stats].sort((a, b) => totalPoints(b) - totalPoints(a));
    const sumField = (f) => stats.reduce((a, s) => a + (s[f] || 0), 0);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--ct-bg-elevated)" }}>
              {["Player", "PTS", "3PT", "FT", "OR", "DR", "REB", "AST", "STL", "BLK", "TO", "F"].map((h, i) => (
                <th
                  key={h}
                  className="py-2 px-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{
                    color: "var(--ct-text-secondary)",
                    textAlign: i === 0 ? "left" : "center",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const pts = totalPoints(s);
              const reb = (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0);
              const name = s.player?.name
                || `${s.player?.first_name || ""} ${s.player?.last_name || ""}`.trim()
                || "Unknown";
              return (
                <tr key={s.player_id} style={{ borderBottom: "1px solid var(--ct-border)" }}>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: team?.color || "var(--ct-accent)" }}
                      >
                        {s.player?.jersey_number ?? "?"}
                      </div>
                      <span className="text-sm" style={{ color: "var(--ct-text-primary)" }}>{name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center font-semibold" style={{ color: "var(--ct-accent)" }}>{pts}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.points_3 || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.free_throws || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.offensive_rebounds || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.defensive_rebounds || 0}</td>
                  <td className="py-2 px-2 text-center font-medium" style={{ color: "var(--ct-text-primary)" }}>{reb}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.assists || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.steals || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.blocks || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.turnovers || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{s.fouls || 0}</td>
                </tr>
              );
            })}
            <tr style={{ background: "var(--ct-bg-elevated)", fontWeight: 600 }}>
              <td className="py-2 px-2" style={{ color: "var(--ct-text-primary)" }}>TEAM TOTALS</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-accent)" }}>
                {stats.reduce((a, s) => a + totalPoints(s), 0)}
              </td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("points_3")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("free_throws")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("offensive_rebounds")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("defensive_rebounds")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>
                {sumField("offensive_rebounds") + sumField("defensive_rebounds")}
              </td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("assists")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("steals")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("blocks")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("turnovers")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField("fouls")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ── compact team row ───────────────────────────────────────────────────────
  const TeamRow = ({ team, score, won }) => (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
        style={{ backgroundColor: team?.color || "var(--ct-accent)" }}
      >
        {team?.short_name || team?.name?.slice(0, 3).toUpperCase() || "?"}
      </div>
      <span
        className="flex-1 text-sm leading-snug"
        style={{
          color: showScore && !won ? "var(--ct-text-muted)" : "var(--ct-text-primary)",
          fontWeight: won ? 700 : 500,
          wordBreak: "break-word",
        }}
      >
        {team?.name || "TBD"}
      </span>
      {showScore ? (
        <span
          className="text-lg font-bold tabular-nums flex-shrink-0"
          style={{
            color: isLive
              ? "var(--ct-success)"
              : won
              ? "var(--ct-text-primary)"
              : "var(--ct-text-muted)",
          }}
        >
          {score}
        </span>
      ) : (
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--ct-text-muted)" }}>
          vs
        </span>
      )}
    </div>
  );

  // Meta line text
  const metaParts = [];
  if (game.scheduled_at) {
    if (isFinal) metaParts.push(format(new Date(game.scheduled_at), "EEE, MMM d"));
  }
  if (game.venue) metaParts.push(game.venue);
  if (isScheduled && countdown) metaParts.push(countdown);

  return (
    <motion.div
      id={`schedule-game-${game.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-[10px] overflow-hidden"
      style={{
        background: "var(--ct-bg-card)",
        border: "1px solid var(--ct-border)",
      }}
    >
      <div style={{ padding: "14px 16px" }} className="flex flex-col gap-2">

        {/* Header row: status badge + right-aligned league name */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isLive && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgb(var(--ct-danger-rgb) / 0.15)",
                  color: "var(--ct-danger)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--ct-danger)" }} />
                Live{period ? ` · Q${period}` : ""}
              </span>
            )}
            {isFinal && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "var(--ct-bg-elevated)", color: "var(--ct-text-muted)" }}
              >
                Final
              </span>
            )}
            {isScheduled && game.scheduled_at && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgb(var(--ct-accent-rgb) / 0.15)",
                  color: "var(--ct-accent)",
                }}
              >
                {format(new Date(game.scheduled_at), "HH:mm")}
              </span>
            )}
            {game.game_stage && game.game_stage !== "regular" && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{
                  background: "rgb(var(--ct-accent-gold-rgb) / 0.15)",
                  color: "var(--ct-accent-gold)",
                }}
              >
                {STAGE_LABELS[game.game_stage] || game.game_stage}
              </span>
            )}
            {game.edited && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{
                  background: "rgb(var(--ct-accent-gold-rgb) / 0.1)",
                  color: "var(--ct-accent-gold)",
                  border: "1px solid var(--ct-accent-gold)",
                }}
              >
                Edited
              </span>
            )}
            {game.is_default_result && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{
                  background: "rgb(var(--ct-danger-rgb) / 0.15)",
                  color: "var(--ct-danger)",
                }}
              >
                Default · {defaultWinnerTeam?.name || "Winner"}
              </span>
            )}
          </div>
          {game.league?.name && (
            <span className="text-xs truncate max-w-[40%]" style={{ color: "var(--ct-text-muted)" }}>
              {game.league.name}
            </span>
          )}
        </div>

        {/* Team rows */}
        <div>
          <TeamRow team={awayTeam} score={awayScore} won={awayWon} />
          <TeamRow team={homeTeam} score={homeScore} won={homeWon} />
        </div>

        {/* Meta line */}
        {metaParts.length > 0 && (
          <p
            className="text-xs pt-1.5"
            style={{ color: "var(--ct-text-muted)", borderTop: "1px solid var(--ct-border)" }}
          >
            {metaParts.join(" · ")}
          </p>
        )}

        {/* Player of the game */}
        {isFinal && pogName && (
          <div className="flex items-center gap-1.5 text-sm">
            <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-accent-gold)" }} />
            <span style={{ color: "var(--ct-text-secondary)" }}>Player of the game:</span>
            <span className="font-semibold truncate" style={{ color: "var(--ct-accent-gold)" }}>{pogName}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {isFinal && (
            <Button
              onClick={() => setIsExpanded((v) => !v)}
              className="rounded-lg"
              style={{
                background: "transparent",
                border: "1px solid var(--ct-border)",
                color: "var(--ct-text-secondary)",
                height: 36,
              }}
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              {isExpanded ? "Hide stats" : "View stats"}
            </Button>
          )}

          {isLive && (
            <>
              <Button
                onClick={() => navigate(`/LiveBoxScore?gameId=${game.id}`)}
                className="rounded-lg"
                style={{
                  background: "transparent",
                  border: "1px solid var(--ct-accent)",
                  color: "var(--ct-accent)",
                  height: 36,
                }}
              >
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Live stats
              </Button>
              {canManage && (
                <Button
                  onClick={onStartGame}
                  className="rounded-lg"
                  style={{
                    background: "var(--ct-accent)",
                    color: "#ffffff",
                    border: "none",
                    height: 36,
                  }}
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Continue
                </Button>
              )}
            </>
          )}

          {isScheduled && canManage && (
            <>
              <Button
                onClick={onStartGame}
                className="rounded-lg"
                style={{ background: "var(--ct-success)", color: "#ffffff", border: "none", height: 36 }}
              >
                <Play className="w-4 h-4 mr-1.5" />
                Start
              </Button>
              <Button
                onClick={onEditSettings}
                className="rounded-lg"
                style={{
                  background: "transparent",
                  border: "1px solid var(--ct-border)",
                  color: "var(--ct-text-secondary)",
                  height: 36,
                }}
              >
                <EditIcon className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
              <Button
                onClick={onMarkDefault}
                className="rounded-lg"
                style={{
                  background: "transparent",
                  border: "1px solid var(--ct-border)",
                  color: "var(--ct-text-secondary)",
                  height: 36,
                  width: 36,
                  padding: 0,
                }}
                title="Mark default winner"
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expanded box score */}
      <AnimatePresence initial={false}>
        {isExpanded && isFinal && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-4 py-4 space-y-6"
              style={{
                borderTop: "1px solid var(--ct-border)",
                background: "var(--ct-bg-page)",
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: homeTeam?.color || "var(--ct-accent)" }}
                  />
                  <h4 className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>
                    {homeTeam?.name}
                  </h4>
                  <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>
                    — {homeScore} pts
                  </span>
                </div>
                {renderBoxScore(homeStats, homeTeam)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: awayTeam?.color || "var(--ct-accent)" }}
                  />
                  <h4 className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>
                    {awayTeam?.name}
                  </h4>
                  <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>
                    — {awayScore} pts
                  </span>
                </div>
                {renderBoxScore(awayStats, awayTeam)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
