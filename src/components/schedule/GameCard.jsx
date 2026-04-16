import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, MapPin, Play, Settings, AlertTriangle, BarChart3, Trophy } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
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

// Inline pill badge — avoids shadcn Badge className conflicts
const Pill = ({ children, className }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
    {children}
  </span>
);

const STAGE_LABELS = {
  quarterfinal: "Quarterfinal",
  semifinal:    "Semifinal",
  championship: "Championship",
  final:        "Grand Final",
};

const ENTRY_TYPE_LABELS = {
  digital: "Digital Entry",
  manual:  "Manual Entry",
};

export default function GameCard({ game, teams, leagueName, canManage, onStartGame, onGameUpdated }) {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
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
  const calcPts  = (s) => (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);

  const pogName = pogPlayer
    ? pogPlayer.name || `${pogPlayer.first_name || ""} ${pogPlayer.last_name || ""}`.trim()
    : null;

  const renderBoxScore = (stats, team) => {
    if (stats.length === 0) return (
      <p className="text-slate-400 text-sm text-center py-4">No stats recorded</p>
    );

    const sorted = [...stats].sort((a, b) => calcPts(b) - calcPts(a));

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="min-w-[140px]">Player</TableHead>
              <TableHead className="text-center">PTS</TableHead>
              <TableHead className="text-center">3PT</TableHead>
              <TableHead className="text-center">FT</TableHead>
              <TableHead className="text-center">OREB</TableHead>
              <TableHead className="text-center">DREB</TableHead>
              <TableHead className="text-center">REB</TableHead>
              <TableHead className="text-center">AST</TableHead>
              <TableHead className="text-center">STL</TableHead>
              <TableHead className="text-center">BLK</TableHead>
              <TableHead className="text-center">TO</TableHead>
              <TableHead className="text-center">F</TableHead>
              <TableHead className="text-center">UNSPO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((stat) => {
              const pts  = calcPts(stat);
              const reb  = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
              const name = stat.player
                ? stat.player.name || `${stat.player.first_name || ""} ${stat.player.last_name || ""}`.trim()
                : "Unknown";
              return (
                <TableRow key={stat.player_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: team?.color || "#f97316" }}
                      >
                        {stat.player?.jersey_number || "?"}
                      </div>
                      <span className="text-sm">{name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{pts}</TableCell>
                  <TableCell className="text-center">{stat.points_3 || 0}</TableCell>
                  <TableCell className="text-center">{stat.free_throws || 0}</TableCell>
                  <TableCell className="text-center">{stat.offensive_rebounds || 0}</TableCell>
                  <TableCell className="text-center">{stat.defensive_rebounds || 0}</TableCell>
                  <TableCell className="text-center font-medium">{reb}</TableCell>
                  <TableCell className="text-center">{stat.assists || 0}</TableCell>
                  <TableCell className="text-center">{stat.steals || 0}</TableCell>
                  <TableCell className="text-center">{stat.blocks || 0}</TableCell>
                  <TableCell className="text-center">{stat.turnovers || 0}</TableCell>
                  <TableCell className="text-center">{stat.fouls || 0}</TableCell>
                  <TableCell className="text-center">{stat.unsportsmanlike_fouls || 0}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-slate-50 font-semibold">
              <TableCell>TEAM TOTALS</TableCell>
              <TableCell className="text-center">
                {sumField(stats, "points_2") * 2 + sumField(stats, "points_3") * 3 + sumField(stats, "free_throws")}
              </TableCell>
              <TableCell className="text-center">{sumField(stats, "points_3")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "free_throws")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "offensive_rebounds")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "defensive_rebounds")}</TableCell>
              <TableCell className="text-center">
                {sumField(stats, "offensive_rebounds") + sumField(stats, "defensive_rebounds")}
              </TableCell>
              <TableCell className="text-center">{sumField(stats, "assists")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "steals")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "blocks")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "turnovers")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "fouls")}</TableCell>
              <TableCell className="text-center">{sumField(stats, "unsportsmanlike_fouls")}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  const showScore = game.status === "final" || game.status === "live";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5 space-y-3">

          {/* Row 1 — Badges */}
          <div className="flex flex-wrap gap-1.5">
            {leagueName && (
              <Pill className="bg-gray-100 text-gray-700">{leagueName}</Pill>
            )}
            {game.game_stage && game.game_stage !== "regular" && (
              <Pill className="bg-amber-100 text-amber-700">
                {STAGE_LABELS[game.game_stage] || game.game_stage}
              </Pill>
            )}
            {game.status === "final" && (
              <Pill className="bg-green-100 text-green-700">Completed</Pill>
            )}
            {game.status === "live" && (
              <Pill className="bg-orange-100 text-orange-700 animate-pulse">Live</Pill>
            )}
            {game.status === "scheduled" && (
              <Pill className="bg-blue-100 text-blue-700">Scheduled</Pill>
            )}
            {game.status === "cancelled" && (
              <Pill className="bg-slate-100 text-slate-600">Cancelled</Pill>
            )}
            {game.status === "postponed" && (
              <Pill className="bg-yellow-100 text-yellow-700">Postponed</Pill>
            )}
            {game.entry_type && (
              <Pill className="bg-cyan-100 text-cyan-700">
                {ENTRY_TYPE_LABELS[game.entry_type] || game.entry_type}
              </Pill>
            )}
            {game.is_default_result && (
              <Pill className="bg-red-100 text-red-700">
                Default — {defaultWinnerTeam?.name || "Winner"}
              </Pill>
            )}
            {game.exclude_from_awards && (
              <Pill className="bg-yellow-100 text-yellow-800">Excluded from Awards</Pill>
            )}
          </div>

          {/* Row 2 — Teams and scores */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Home team */}
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: homeTeam?.color || "#64748b" }}
              >
                {homeTeam?.short_name || homeTeam?.name?.[0] || "?"}
              </div>
              <span className="text-sm font-semibold text-slate-800 leading-tight truncate">
                {homeTeam?.name || "TBD"}
              </span>
              {showScore && (
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 ml-auto shrink-0">
                  {game.home_score}
                </span>
              )}
            </div>

            {/* Center divider */}
            <div className="shrink-0 text-slate-400 font-medium text-lg select-none">
              {showScore ? "—" : "vs"}
            </div>

            {/* Away team */}
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 flex-row-reverse">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: awayTeam?.color || "#64748b" }}
              >
                {awayTeam?.short_name || awayTeam?.name?.[0] || "?"}
              </div>
              <span className="text-sm font-semibold text-slate-800 leading-tight truncate text-right">
                {awayTeam?.name || "TBD"}
              </span>
              {showScore && (
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 mr-auto shrink-0">
                  {game.away_score}
                </span>
              )}
            </div>
          </div>

          {/* Row 3 — Meta info */}
          {(game.scheduled_at || game.venue) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {game.scheduled_at && (
                <>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {format(new Date(game.scheduled_at), "dd MMM yyyy")}
                  </span>
                  <span>{format(new Date(game.scheduled_at), "HH:mm")}</span>
                </>
              )}
              {game.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {game.venue}
                </span>
              )}
            </div>
          )}

          {/* Row 4 — POG + Actions (shown when there's something to display) */}
          {(game.status === "final" || game.status === "live" || (canManage && game.status === "scheduled")) && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">

              {/* Left: Player of the Game */}
              <div className="flex items-center gap-1.5">
                {game.status === "final" && pogName && (
                  <>
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-slate-500">Player of the Game:</span>
                    <span className="text-xs font-bold text-amber-600">{pogName}</span>
                  </>
                )}
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center gap-2 ml-auto">
                {canManage && game.status === "scheduled" && (
                  <>
                    <Button
                      size="sm"
                      onClick={onStartGame}
                      className="bg-green-600 hover:bg-green-700 text-white h-8"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDefaultDialog(true)}
                      className="h-8"
                      title="Mark default winner"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEditSettings(true)}
                      className="h-8"
                      title="Edit game settings"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}

                {game.status === "live" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/LiveBoxScore?gameId=${game.id}`)}
                      className="bg-white border-indigo-300 text-indigo-600 hover:bg-indigo-50 h-8"
                    >
                      <BarChart3 className="w-3.5 h-3.5 mr-1" />
                      View Live Box Score
                    </Button>
                    <Button
                      size="sm"
                      onClick={onStartGame}
                      className="bg-orange-500 hover:bg-orange-600 text-white h-8 shadow-orange-500/40 shadow-md"
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
                    className="h-8 border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1" />
                    {isExpanded ? "Hide Stats" : "View Stats"}
                  </Button>
                )}
              </div>
            </div>
          )}

        </CardContent>

        {/* Expanded box score */}
        {isExpanded && game.status === "final" && (
          <div className="border-t border-slate-100 px-4 sm:px-5 py-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: homeTeam?.color || "#64748b" }} />
                <h4 className="font-semibold text-slate-800">{homeTeam?.name}</h4>
                <span className="text-slate-400 text-sm">— {game.home_score} pts</span>
              </div>
              {renderBoxScore(homeStats, homeTeam)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: awayTeam?.color || "#64748b" }} />
                <h4 className="font-semibold text-slate-800">{awayTeam?.name}</h4>
                <span className="text-slate-400 text-sm">— {game.away_score} pts</span>
              </div>
              {renderBoxScore(awayStats, awayTeam)}
            </div>
          </div>
        )}
      </Card>

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
