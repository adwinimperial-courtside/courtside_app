import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Play, Settings, AlertTriangle, BarChart3, Trophy } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { totalPoints } from "@/lib/playerStats";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";
import { findPlayerOfGame } from "../utils/pogCalculator";
import DefaultWinnerDialog from "./DefaultWinnerDialog";
import EditGameSettingsDialog from "./EditGameSettingsDialog";

// Aggregate multiple player_stats rows per player (one row per action)
const mergeStatsByPlayer = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = row.player_id;
    if (!map.has(key)) {
      map.set(key, { ...row });
    } else {
      const e = map.get(key);
      e.points_2               = (e.points_2               || 0) + (row.points_2               || 0);
      e.points_3               = (e.points_3               || 0) + (row.points_3               || 0);
      e.free_throws            = (e.free_throws            || 0) + (row.free_throws            || 0);
      e.offensive_rebounds     = (e.offensive_rebounds     || 0) + (row.offensive_rebounds     || 0);
      e.defensive_rebounds     = (e.defensive_rebounds     || 0) + (row.defensive_rebounds     || 0);
      e.assists                = (e.assists                || 0) + (row.assists                || 0);
      e.steals                 = (e.steals                 || 0) + (row.steals                 || 0);
      e.blocks                 = (e.blocks                 || 0) + (row.blocks                 || 0);
      e.turnovers              = (e.turnovers              || 0) + (row.turnovers              || 0);
      e.fouls                  = (e.fouls                  || 0) + (row.fouls                  || 0);
      e.unsportsmanlike_fouls  = (e.unsportsmanlike_fouls  || 0) + (row.unsportsmanlike_fouls  || 0);
      e.minutes_played         = Math.max(e.minutes_played || 0, row.minutes_played || 0);
    }
  }
  return [...map.values()];
};

// Dark-themed pill
const Pill = ({ children, bg, color, border }) => (
  <span
    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
    style={{ background: bg, color, border: border || "none" }}
  >
    {children}
  </span>
);

const STAGE_LABELS = {
  quarterfinal: "Quarterfinal",
  semifinal:    "Semifinal",
  championship: "Championship",
  final:        "Grand Final",
};

export default function GameCard({ game, teams, leagueName, canManage, onStartGame, onGameUpdated }) {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const isNarrow    = useIsNarrowLayout();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [pogPlayer, setPogPlayer] = useState(null);

  const homeTeam = teams.find((t) => t.id === game.home_team_id);
  const awayTeam = teams.find((t) => t.id === game.away_team_id);

  // Fetch Player of the Game name for final games (when already set)
  useEffect(() => {
    if (game.status !== "final" || !game.player_of_game) {
      setPogPlayer(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("players")
      .select("id, first_name, last_name, name")
      .eq("id", game.player_of_game)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setPogPlayer(data);
      });
    return () => { cancelled = true; };
  }, [game.status, game.player_of_game]);

  // Backfill player_of_game for final games where it was never calculated
  useEffect(() => {
    if (game.status !== "final" || game.player_of_game) return;
    let cancelled = false;
    const run = async () => {
      const { data: stats } = await supabase
        .from("player_stats")
        .select("*")
        .eq("game_id", game.id);
      if (cancelled || !stats || stats.length === 0) return;

      const pogPlayerId = findPlayerOfGame(stats, game, null);
      if (!pogPlayerId) return;

      await supabase
        .from("games")
        .update({ player_of_game: pogPlayerId })
        .eq("id", game.id);
      if (cancelled) return;

      const { data: player } = await supabase
        .from("players")
        .select("id, first_name, last_name, name")
        .eq("id", pogPlayerId)
        .single();
      if (!cancelled && player) setPogPlayer(player);
    };
    run();
    return () => { cancelled = true; };
  }, [game.id, game.status, game.player_of_game]);

  // Fetch player stats when expanded (final games only)
  const { data: playerStats = [] } = useQuery({
    queryKey: ["player-stats", game.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select(`
          id, player_id, team_id,
          points_2, points_3, free_throws,
          offensive_rebounds, defensive_rebounds,
          assists, steals, blocks, turnovers, fouls,
          unsportsmanlike_fouls, minutes_played,
          player:players(id, first_name, last_name, name, jersey_number)
        `)
        .eq("game_id", game.id);
      if (error) throw error;
      return data;
    },
    enabled: game.status === "final" && isExpanded,
    staleTime: 300000,
  });

  const defaultWinnerTeam = game.is_default_result
    ? teams.find((t) => t.id === game.default_winner_team_id)
    : null;

  const rawHomeStats = playerStats.filter((s) => s.team_id === game.home_team_id);
  const rawAwayStats = playerStats.filter((s) => s.team_id === game.away_team_id);
  const homeStats    = mergeStatsByPlayer(rawHomeStats);
  const awayStats    = mergeStatsByPlayer(rawAwayStats);

  const sumField = (stats, field) => stats.reduce((acc, s) => acc + (s[field] || 0), 0);
  const calcPts  = totalPoints;

  const pogName = pogPlayer
    ? pogPlayer.name || `${pogPlayer.first_name || ""} ${pogPlayer.last_name || ""}`.trim()
    : null;

  const showScore = game.status === "final" || game.status === "live";
  const isLive = game.status === "live";
  const homeWon = showScore && (game.home_score || 0) > (game.away_score || 0);
  const awayWon = showScore && (game.away_score || 0) > (game.home_score || 0);

  const scoreColor = isLive ? "var(--ct-success)" : "var(--ct-text-primary)";

  const renderBoxScore = (stats, team) => {
    if (stats.length === 0) return (
      <p className="text-sm text-center py-4" style={{ color: "var(--ct-text-muted)" }}>No stats recorded</p>
    );

    const sorted = [...stats].sort((a, b) => calcPts(b) - calcPts(a));

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--ct-bg-elevated)" }}>
              {["Player", "PTS", "3PT", "FT", "OREB", "DREB", "REB", "AST", "STL", "BLK", "TO", "F", "UNSPO"].map((h, i) => (
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
            {sorted.map((stat) => {
              const pts  = calcPts(stat);
              const reb  = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
              const name = stat.player
                ? stat.player.name || `${stat.player.first_name || ""} ${stat.player.last_name || ""}`.trim()
                : "Unknown";
              return (
                <tr key={stat.player_id} style={{ borderBottom: "1px solid var(--ct-border)" }}>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: team?.color || "var(--ct-accent)" }}
                      >
                        {stat.player?.jersey_number || "?"}
                      </div>
                      <span className="text-sm" style={{ color: "var(--ct-text-primary)" }}>{name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center font-semibold" style={{ color: "var(--ct-accent)" }}>{pts}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.points_3 || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.free_throws || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.offensive_rebounds || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.defensive_rebounds || 0}</td>
                  <td className="py-2 px-2 text-center font-medium" style={{ color: "var(--ct-text-primary)" }}>{reb}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.assists || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.steals || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.blocks || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.turnovers || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.fouls || 0}</td>
                  <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{stat.unsportsmanlike_fouls || 0}</td>
                </tr>
              );
            })}
            <tr style={{ background: "var(--ct-bg-elevated)", fontWeight: 600 }}>
              <td className="py-2 px-2" style={{ color: "var(--ct-text-primary)" }}>TEAM TOTALS</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-accent)" }}>
                {stats.reduce((acc, s) => acc + totalPoints(s), 0)}
              </td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "points_3")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "free_throws")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "offensive_rebounds")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "defensive_rebounds")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>
                {sumField(stats, "offensive_rebounds") + sumField(stats, "defensive_rebounds")}
              </td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "assists")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "steals")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "blocks")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "turnovers")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "fouls")}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{sumField(stats, "unsportsmanlike_fouls")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ── Mobile card (narrow viewport or admin phone/tablet preview) ──────────
  if (isNarrow) {
    const awayWinnerColor = awayWon ? "var(--ct-text-primary)" : (showScore ? "var(--ct-text-muted)" : "var(--ct-text-primary)");
    const homeWinnerColor = homeWon ? "var(--ct-text-primary)" : (showScore ? "var(--ct-text-muted)" : "var(--ct-text-primary)");
    const awayScoreColor = isLive
      ? "var(--ct-success)"
      : awayWon ? "var(--ct-text-primary)" : "var(--ct-text-muted)";
    const homeScoreColor = isLive
      ? "var(--ct-success)"
      : homeWon ? "var(--ct-text-primary)" : "var(--ct-text-muted)";

    // Build compact meta line: "26 Apr 2026 · 19:00 · Helsinki Ice Hall"
    const metaParts = [];
    if (game.scheduled_at) {
      metaParts.push(format(new Date(game.scheduled_at), "d MMM yyyy"));
      metaParts.push(format(new Date(game.scheduled_at), "HH:mm"));
    }
    if (game.venue) metaParts.push(game.venue);

    const TeamRow = ({ team, score, nameColor, scoreColor, isTBD }) => (
      <div className="flex items-center gap-3 py-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          style={{ backgroundColor: team?.color || "var(--ct-accent)" }}
        >
          {team?.short_name || team?.name?.[0] || "?"}
        </div>
        <span
          className="flex-1 text-sm leading-snug"
          style={{
            color: nameColor,
            fontWeight: (homeWon && team?.id === homeTeam?.id) || (awayWon && team?.id === awayTeam?.id) ? 700 : 500,
            wordBreak: "break-word",
          }}
        >
          {team?.name || "TBD"}
        </span>
        {showScore ? (
          <span className="text-2xl font-bold flex-shrink-0 tabular-nums" style={{ color: scoreColor }}>
            {score}
          </span>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: "var(--ct-text-muted)" }}>
            {isTBD ? "—" : "vs"}
          </span>
        )}
      </div>
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl overflow-hidden mb-3"
        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
      >
        <div className="p-4 flex flex-col gap-3">

          {/* Line 1 — Status + badges + league/date (compact) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {isLive ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--ct-danger)" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ct-danger)" }}>Live</span>
                </span>
              ) : game.status === "final" ? (
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>Final</span>
              ) : game.status === "scheduled" ? (
                game.scheduled_at ? (
                  <span className="text-xs font-semibold" style={{ color: "var(--ct-text-secondary)" }}>
                    {format(new Date(game.scheduled_at), "HH:mm")}
                  </span>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-text-secondary)" }}>Upcoming</span>
                )
              ) : game.status === "cancelled" ? (
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>Cancelled</span>
              ) : game.status === "postponed" ? (
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-accent-gold)" }}>Postponed</span>
              ) : null}

              {game.game_stage && game.game_stage !== "regular" && (
                <Pill bg="rgb(var(--ct-accent-gold-rgb)/0.2)" color="var(--ct-accent-gold)">
                  {STAGE_LABELS[game.game_stage] || game.game_stage}
                </Pill>
              )}
              {game.is_default_result && (
                <Pill bg="rgb(var(--ct-danger-rgb)/0.2)" color="var(--ct-danger)">Default</Pill>
              )}
              {game.entry_type === "manual" && (
                <Pill bg="transparent" color="var(--ct-accent)" border="1px solid var(--ct-accent)">Manual</Pill>
              )}
              {game.edited && (
                <Pill bg="transparent" color="var(--ct-accent-gold)" border="1px solid var(--ct-accent-gold)">Edited</Pill>
              )}
            </div>
            {leagueName && (
              <span className="text-xs truncate max-w-[40%]" style={{ color: "var(--ct-text-muted)" }}>
                {leagueName}
              </span>
            )}
          </div>

          {/* Line 2-3 — Team rows (stacked) */}
          <div>
            <TeamRow
              team={awayTeam}
              score={game.away_score}
              nameColor={awayWinnerColor}
              scoreColor={awayScoreColor}
            />
            <TeamRow
              team={homeTeam}
              score={game.home_score}
              nameColor={homeWinnerColor}
              scoreColor={homeScoreColor}
            />
          </div>

          {/* Line 4 — Compact meta (date · time · venue) */}
          {metaParts.length > 0 && (
            <p className="text-xs" style={{ color: "var(--ct-text-muted)" }}>
              {metaParts.join(" · ")}
            </p>
          )}

          {/* Line 5 — POG (final games only) */}
          {game.status === "final" && pogName && (
            <div className="flex items-center gap-1.5 text-sm">
              <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-accent-gold)" }} />
              <span style={{ color: "var(--ct-text-secondary)" }}>POG:</span>
              <span className="font-semibold truncate" style={{ color: "var(--ct-accent-gold)" }}>{pogName}</span>
            </div>
          )}

          {/* Line 6 — Action buttons */}
          {game.status === "final" && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full rounded-lg"
              style={{
                background: "var(--ct-bg-elevated)",
                color: "var(--ct-text-secondary)",
                border: "none",
                height: 40,
              }}
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              {isExpanded ? "Hide Stats" : "View Stats"}
            </Button>
          )}

          {isLive && (
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/LiveBoxScore?gameId=${game.id}`)}
                className="flex-1 rounded-lg"
                style={{
                  background: "transparent",
                  color: "var(--ct-accent)",
                  border: "1px solid var(--ct-accent)",
                  height: 40,
                }}
              >
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Live Box Score
              </Button>
              <Button
                onClick={onStartGame}
                className="flex-1 rounded-lg"
                style={{ background: "var(--ct-danger)", color: "#ffffff", border: "none", height: 40 }}
              >
                <Play className="w-4 h-4 mr-1.5" />
                Continue
              </Button>
            </div>
          )}

          {canManage && game.status === "scheduled" && (
            <div className="flex gap-2">
              <Button
                onClick={onStartGame}
                className="flex-1 rounded-lg"
                style={{ background: "var(--ct-success)", color: "#ffffff", border: "none", height: 40 }}
              >
                <Play className="w-4 h-4 mr-1.5" />
                Start Game
              </Button>
              <Button
                onClick={() => setShowDefaultDialog(true)}
                className="rounded-lg"
                style={{ background: "var(--ct-bg-elevated)", color: "var(--ct-text-secondary)", border: "none", height: 40, width: 44 }}
                title="Mark default winner"
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowEditSettings(true)}
                className="rounded-lg"
                style={{ background: "var(--ct-bg-elevated)", color: "var(--ct-text-secondary)", border: "none", height: 40, width: 44 }}
                title="Edit game settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Expanded box score (final games only) — reuses desktop render */}
        {isExpanded && game.status === "final" && (
          <div className="px-4 py-4 space-y-6" style={{ borderTop: "1px solid var(--ct-border)", background: "var(--ct-bg-page)" }}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: homeTeam?.color || "var(--ct-accent)" }} />
                <h4 className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>{homeTeam?.name}</h4>
                <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>— {game.home_score} pts</span>
              </div>
              {renderBoxScore(homeStats, homeTeam)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: awayTeam?.color || "var(--ct-accent)" }} />
                <h4 className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>{awayTeam?.name}</h4>
                <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>— {game.away_score} pts</span>
              </div>
              {renderBoxScore(awayStats, awayTeam)}
            </div>
          </div>
        )}

        {/* Dialogs */}
        <EditGameSettingsDialog
          open={showEditSettings}
          onOpenChange={setShowEditSettings}
          game={game}
          onSaved={() => {
            onGameUpdated?.();
            queryClient.invalidateQueries({ queryKey: ["games"] });
          }}
        />
        <DefaultWinnerDialog
          open={showDefaultDialog}
          onOpenChange={setShowDefaultDialog}
          game={game}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onSaved={() => {
            onGameUpdated?.();
            queryClient.invalidateQueries({ queryKey: ["games"] });
          }}
        />
      </motion.div>
    );
  }

  // ── Desktop card (unchanged) ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
    >
      <div className="p-4 sm:p-5 space-y-3">

        {/* Row 1 — Status indicator (time / Final / LIVE) + right-side badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            {isLive ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--ct-danger)" }}
                />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ct-danger)" }}>
                  Live
                </span>
              </span>
            ) : game.status === "scheduled" ? (
              game.scheduled_at ? (
                <span style={{ color: "var(--ct-text-secondary)" }}>
                  {format(new Date(game.scheduled_at), "HH:mm")}
                </span>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-text-secondary)" }}>
                  Scheduled
                </span>
              )
            ) : game.status === "final" ? (
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>
                Final
              </span>
            ) : game.status === "cancelled" ? (
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>
                Cancelled
              </span>
            ) : game.status === "postponed" ? (
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-accent-gold)" }}>
                Postponed
              </span>
            ) : null}

            {leagueName && (
              <span style={{ color: "var(--ct-text-muted)" }} className="text-xs">· {leagueName}</span>
            )}
          </div>

          {/* Right side: secondary badges */}
          <div className="flex gap-1.5 flex-wrap justify-end">
            {game.game_stage && game.game_stage !== "regular" && (
              <Pill bg="rgba(245, 158, 11, 0.2)" color="var(--ct-accent-gold)">
                {STAGE_LABELS[game.game_stage] || game.game_stage}
              </Pill>
            )}
            {game.entry_type === "manual" && (
              <Pill bg="transparent" color="var(--ct-accent)" border="1px solid var(--ct-accent)">Manual</Pill>
            )}
            {game.edited && (
              <Pill bg="transparent" color="var(--ct-accent-gold)" border="1px solid var(--ct-accent-gold)">Edited</Pill>
            )}
            {game.is_default_result && (
              <Pill bg="rgba(239, 68, 68, 0.2)" color="var(--ct-danger)">
                Default — {defaultWinnerTeam?.name || "Winner"}
              </Pill>
            )}
            {game.exclude_from_awards && (
              <Pill bg="rgba(245, 158, 11, 0.2)" color="var(--ct-accent-gold)">No awards</Pill>
            )}
          </div>
        </div>

        {/* Row 2 — Teams + score (away left, score center, home right) */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Away team */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: awayTeam?.color || "var(--ct-accent)" }}
            >
              {awayTeam?.short_name || awayTeam?.name?.[0] || "?"}
            </div>
            <span
              className="text-sm leading-tight truncate"
              style={{
                color: showScore && !awayWon ? "var(--ct-text-muted)" : "var(--ct-text-primary)",
                fontWeight: awayWon ? 700 : 600,
              }}
            >
              {awayTeam?.name || "TBD"}
            </span>
            {showScore && (
              <span
                className="text-2xl sm:text-3xl font-bold ml-auto flex-shrink-0"
                style={{ color: awayWon ? scoreColor : (isLive ? "var(--ct-success)" : "var(--ct-text-secondary)") }}
              >
                {game.away_score}
              </span>
            )}
          </div>

          {/* Center divider */}
          <div className="flex-shrink-0 font-medium text-lg select-none" style={{ color: "var(--ct-text-muted)" }}>
            {showScore ? "—" : "vs"}
          </div>

          {/* Home team */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 flex-row-reverse">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: homeTeam?.color || "var(--ct-accent)" }}
            >
              {homeTeam?.short_name || homeTeam?.name?.[0] || "?"}
            </div>
            <span
              className="text-sm leading-tight truncate text-right"
              style={{
                color: showScore && !homeWon ? "var(--ct-text-muted)" : "var(--ct-text-primary)",
                fontWeight: homeWon ? 700 : 600,
              }}
            >
              {homeTeam?.name || "TBD"}
            </span>
            {showScore && (
              <span
                className="text-2xl sm:text-3xl font-bold mr-auto flex-shrink-0"
                style={{ color: homeWon ? scoreColor : (isLive ? "var(--ct-success)" : "var(--ct-text-secondary)") }}
              >
                {game.home_score}
              </span>
            )}
          </div>
        </div>

        {/* Row 3 — Meta (date + venue) */}
        {(game.scheduled_at || game.venue) && (
          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--ct-text-muted)" }}>
            {game.scheduled_at && (
              <>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(game.scheduled_at), "dd MMM yyyy")}
                </span>
                <span>{format(new Date(game.scheduled_at), "HH:mm")}</span>
              </>
            )}
            {game.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {game.venue}
              </span>
            )}
          </div>
        )}

        {/* Row 4 — POG + Actions */}
        {(game.status === "final" || isLive || (canManage && game.status === "scheduled")) && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 pt-2"
            style={{ borderTop: "1px solid var(--ct-border)" }}
          >
            {/* Left: POG */}
            <div className="flex items-center gap-1.5">
              {game.status === "final" && pogName && (
                <>
                  <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-accent-gold)" }} />
                  <span className="text-xs" style={{ color: "var(--ct-text-secondary)" }}>Player of the Game:</span>
                  <span className="text-xs font-bold" style={{ color: "var(--ct-accent-gold)" }}>{pogName}</span>
                </>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {canManage && game.status === "scheduled" && (
                <>
                  <Button
                    size="sm"
                    onClick={onStartGame}
                    className="h-8"
                    style={{ background: "var(--ct-success)", color: "#ffffff", border: "none" }}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDefaultDialog(true)}
                    className="h-8"
                    style={{ background: "transparent", borderColor: "var(--ct-border)", color: "var(--ct-text-secondary)" }}
                    title="Mark default winner"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditSettings(true)}
                    className="h-8"
                    style={{ background: "transparent", borderColor: "var(--ct-border)", color: "var(--ct-text-secondary)" }}
                    title="Edit game settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}

              {isLive && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/LiveBoxScore?gameId=${game.id}`)}
                    className="h-8"
                    style={{ background: "transparent", borderColor: "var(--ct-accent)", color: "var(--ct-accent)" }}
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1" />
                    Live Box Score
                  </Button>
                  <Button
                    size="sm"
                    onClick={onStartGame}
                    className="h-8"
                    style={{ background: "var(--ct-danger)", color: "#ffffff", border: "none" }}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Continue
                  </Button>
                </>
              )}

              {game.status === "final" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8"
                  style={{ background: "transparent", borderColor: "var(--ct-border)", color: "var(--ct-text-secondary)" }}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  {isExpanded ? "Hide Stats" : "View Stats"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded box score */}
      {isExpanded && game.status === "final" && (
        <div className="px-4 sm:px-5 py-4 space-y-6" style={{ borderTop: "1px solid var(--ct-border)", background: "var(--ct-bg-page)" }}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: homeTeam?.color || "var(--ct-accent)" }}
              />
              <h4 className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>{homeTeam?.name}</h4>
              <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>— {game.home_score} pts</span>
            </div>
            {renderBoxScore(homeStats, homeTeam)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: awayTeam?.color || "var(--ct-accent)" }}
              />
              <h4 className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>{awayTeam?.name}</h4>
              <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>— {game.away_score} pts</span>
            </div>
            {renderBoxScore(awayStats, awayTeam)}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EditGameSettingsDialog
        open={showEditSettings}
        onOpenChange={setShowEditSettings}
        game={game}
        onSaved={() => {
          onGameUpdated?.();
          queryClient.invalidateQueries({ queryKey: ["games"] });
        }}
      />
      <DefaultWinnerDialog
        open={showDefaultDialog}
        onOpenChange={setShowDefaultDialog}
        game={game}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSaved={() => {
          onGameUpdated?.();
          queryClient.invalidateQueries({ queryKey: ["games"] });
        }}
      />
    </motion.div>
  );
}
