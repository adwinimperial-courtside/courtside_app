# Base44 — Total-Points Formula Occurrences

**Generated:** 2026-05-27  
**Archive:** `/tmp/courtside-by-ai`  
**Searches:**
1. All `points_2` occurrences in `.js/.jsx/.ts/.tsx`
2. `isDigital` / `edited` in files containing scoring formulas (within context of `points_2`/`points_3`/`free_throws`)
3. Function names: `calculateTotalPoints` `getTotalPoints` `computePts` `totalPoints` `calculatePts` `calcPoints` `getPlayerPoints` `sumPoints`

Format: `>>>` = matched line, `   ` = context line. Files ordered alphabetically.

---
## src/components/admin/DeleteGameEntry.jsx

       22 |   const deleteGameMutation = useMutation({
       23 |     mutationFn: async (game) => {
       24 |       const user = await base44.auth.me();
       25 |       
       26 |       // Get all stats for this game
       27 |       const gameStats = await base44.entities.PlayerStats.filter({ game_id: game.id });
       28 |       
       29 |       // Calculate team scores from stats
       30 |       const homeScore = gameStats
       31 |         .filter(s => s.team_id === game.home_team_id)
>>>    32 |         .reduce((sum, s) => sum + ((s.points_2 || 0) * 2) + ((s.points_3 || 0) * 3) + (s.free_throws || 0), 0);
       33 |       
       34 |       const awayScore = gameStats
       35 |         .filter(s => s.team_id === game.away_team_id)
>>>    36 |         .reduce((sum, s) => sum + ((s.points_2 || 0) * 2) + ((s.points_3 || 0) * 3) + (s.free_throws || 0), 0);
       37 | 
       38 |       const homeWon = homeScore > awayScore;
       39 |       
       40 |       // Get current team records
       41 |       const homeTeam = teams.find(t => t.id === game.home_team_id);

---

## src/components/admin/EditGameEntry.jsx

       28 |     queryKey: ['editGameStats', selectedGame?.id],
       29 |     queryFn: () => selectedGame ? base44.entities.PlayerStats.filter({ game_id: selectedGame.id }) : Promise.resolve([]),
       30 |     enabled: !!selectedGame,
       31 |   });
       32 | 
       33 |   useEffect(() => {
       34 |     if (existingStats.length > 0 && selectedGame) {
       35 |       const isEdited = selectedGame.edited || selectedGame.entry_type === 'manual';
       36 |       const stats = existingStats.map(stat => {
       37 |         const player = players.find(p => p.id === stat.player_id);
>>>    38 |         const totalPoints = isEdited
>>>    39 |           ? (stat.points_2 || 0) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0)
>>>    40 |           : ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       41 |         return {
       42 |           stat_id: stat.id,
       43 |           player_id: stat.player_id,
       44 |           team_id: stat.team_id,
       45 |           player_name: player?.name,
       46 |           jersey_number: player?.jersey_number,
       47 |           stats: {
>>>    48 |             total_points: totalPoints,
       49 |             points_3: stat.points_3 || 0,
       50 |             free_throws: stat.free_throws || 0,
       51 |             assists: stat.assists || 0,
       52 |             steals: stat.steals || 0,
       53 |             blocks: stat.blocks || 0,

       64 |     }
       65 |   }, [existingStats, players, selectedGame]);
       66 | 
       67 |   const updateGameMutation = useMutation({
       68 |     mutationFn: async (data) => {
       69 |       // Update and create player stats
       70 |       await Promise.all(
       71 |         data.playerStats.map(stat => {
       72 |           const points3Value = (stat.stats.points_3 || 0) * 3;
       73 |           const ftValue = stat.stats.free_throws || 0;
>>>    74 |           const totalPoints = stat.stats.total_points || 0;
       75 |           // Store remaining points directly (no /2) so display is lossless
>>>    76 |           const points2Value = Math.max(0, totalPoints - points3Value - ftValue);
       77 |           
       78 |           // New player (no stat_id)
       79 |           if (!stat.stat_id) {
       80 |             return base44.entities.PlayerStats.create({
       81 |               game_id: data.game.id,
       82 |               player_id: stat.player_id,
       83 |               team_id: stat.team_id,
>>>    84 |               points_2: points2Value,
       85 |               points_3: stat.stats.points_3,
       86 |               free_throws: stat.stats.free_throws,
       87 |               offensive_rebounds: stat.stats.offensive_rebounds,
       88 |               defensive_rebounds: stat.stats.defensive_rebounds,
       89 |               assists: stat.stats.assists,

       91 |               blocks: stat.stats.blocks,
       92 |               turnovers: stat.stats.turnovers,
       93 |               fouls: stat.stats.fouls,
       94 |               technical_fouls: stat.stats.technical_fouls,
       95 |               unsportsmanlike_fouls: stat.stats.unsportsmanlike_fouls,
       96 |             });
       97 |           }
       98 |           
       99 |           // Existing player
      100 |           return base44.entities.PlayerStats.update(stat.stat_id, {
>>>   101 |             points_2: points2Value,
      102 |             points_3: stat.stats.points_3,
      103 |             free_throws: stat.stats.free_throws,
      104 |             offensive_rebounds: stat.stats.offensive_rebounds,
      105 |             defensive_rebounds: stat.stats.defensive_rebounds,
      106 |             assists: stat.stats.assists,

---

## src/components/admin/ManualGameEntry.jsx

       27 |   const [winningTeamId, setWinningTeamId] = useState("");
       28 |   const [confirmationData, setConfirmationData] = useState(null);
       29 | 
       30 |   const homeTeamPlayers = players.filter(p => p.team_id === gameData.home_team_id);
       31 |   const awayTeamPlayers = players.filter(p => p.team_id === gameData.away_team_id);
       32 | 
       33 |   const createGameMutation = useMutation({
       34 |     mutationFn: async (data) => {
       35 |       // Prepare player stats for database
       36 |       const statsForDb = data.playerStats.map(stat => {
>>>    37 |         const totalPoints = stat.stats.total_points || 0;
       38 |         const points3 = stat.stats.points_3 || 0;
       39 |         const ftEntered = stat.stats.free_throws || 0;
>>>    40 |         // points_2 = (total - 3PT*3 - FT*1) / 2
       41 |         // No remainder possible: remaining points after 3PT and FT are always even (2-pointers)
>>>    42 |         const points2Made = Math.max(0, totalPoints - (points3 * 3) - ftEntered);
       43 |         const ftAdjusted = ftEntered;
       44 | 
       45 |         // Check if player has any actual participation
>>>    46 |         const hasStats = totalPoints > 0 || points3 > 0 || ftEntered > 0 ||
       47 |                         stat.stats.assists > 0 || stat.stats.steals > 0 ||
       48 |                         stat.stats.blocks > 0 || stat.stats.offensive_rebounds > 0 || 
       49 |                         stat.stats.defensive_rebounds > 0 || stat.stats.fouls > 0 ||
       50 |                         stat.stats.technical_fouls > 0 || stat.stats.unsportsmanlike_fouls > 0;
       51 |         
       52 |         return {
       53 |           player_id: stat.player_id,
       54 |           team_id: stat.team_id,
       55 |           did_play: hasStats,
>>>    56 |           points_2: points2Made,
       57 |           points_3: points3,
       58 |           free_throws: ftAdjusted,
       59 |           offensive_rebounds: stat.stats.offensive_rebounds,
       60 |           defensive_rebounds: stat.stats.defensive_rebounds,
       61 |           assists: stat.stats.assists,

---

## src/components/admin/StatIntegrityChecker.jsx

        4 | import { Badge } from "@/components/ui/badge";
        5 | import { AlertTriangle, CheckCircle2, RefreshCw, Wrench } from "lucide-react";
        6 | 
        7 | const NON_POINT_STATS = [
        8 |   'offensive_rebounds', 'defensive_rebounds', 'assists',
        9 |   'steals', 'blocks', 'turnovers', 'fouls',
       10 |   'technical_fouls', 'unsportsmanlike_fouls'
       11 | ];
       12 | 
       13 | const STAT_LOG_TYPES = new Set([
>>>    14 |   'points_2', 'points_3', 'free_throws', 'free_throws_missed',
       15 |   'offensive_rebounds', 'defensive_rebounds', 'assists',
       16 |   'steals', 'blocks', 'turnovers', 'fouls',
       17 |   'technical_fouls', 'unsportsmanlike_fouls'
       18 | ]);
       19 | 

       40 |       const flagged = [];
       41 | 
       42 |       for (const game of games) {
       43 |         const [stats, logs] = await Promise.all([
       44 |           base44.entities.PlayerStats.filter({ game_id: game.id }),
       45 |           base44.entities.GameLog.filter({ game_id: game.id }),
       46 |         ]);
       47 | 
       48 |         const homeScore = stats
       49 |           .filter(s => s.team_id === game.home_team_id)
>>>    50 |           .reduce((acc, s) => acc + (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0), 0);
       51 |         const awayScore = stats
       52 |           .filter(s => s.team_id === game.away_team_id)
>>>    53 |           .reduce((acc, s) => acc + (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0), 0);
       54 | 
       55 |         const hasPoints = homeScore > 0 || awayScore > 0;
       56 | 
       57 |         const totalNonPoint = stats.reduce((acc, s) =>
       58 |           acc + NON_POINT_STATS.reduce((a, k) => a + (s[k] || 0), 0), 0);

      115 |         const sums = statSums[stat.player_id];
      116 |         if (!sums) continue;
      117 | 
      118 |         const patch = {};
      119 |         for (const key of NON_POINT_STATS) {
      120 |           if (sums[key] && sums[key] > (stat[key] || 0)) {
      121 |             patch[key] = sums[key];
      122 |           }
      123 |         }
      124 |         // Also patch scoring fields if logs show higher values
>>>   125 |         for (const key of ['points_2', 'points_3', 'free_throws']) {
      126 |           if (sums[key] && sums[key] > (stat[key] || 0)) {
      127 |             patch[key] = sums[key];
      128 |           }
      129 |         }
      130 | 

---

## src/components/live/LiveStatTracker.jsx

        6 | import { ArrowLeft, Trophy, RefreshCw, X, Undo2, Activity, AlertTriangle, Clock, ArrowLeftRight } from "lucide-react";
        7 | import { motion } from "framer-motion";
        8 | import { format } from "date-fns";
        9 | 
       10 | import ScoreHeader from "./ScoreHeader";
       11 | import EndOfPeriodModal from "./EndOfPeriodModal";
       12 | import { findPlayerOfGame } from "../utils/pogCalculator";
       13 | import EmergencyLineupRepair from "./EmergencyLineupRepair";
       14 | 
       15 | const STAT_TYPES = [
>>>    16 |   { key: 'points_2', label: '2PT', points: 2, color: 'bg-blue-600 hover:bg-blue-700' },
       17 |   { key: 'points_3', label: '3PT', points: 3, color: 'bg-purple-600 hover:bg-purple-700' },
       18 |   { key: 'free_throws', label: 'FTM', points: 1, color: 'bg-indigo-600 hover:bg-indigo-700' },
       19 |   { key: 'free_throws_missed', label: 'FTX', points: 0, color: 'bg-indigo-300 hover:bg-indigo-400' },
       20 |   { key: 'offensive_rebounds', label: 'OREB', points: 0, color: 'bg-emerald-500 hover:bg-emerald-600' },
       21 |   { key: 'defensive_rebounds', label: 'DREB', points: 0, color: 'bg-green-600 hover:bg-green-700' },

      392 |   const statCountsAsTeamFoul = (statKey) => {
      393 |     const rules = getGameRules();
      394 |     if (statKey === 'fouls') return rules.countPersonalFoulsAsTeamFoul;
      395 |     if (statKey === 'technical_fouls') return rules.countPlayerTechnicalAsTeamFoul;
      396 |     if (statKey === 'unsportsmanlike_fouls') return rules.countUnsportsmanlikeAsTeamFoul;
      397 |     return false;
      398 |   };
      399 | 
      400 |   const calcTeamScore = (teamId, stats) => stats.reduce((acc, s) => {
      401 |     if (s.team_id !== teamId) return acc;
>>>   402 |     return acc + (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
      403 |   }, 0);
      404 | 
      405 |   const getFoulResetKey = (period) => {
      406 |     const totalPeriods = game.period_count || (game.period_type === 'halves' ? 2 : 4);
      407 |     if (period > totalPeriods) return String(period);

     1032 |         const totalMinutes = Math.round((totalSeconds / 60) * 100) / 100;
     1033 |         return updateStatMutation.mutateAsync({
     1034 |           statId: stat.id,
     1035 |           updates: { minutes_played: totalMinutes }
     1036 |         });
     1037 |       });
     1038 | 
     1039 |       await Promise.all(minuteUpdates);
     1040 | 
     1041 |       console.log('[LiveStat:endgame] Final PlayerStats snapshot:', existingStats.map(s => ({
>>>  1042 |         player_id: s.player_id, pts2: s.points_2, pts3: s.points_3, ft: s.free_throws,
     1043 |         reb: (s.offensive_rebounds||0)+(s.defensive_rebounds||0),
     1044 |         ast: s.assists, stl: s.steals, blk: s.blocks, to: s.turnovers, f: s.fouls
     1045 |       })));
     1046 | 
     1047 |       await base44.entities.Game.update(game.id, { 

     1089 | 
     1090 |   const homeBenchPlayers = players.filter(p => 
     1091 |     p.team_id === game.home_team_id && !activePlayerIds.includes(p.id)
     1092 |   );
     1093 |   const awayBenchPlayers = players.filter(p => 
     1094 |     p.team_id === game.away_team_id && !activePlayerIds.includes(p.id)
     1095 |   );
     1096 | 
     1097 |   const PlayerButton = ({ player, teamColor, onSubClick, isDesktop, side }) => {
     1098 |     const playerStats = existingStats.find(s => s.player_id === player.id);
>>>  1099 |     const totalPoints = ((playerStats?.points_2 || 0) * 2) + ((playerStats?.points_3 || 0) * 3) + (playerStats?.free_throws || 0);
     1100 |     const isSelected = selectedPlayer?.id === player.id;
     1101 | 
     1102 |     const isHome = side === 'home';
     1103 |     const subColor = isHome
     1104 |       ? 'border-blue-400 text-blue-600 hover:bg-blue-50'

     1141 |                 onSubClick(player);
     1142 |               }}
     1143 |             >
     1144 |               <ArrowLeftRight className="w-2 h-2" />
     1145 |               SUB
     1146 |             </button>
     1147 |           </div>
     1148 |           <p className="font-semibold text-slate-900 text-[10px] truncate leading-tight w-full text-center">{player.name}</p>
     1149 |           {playerStats && (
     1150 |             <div className="w-full pt-0.5 border-t border-slate-200">
>>>  1151 |               <p className="text-xs font-bold text-slate-900 text-center leading-none">{totalPoints} <span className="text-[9px] font-normal text-slate-500">PTS</span></p>
     1152 |               <div className="flex justify-around mt-0.5">
     1153 |                 {isDesktop && (
     1154 |                   <>
     1155 |                     <span className="text-[9px] text-slate-500">{(playerStats.offensive_rebounds||0)+(playerStats.defensive_rebounds||0)}R</span>
     1156 |                     <span className="text-[9px] text-slate-500">{playerStats.assists||0}A</span>

     1241 |             </div>
     1242 |           )}
     1243 |         </div>
     1244 | 
     1245 |         <div className={`grid grid-cols-3 gap-1.5 ${large ? 'mb-1' : 'mb-1.5'}`}>
     1246 |           <div className="flex rounded-lg overflow-hidden shadow-md">
     1247 |             <motion.button whileTap={{ scale: selectedPlayer ? 0.92 : 1 }} onClick={() => handleStatClick(STAT_TYPES.find(s => s.key === 'free_throws'))} disabled={!selectedPlayer} className={`flex-1 ${btnH} text-white font-bold text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150`}>FTM</motion.button>
     1248 |             <div className="w-px bg-indigo-900/30" />
     1249 |             <motion.button whileTap={{ scale: selectedPlayer ? 0.92 : 1 }} onClick={() => handleStatClick(STAT_TYPES.find(s => s.key === 'free_throws_missed'))} disabled={!selectedPlayer} className={`flex-1 ${btnH} text-white font-bold text-xs bg-indide-300 hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150`}>FTX</motion.button>
     1250 |           </div>
>>>  1251 |           {['points_2', 'points_3'].map(key => {
     1252 |             const stat = STAT_TYPES.find(s => s.key === key);
     1253 |             return (
     1254 |               <motion.div key={stat.key} whileTap={{ scale: selectedPlayer ? 0.92 : 1 }}>
     1255 |                 <Button onClick={() => handleStatClick(stat)} disabled={!selectedPlayer} className={`w-full ${btnH} text-white font-bold text-sm ${stat.color} disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-all duration-150`}>{stat.label}</Button>
     1256 |               </motion.div>

     1391 |                   <p className="text-slate-500 text-xs">Tap any active player to start tracking</p>
     1392 |                 </div>
     1393 |               )}
     1394 |             </div>
     1395 |             <div className="grid grid-cols-3 gap-1.5 mb-1.5">
     1396 |               <div className="flex rounded-lg overflow-hidden shadow-md">
     1397 |                 <motion.button whileTap={{ scale: selectedPlayer ? 0.92 : 1 }} onClick={() => handleStatClick(STAT_TYPES.find(s => s.key === 'free_throws'))} disabled={!selectedPlayer} className="flex-1 h-10 text-white font-bold text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150">FTM</motion.button>
     1398 |                 <div className="w-px bg-indigo-900/30" />
     1399 |                 <motion.button whileTap={{ scale: selectedPlayer ? 0.92 : 1 }} onClick={() => handleStatClick(STAT_TYPES.find(s => s.key === 'free_throws_missed'))} disabled={!selectedPlayer} className="flex-1 h-10 text-white font-bold text-xs bg-indigo-300 hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150">FTX</motion.button>
     1400 |               </div>
>>>  1401 |               {['points_2', 'points_3'].map(key => { const stat = STAT_TYPES.find(s => s.key === key); return (
     1402 |                 <motion.div key={stat.key} whileTap={{ scale: selectedPlayer ? 0.92 : 1 }}>
     1403 |                   <Button onClick={() => handleStatClick(stat)} disabled={!selectedPlayer} className={`w-full h-10 text-white font-bold text-sm ${stat.color} disabled:opacity-30 disabled:cursor-not-allowed shadow-md`}>{stat.label}</Button>
     1404 |                 </motion.div>
     1405 |               ); })}
     1406 |             </div>

---

## src/components/live/PlayerSelector.jsx

        1 | import React from "react";
        2 | import { motion } from "framer-motion";
        3 | 
        4 | export default function PlayerSelector({ players, existingStats, selectedPlayer, onSelectPlayer, teamColor }) {
        5 |   return (
        6 |     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        7 |       {players.map((player) => {
        8 |         const playerStats = existingStats.find(s => s.player_id === player.id);
>>>     9 |         const totalPoints = ((playerStats?.points_2 || 0) * 2) + ((playerStats?.points_3 || 0) * 3);
       10 |         const isSelected = selectedPlayer?.id === player.id;
       11 | 
       12 |         return (
       13 |           <motion.button
       14 |             key={player.id}

       28 |               >
       29 |                 {player.jersey_number}
       30 |               </div>
       31 |               <div className="text-left flex-1 min-w-0">
       32 |                 <p className="font-semibold text-white text-sm truncate">{player.name}</p>
       33 |                 <p className="text-xs text-slate-400">{player.position}</p>
       34 |               </div>
       35 |             </div>
       36 |             {playerStats && (
       37 |               <div className="flex justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
>>>    38 |                 <span>{totalPoints} PTS</span>
       39 |                 <span>{(playerStats.offensive_rebounds || 0) + (playerStats.defensive_rebounds || 0)} REB</span>
       40 |                 <span>{playerStats.assists || 0} AST</span>
       41 |               </div>
       42 |             )}
       43 |           </motion.button>

---

## src/components/live/ScoreHeader.jsx

       43 | // Foul-reset period key: for quarters each period is its own key; for halves each half is its own key.
       44 | // Overtime periods always get their own key (period number as string).
       45 | function getFoulResetPeriodKey(period, periodType, totalPeriods) {
       46 |   if (period > totalPeriods) return String(period); // each OT is fresh
       47 |   if (periodType === 'halves') return period === 1 ? 'h1' : 'h2';
       48 |   return String(period); // Q1, Q2, Q3, Q4 each unique
       49 | }
       50 | 
       51 | export default function ScoreHeader({ game, homeTeam, awayTeam, onGameUpdate, onEndGame, lineupBlocked = false, playerStats = [] }) {
       52 |   const calcScore = (teamId) => playerStats.reduce((acc, s) =>
>>>    53 |     s.team_id === teamId ? acc + (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0) : acc, 0);
       54 |   const derivedHomeScore = playerStats.length > 0 ? calcScore(game.home_team_id) : (game.home_score || 0);
       55 |   const derivedAwayScore = playerStats.length > 0 ? calcScore(game.away_team_id) : (game.away_score || 0);
       56 |   const [possession, setPossession] = useState(() => game.possession || null);
       57 |   const [showPossessionPicker, setShowPossessionPicker] = useState(false);
       58 |   const [localGame, setLocalGame] = useState(game);

---

## src/components/player/PlayerDashboardCard.jsx

       12 | 
       13 | function didPlayerParticipate(stat) {
       14 |   // Check if player actually participated based on priority:
       15 |   // 1. explicit did_play flag
       16 |   // 2. starter status
       17 |   // 3. minutes_played > 0
       18 |   // 4. any recorded stat or foul > 0
       19 |   if (stat.did_play) return true;
       20 |   if (stat.is_starter) return true;
       21 |   if ((stat.minutes_played || 0) > 0) return true;
>>>    22 |   const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       23 |                    (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       24 |                    (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       25 |                    (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       26 |   return hasStats;
       27 | }
       28 | 
>>>    29 | function calcPoints(stat, games) {
       30 |   const game = games.find(g => g.id === stat.game_id);
       31 |   const isDigital = game && game.entry_type === 'digital' && !game.edited;
>>>    32 |   return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       33 | }
       34 | 
       35 | function computeStats(stats, games) {
       36 |   const participatedStats = stats.filter(didPlayerParticipate);
       37 |   const gp = participatedStats.length;
       38 |   if (gp === 0) return { gp: 0, ppg: null, rpg: null, apg: null };
       39 |   
       40 |   const totals = participatedStats.reduce((acc, s) => ({
>>>    41 |     points: acc.points + calcPoints(s, games),
       42 |     rebounds: acc.rebounds + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0),
       43 |     assists: acc.assists + (s.assists || 0)
       44 |   }), { points: 0, rebounds: 0, assists: 0 });
       45 |   
       46 |   return {

       53 | 
       54 | function getCategoryRank(myPlayerId, allStats, categoryKey) {
       55 |   if (!myPlayerId || !allStats.length) return null;
       56 | 
       57 |   const playerStats = {};
       58 |   allStats.forEach(s => {
       59 |     if (!didPlayerParticipate(s)) return; // Only count participated games
       60 |     if (!playerStats[s.player_id]) playerStats[s.player_id] = { total: 0, gp: 0 };
       61 |     let catValue = 0;
       62 |     if (categoryKey === 'points') {
>>>    63 |       catValue = (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
       64 |     } else if (categoryKey === 'rebounds') {
       65 |       catValue = (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0);
       66 |     } else if (categoryKey === 'assists') {
       67 |       catValue = s.assists || 0;
       68 |     } else if (categoryKey === 'steals') {

      139 | function getHotStreak(stats, games) {
      140 |   if (!stats.length || !games.length) return 0;
      141 |   const sorted = [...games]
      142 |     .filter(g => g.status === 'completed')
      143 |     .sort((a, b) => new Date(b.game_date) - new Date(a.game_date))
      144 |     .slice(0, 5);
      145 |   let streak = 0;
      146 |   for (const game of sorted) {
      147 |     const s = stats.find(st => st.game_id === game.id);
      148 |     if (!s) break;
>>>   149 |     const pts = (s.points_2||0)*2 + (s.points_3||0)*3 + (s.free_throws||0);
      150 |     if (pts >= 15) streak++;
      151 |     else break;
      152 |   }
      153 |   return streak;
      154 | }

---

## src/components/player/PlayerLastGame.jsx

        1 | import React, { useMemo } from "react";
        2 | import { ChevronRight } from "lucide-react";
        3 | import { format } from "date-fns";
        4 | import { useNavigate } from "react-router-dom";
        5 | import { createPageUrl } from "@/utils";
        6 | 
        7 | function didPlayerParticipate(stat) {
>>>     8 |   const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
        9 |                    (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       10 |                    (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       11 |                    (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       12 |   
       13 |   if (stat.did_play) return true;

       56 |           onClick={() => navigate(createPageUrl('Schedule'))}
       57 |           >
       58 |           {(() => {
       59 |             const isHome = lastGame.home_team_id === teamId;
       60 |             const opponentId = isHome ? lastGame.away_team_id : lastGame.home_team_id;
       61 |             const opponent = teams.find(t => t.id === opponentId);
       62 |             const myScore = isHome ? lastGame.home_score : lastGame.away_score;
       63 |             const oppScore = isHome ? lastGame.away_score : lastGame.home_score;
       64 |             const won = myScore > oppScore;
       65 | 
>>>    66 |             const pts = statLine ? (statLine.points_2||0)*2 + (statLine.points_3||0)*3 + (statLine.free_throws||0) : null;
       67 |             const reb = statLine ? (statLine.offensive_rebounds||0) + (statLine.defensive_rebounds||0) : null;
       68 |             const ast = statLine ? statLine.assists || 0 : null;
       69 |             const min = statLine ? Math.round(statLine.minutes_played || 0) : null;
       70 | 
       71 |             return (

---

## src/components/player/PlayerQuickStats.jsx

       12 |   );
       13 | }
       14 | 
       15 | export default function PlayerQuickStats({ stats }) {
       16 |   const computed = useMemo(() => {
       17 |     const gp = stats.length;
       18 |     if (gp === 0) return { gp: 0, ppg: "—", rpg: "—", apg: "—", spg: "—", bpg: "—" };
       19 | 
       20 |     let pts = 0, reb = 0, ast = 0, stl = 0, blk = 0;
       21 |     stats.forEach(s => {
>>>    22 |       pts += (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
       23 |       reb += (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0);
       24 |       ast += s.assists || 0;
       25 |       stl += s.steals || 0;
       26 |       blk += s.blocks || 0;
       27 |     });

---

## src/components/player/PlayerRecognition.jsx

        9 |   leagueTeams.forEach(team => {
       10 |     const tg = completedGames.filter(g => g.home_team_id === team.id || g.away_team_id === team.id);
       11 |     const wins = tg.filter(g => g.home_team_id === team.id ? g.home_score > g.away_score : g.away_score > g.home_score).length;
       12 |     teamStats[team.id] = { gamesPlayed: tg.length, winPct: tg.length > 0 ? wins / tg.length : 0 };
       13 |   });
       14 | 
       15 |   const scores = {};
       16 |   completedGames.forEach(game => {
       17 |     allStats.filter(s => s.game_id === game.id).forEach(s => {
       18 |       if (!scores[s.player_id]) scores[s.player_id] = { gp: 0, sumGis: 0, sumTech: 0, sumUnsp: 0, teamId: s.team_id };
>>>    19 |       const pts = (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
       20 |       const gis = pts + 1.2*(s.offensive_rebounds||0) + 1.0*(s.defensive_rebounds||0) + 1.5*(s.assists||0) + 2.5*(s.steals||0) + 2.0*(s.blocks||0) - 2.0*(s.turnovers||0) - 0.5*(s.fouls||0) - 3.0*(s.technical_fouls||0) - 4.0*(s.unsportsmanlike_fouls||0);
       21 |       scores[s.player_id].gp++;
       22 |       scores[s.player_id].sumGis += gis;
       23 |       scores[s.player_id].sumTech += s.technical_fouls || 0;
       24 |       scores[s.player_id].sumUnsp += s.unsportsmanlike_fouls || 0;

       82 |     const idx = mvpRanking.findIndex(r => r.playerId === matchedPlayerId);
       83 |     return idx >= 0 ? idx + 1 : null;
       84 |   }, [mvpRanking, matchedPlayerId]);
       85 | 
       86 |   const dpoyRank = useMemo(() => {
       87 |     const idx = dpoyRanking.findIndex(r => r.playerId === matchedPlayerId);
       88 |     return idx >= 0 ? idx + 1 : null;
       89 |   }, [dpoyRanking, matchedPlayerId]);
       90 | 
       91 |   const doubleDoubles = useMemo(() => myStats.filter(s => {
>>>    92 |     const pts = (s.points_2||0)*2 + (s.points_3||0)*3 + (s.free_throws||0);
       93 |     const reb = (s.offensive_rebounds||0) + (s.defensive_rebounds||0);
       94 |     return [pts >= 10, reb >= 10, (s.assists||0) >= 10].filter(Boolean).length >= 2;
       95 |   }).length, [myStats]);
       96 | 
       97 |   const twentyPlusGames = useMemo(() => myStats.filter(s => {
>>>    98 |     return (s.points_2||0)*2 + (s.points_3||0)*3 + (s.free_throws||0) >= 20;
       99 |   }).length, [myStats]);
      100 | 
      101 |   const badges = [];
      102 |   if (mvpRank === 1) badges.push({ label: "MVP Leader", color: "bg-yellow-500 text-white" });
      103 |   else if (mvpRank && mvpRank <= 5) badges.push({ label: `Mythical 5 (#${mvpRank})`, color: "bg-purple-500 text-white" });

---

## src/components/player/PlayerTrendCard.jsx

        1 | import React, { useMemo } from "react";
        2 | 
>>>     3 | function getPts(s) { return (s.points_2||0)*2 + (s.points_3||0)*3 + (s.free_throws||0); }
        4 | function getReb(s) { return (s.offensive_rebounds||0) + (s.defensive_rebounds||0); }
        5 | function getAst(s) { return s.assists || 0; }
        6 | function getStl(s) { return s.steals || 0; }
        7 | function getBlk(s) { return s.blocks || 0; }
        8 | 
        9 | function avg(items, fn) {
       10 |   if (!items.length) return 0;
       11 |   return items.reduce((sum, x) => sum + fn(x.stat), 0) / items.length;
       12 | }
       13 | 
       14 | function didPlayerParticipate(stat) {
>>>    15 |   const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       16 |                    (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       17 |                    (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       18 |                    (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       19 |   
       20 |   if (stat.did_play) return true;

---

## src/components/player/badgeCalculator.jsx

        1 | import { BADGE_DEFINITIONS } from "./badgeDefinitions";
        2 | 
        3 | function getPoints(stat) {
>>>     4 |   return (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
        5 | }
        6 | 
        7 | function getRebounds(stat) {
        8 |   return (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
        9 | }

---

## src/components/player/milestoneCalculator.jsx

       21 |     unit: "games",
       22 |   },
       23 |   player_of_game: {
       24 |     name: "Player of the Game Progress",
       25 |     tiers: [1, 3, 5],
       26 |     unit: "awards",
       27 |   },
       28 | };
       29 | 
       30 | function getPoints(stat) {
>>>    31 |   return (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
       32 | }
       33 | 
       34 | function getRebounds(stat) {
       35 |   return (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
       36 | }

---

## src/components/schedule/GameCard.jsx

      123 |   };
      124 | 
      125 |   const entryTypeColors = {
      126 |     manual: "bg-purple-100 text-purple-800",
      127 |     digital: "bg-cyan-100 text-cyan-800"
      128 |   };
      129 | 
      130 |   const editedBadgeColor = "bg-amber-100 text-amber-800";
      131 |   const defaultBadgeColor = "bg-red-100 text-red-800";
      132 | 
>>>   133 |   const calcPoints = (stat) => {
      134 |     if (liveGame.entry_type === 'manual' || liveGame.edited) {
>>>   135 |       return (stat.points_2 || 0) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
      136 |     }
>>>   137 |     return ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
      138 |   };
      139 | 
      140 |   const hasPlayerStats = (stat) => {
>>>   141 |     const points = calcPoints(stat);
      142 |     return points > 0 || (stat.offensive_rebounds || 0) > 0 || (stat.defensive_rebounds || 0) > 0 || 
      143 |            (stat.assists || 0) > 0 || (stat.steals || 0) > 0 || (stat.blocks || 0) > 0 || 
      144 |            (stat.turnovers || 0) > 0 || (stat.fouls || 0) > 0 || (stat.technical_fouls || 0) > 0 || 
      145 |            (stat.unsportsmanlike_fouls || 0) > 0;
      146 |   };
      147 |   
      148 |   const homePlayerStats = gamePlayerStats.filter(s => s.team_id === liveGame.home_team_id && hasPlayerStats(s));
      149 |   const awayPlayerStats = gamePlayerStats.filter(s => s.team_id === liveGame.away_team_id && hasPlayerStats(s));
      150 |   const players = gamePlayers;
      151 | 
      152 |   const calcLiveScore = (teamId, stats) =>
>>>   153 |     stats.reduce((acc, s) => s.team_id === teamId ? acc + (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0) : acc, 0);
      154 | 
      155 |   const displayHomeScore = liveGame.status === 'in_progress'
      156 |     ? calcLiveScore(liveGame.home_team_id, livePlayerStats)
      157 |     : (liveGame.home_score || 0);
      158 |   const displayAwayScore = liveGame.status === 'in_progress'

      371 |                 <div key={team?.id}>
      372 |                   <div className="flex items-center gap-2 mb-3">
      373 |                     <TeamLogo team={team} size="md" />
      374 |                     <h4 className="font-semibold text-slate-900 truncate">{team?.name}</h4>
      375 |                   </div>
      376 | 
      377 |                   {/* Mobile: card per player */}
      378 |                   <div className="block sm:hidden space-y-2">
      379 |                     {playerStats.map(stat => {
      380 |                       const player = players?.find(p => p.id === stat.player_id);
>>>   381 |                       const points = calcPoints(stat);
      382 |                       const rebounds = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
      383 |                       return (
      384 |                         <div key={stat.id} className="bg-slate-50 rounded-lg p-3">
      385 |                           <div className="flex items-center gap-2 mb-2">
      386 |                             <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"

      453 |                           <TableHead className="text-center">BLK</TableHead>
      454 |                           <TableHead className="text-center">TO</TableHead>
      455 |                           <TableHead className="text-center">F</TableHead>
      456 |                           <TableHead className="text-center">TF</TableHead>
      457 |                           <TableHead className="text-center">UNSPO</TableHead>
      458 |                         </TableRow>
      459 |                       </TableHeader>
      460 |                       <TableBody>
      461 |                         {playerStats.map(stat => {
      462 |                           const player = players?.find(p => p.id === stat.player_id);
>>>   463 |                           const points = calcPoints(stat);
      464 |                           const rebounds = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
      465 |                           return (
      466 |                             <TableRow key={stat.id}>
      467 |                               <TableCell>
      468 |                                 <div className="flex items-center gap-2">

---

## src/components/schedule/POGSpotlightModal.jsx

       35 | 
       36 |   const team = allTeams.find(t => t.id === teamId) || teams?.find(t => t.id === teamId) || null;
       37 | 
       38 |   const completedGameIds = useMemo(
       39 |     () => new Set(leagueGames.filter(g => g.status === "completed").map(g => g.id)),
       40 |     [leagueGames]
       41 |   );
       42 | 
       43 |   const didParticipate = (stat) => {
       44 |     const total =
>>>    45 |       (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       46 |       (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       47 |       (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       48 |       (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0);
       49 |     return stat.did_play || (stat.minutes_played || 0) > 0 || total > 0;
       50 |   };

---

## src/components/stats/AwardLeaders.jsx

       16 | import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
       17 | import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
       18 | import { Badge } from "@/components/ui/badge";
       19 | import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
       20 | import { Trophy, Shield } from "lucide-react";
       21 | import MobileAwardCards from "./MobileAwardCards";
       22 | 
       23 | export default function AwardLeaders({ league, teams, games, players, stats, awardSettings }) {
       24 |   const cfg = resolveSettings(awardSettings);
       25 |   const didPlayerParticipate = (stat) => {
>>>    26 |     const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       27 |                      (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       28 |                      (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       29 |                      (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       30 |     
       31 |     if (stat.did_play) return true;

       73 |         
       74 |         if (!playerMvpScores[playerStat.player_id]) {
       75 |           playerMvpScores[playerStat.player_id] = {
       76 |             gp: 0,
       77 |             sumGis: 0,
       78 |             sumTech: 0,
       79 |             sumUnsp: 0,
       80 |             teamId: playerStat.team_id
       81 |           };
       82 |         }
>>>    83 |         // entry_type='digital' and not edited = double points_2; otherwise treat as raw points
       84 |         const isDigital = game.entry_type === 'digital' && !game.edited;
>>>    85 |         const pts = cfg.mvp_pts_weight * ((isDigital ? (playerStat.points_2 || 0) * 2 : (playerStat.points_2 || 0)) + ((playerStat.points_3 || 0) * 3) + (playerStat.free_throws || 0));
       86 |         const gis = pts +
       87 |           cfg.mvp_oreb_weight * (playerStat.offensive_rebounds || 0) +
       88 |           cfg.mvp_dreb_weight * (playerStat.defensive_rebounds || 0) +
       89 |           cfg.mvp_ast_weight * (playerStat.assists || 0) +
       90 |           cfg.mvp_stl_weight * (playerStat.steals || 0) +

---

## src/components/stats/AwardLeadersTop20.jsx

        8 | function isActualPlayedGame(g) {
        9 |   return (
       10 |     g.status === 'completed' &&
       11 |     !g.is_default_result &&
       12 |     g.result_type !== 'default' &&
       13 |     !g.exclude_from_awards
       14 |   );
       15 | }
       16 | 
       17 | function didPlayerParticipate(stat) {
>>>    18 |   const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       19 |                    (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       20 |                    (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       21 |                    (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       22 |   if (stat.did_play) return true;
       23 |   if ((stat.minutes_played || 0) > 0) return true;

       58 | 
       59 |     const playerMvpScores = {};
       60 |     leagueGames.forEach(game => {
       61 |       const gameStats = stats.filter(s => s.game_id === game.id);
       62 |       gameStats.forEach(playerStat => {
       63 |         if (!didPlayerParticipate(playerStat)) return;
       64 |         if (!playerMvpScores[playerStat.player_id]) {
       65 |           playerMvpScores[playerStat.player_id] = { gp: 0, sumGis: 0, sumTech: 0, sumUnsp: 0, teamId: playerStat.team_id };
       66 |         }
       67 |         const isDigital = game.entry_type === 'digital' && !game.edited;
>>>    68 |         const pts = cfg.mvp_pts_weight * ((isDigital ? (playerStat.points_2 || 0) * 2 : (playerStat.points_2 || 0)) + ((playerStat.points_3 || 0) * 3) + (playerStat.free_throws || 0));
       69 |         const gis = pts +
       70 |           cfg.mvp_oreb_weight * (playerStat.offensive_rebounds || 0) +
       71 |           cfg.mvp_dreb_weight * (playerStat.defensive_rebounds || 0) +
       72 |           cfg.mvp_ast_weight * (playerStat.assists || 0) +
       73 |           cfg.mvp_stl_weight * (playerStat.steals || 0) +

---

## src/components/stats/GameStats.jsx

        6 | import { format } from "date-fns";
        7 | 
        8 | export default function GameStats({ games, teams, players, stats }) {
        9 |   const [expandedGame, setExpandedGame] = useState(null);
       10 |   
       11 |   const completedGames = games
       12 |     .filter(g => g.status === 'completed')
       13 |     .sort((a, b) => new Date(b.game_date) - new Date(a.game_date));
       14 | 
       15 |   const hasStats = (stat) => {
>>>    16 |     return (stat.points_2 || 0) > 0 || 
       17 |            (stat.points_3 || 0) > 0 || 
       18 |            (stat.free_throws || 0) > 0 || 
       19 |            (stat.offensive_rebounds || 0) > 0 || 
       20 |            (stat.defensive_rebounds || 0) > 0 || 
       21 |            (stat.assists || 0) > 0 || 

       25 |            (stat.fouls || 0) > 0;
       26 |   };
       27 | 
       28 |   const getTopPerformer = (game) => {
       29 |     if (!game.player_of_game) return null;
       30 |     
       31 |     const playerStat = stats.find(s => s.game_id === game.id && s.player_id === game.player_of_game);
       32 |     if (!playerStat) return null;
       33 | 
       34 |     const player = players.find(p => p.id === game.player_of_game);
>>>    35 |     const points = ((playerStat.points_2 || 0) * 2) + ((playerStat.points_3 || 0) * 3) + (playerStat.free_throws || 0);
       36 |     
       37 |     return { player, stat: playerStat, points };
       38 |   };
       39 | 
       40 |   return (

      232 |                                   <TableHead className="text-center">AST</TableHead>
      233 |                                   <TableHead className="text-center">STL</TableHead>
      234 |                                   <TableHead className="text-center">BLK</TableHead>
      235 |                                   <TableHead className="text-center">TO</TableHead>
      236 |                                   <TableHead className="text-center">FOULS</TableHead>
      237 |                                 </TableRow>
      238 |                               </TableHeader>
      239 |                               <TableBody>
      240 |                                 {awayPlayerStats.map(stat => {
      241 |                                   const player = players.find(p => p.id === stat.player_id);
>>>   242 |                                   const points = ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
      243 |                                   const rebounds = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
      244 |                                   return (
      245 |                                     <TableRow key={stat.id}>
      246 |                                       <TableCell>
      247 |                                         <div className="flex items-center gap-2">
      248 |                                           <div 
      249 |                                             className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
      250 |                                             style={{ backgroundColor: awayTeam?.color || '#f97316' }}
      251 |                                           >
      252 |                                             {player?.jersey_number}
      253 |                                           </div>
      254 |                                           <span className="text-sm">{player?.name}</span>
      255 |                                         </div>
      256 |                                       </TableCell>
      257 |                                       <TableCell className="text-center font-semibold">{points}</TableCell>
>>>   258 |                                       <TableCell className="text-center">{stat.points_2 || 0}</TableCell>
      259 |                                       <TableCell className="text-center">{stat.points_3 || 0}</TableCell>
      260 |                                       <TableCell className="text-center">{stat.free_throws || 0}</TableCell>
      261 |                                       <TableCell className="text-center">{stat.offensive_rebounds || 0}</TableCell>
      262 |                                       <TableCell className="text-center">{stat.defensive_rebounds || 0}</TableCell>
      263 |                                       <TableCell className="text-center">{rebounds}</TableCell>

      265 |                                       <TableCell className="text-center">{stat.steals || 0}</TableCell>
      266 |                                       <TableCell className="text-center">{stat.blocks || 0}</TableCell>
      267 |                                       <TableCell className="text-center">{stat.turnovers || 0}</TableCell>
      268 |                                       <TableCell className="text-center">{stat.fouls || 0}</TableCell>
      269 |                                     </TableRow>
      270 |                                   );
      271 |                                 })}
      272 |                                 <TableRow className="bg-slate-50 font-semibold">
      273 |                                   <TableCell>TEAM TOTALS</TableCell>
      274 |                                   <TableCell className="text-center">{game.away_score || 0}</TableCell>
>>>   275 |                                   <TableCell className="text-center">{awayPlayerStats.reduce((acc, s) => acc + (s.points_2 || 0), 0)}</TableCell>
      276 |                                   <TableCell className="text-center">{awayPlayerStats.reduce((acc, s) => acc + (s.points_3 || 0), 0)}</TableCell>
      277 |                                   <TableCell className="text-center">{awayPlayerStats.reduce((acc, s) => acc + (s.free_throws || 0), 0)}</TableCell>
      278 |                                   <TableCell className="text-center">{awayPlayerStats.reduce((acc, s) => acc + (s.offensive_rebounds || 0), 0)}</TableCell>
      279 |                                   <TableCell className="text-center">{awayPlayerStats.reduce((acc, s) => acc + (s.defensive_rebounds || 0), 0)}</TableCell>
      280 |                                   <TableCell className="text-center">{awayTeamStats.rebounds}</TableCell>

      319 |                                   <TableHead className="text-center">AST</TableHead>
      320 |                                   <TableHead className="text-center">STL</TableHead>
      321 |                                   <TableHead className="text-center">BLK</TableHead>
      322 |                                   <TableHead className="text-center">TO</TableHead>
      323 |                                   <TableHead className="text-center">FOULS</TableHead>
      324 |                                 </TableRow>
      325 |                               </TableHeader>
      326 |                               <TableBody>
      327 |                                 {homePlayerStats.map(stat => {
      328 |                                   const player = players.find(p => p.id === stat.player_id);
>>>   329 |                                   const points = ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
      330 |                                   const rebounds = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
      331 |                                   return (
      332 |                                     <TableRow key={stat.id}>
      333 |                                       <TableCell>
      334 |                                         <div className="flex items-center gap-2">
      335 |                                           <div 
      336 |                                             className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
      337 |                                             style={{ backgroundColor: homeTeam?.color || '#f97316' }}
      338 |                                           >
      339 |                                             {player?.jersey_number}
      340 |                                           </div>
      341 |                                           <span className="text-sm">{player?.name}</span>
      342 |                                         </div>
      343 |                                       </TableCell>
      344 |                                       <TableCell className="text-center font-semibold">{points}</TableCell>
>>>   345 |                                       <TableCell className="text-center">{stat.points_2 || 0}</TableCell>
      346 |                                       <TableCell className="text-center">{stat.points_3 || 0}</TableCell>
      347 |                                       <TableCell className="text-center">{stat.free_throws || 0}</TableCell>
      348 |                                       <TableCell className="text-center">{stat.offensive_rebounds || 0}</TableCell>
      349 |                                       <TableCell className="text-center">{stat.defensive_rebounds || 0}</TableCell>
      350 |                                       <TableCell className="text-center">{rebounds}</TableCell>

      352 |                                       <TableCell className="text-center">{stat.steals || 0}</TableCell>
      353 |                                       <TableCell className="text-center">{stat.blocks || 0}</TableCell>
      354 |                                       <TableCell className="text-center">{stat.turnovers || 0}</TableCell>
      355 |                                       <TableCell className="text-center">{stat.fouls || 0}</TableCell>
      356 |                                     </TableRow>
      357 |                                   );
      358 |                                 })}
      359 |                                 <TableRow className="bg-slate-50 font-semibold">
      360 |                                   <TableCell>TEAM TOTALS</TableCell>
      361 |                                   <TableCell className="text-center">{game.home_score || 0}</TableCell>
>>>   362 |                                   <TableCell className="text-center">{homePlayerStats.reduce((acc, s) => acc + (s.points_2 || 0), 0)}</TableCell>
      363 |                                   <TableCell className="text-center">{homePlayerStats.reduce((acc, s) => acc + (s.points_3 || 0), 0)}</TableCell>
      364 |                                   <TableCell className="text-center">{homePlayerStats.reduce((acc, s) => acc + (s.free_throws || 0), 0)}</TableCell>
      365 |                                   <TableCell className="text-center">{homePlayerStats.reduce((acc, s) => acc + (s.offensive_rebounds || 0), 0)}</TableCell>
      366 |                                   <TableCell className="text-center">{homePlayerStats.reduce((acc, s) => acc + (s.defensive_rebounds || 0), 0)}</TableCell>
      367 |                                   <TableCell className="text-center">{homeTeamStats.rebounds}</TableCell>

---

## src/components/stats/LeagueLeaders.jsx

        1 | import React from "react";
        2 | import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
        3 | import { Award } from "lucide-react";
        4 | 
        5 | export default function LeagueLeaders({ players, teams, stats, games = [] }) {
>>>     6 |   const calcPoints = (stat) => {
        7 |     const game = games.find(g => g.id === stat.game_id);
        8 |     const isDigital = game && game.entry_type === 'digital' && !game.edited;
>>>     9 |     return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       10 |   };
       11 |   const didPlayerParticipate = (stat) => {
>>>    12 |     const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       13 |                      (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       14 |                      (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       15 |                      (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       16 |     
       17 |     if (stat.did_play) return true;

       42 |   const playerAggregates = players.map(player => {
       43 |     const playerStats = stats.filter(s => s.player_id === player.id && validGameIds.has(s.game_id));
       44 |     const participatedStats = playerStats.filter(didPlayerParticipate);
       45 |     // Cap GP by team's actual game count
       46 |     const teamMaxGames = teamGameCounts[player.team_id] || 0;
       47 |     const team = teams.find(t => t.id === player.team_id);
       48 |     const gamesPlayed = Math.min(participatedStats.length, teamMaxGames);
       49 |     const teamGames = teamMaxGames;
       50 |     
       51 |     const totals = participatedStats.reduce((acc, stat) => ({
>>>    52 |       points: acc.points + calcPoints(stat),
       53 |       threes: acc.threes + (stat.points_3 || 0),
       54 |       rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
       55 |       assists: acc.assists + (stat.assists || 0),
       56 |       steals: acc.steals + (stat.steals || 0),
       57 |       blocks: acc.blocks + (stat.blocks || 0),

---

## src/components/stats/PlayerStats.jsx

       11 |     g.result_type !== 'default' &&
       12 |     !g.exclude_from_player_stats &&
       13 |     !g.exclude_from_awards
       14 |   );
       15 | }
       16 | 
       17 | export default function PlayerStats({ players, teams, stats, games = [] }) {
       18 |   // Build a set of valid game IDs — defaults are never included
       19 |   const validGameIds = new Set(games.filter(isActualPlayedGame).map(g => g.id));
       20 | 
>>>    21 |   const calcPoints = (stat) => {
       22 |     const game = games.find(g => g.id === stat.game_id);
       23 |     const isDigital = game && game.entry_type === 'digital' && !game.edited;
>>>    24 |     return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       25 |   };
       26 |   const [sortField, setSortField] = useState("points");
       27 |   const [sortDirection, setSortDirection] = useState("desc");
       28 | 
       29 |   const didPlayerParticipate = (stat) => {
>>>    30 |     const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       31 |                      (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       32 |                      (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       33 |                      (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       34 |     
       35 |     if (stat.did_play) return true;

       46 |     ).length;
       47 |   });
       48 | 
       49 |   const playerAggregates = players.map(player => {
       50 |     // Only count stats from actual played games
       51 |     const playerStats = stats.filter(s => s.player_id === player.id && validGameIds.has(s.game_id));
       52 |     const participatedStats = playerStats.filter(didPlayerParticipate);
       53 |     const team = teams.find(t => t.id === player.team_id);
       54 |     
       55 |     const totals = participatedStats.reduce((acc, stat) => ({
>>>    56 |       points: acc.points + calcPoints(stat),
>>>    57 |       points_2: acc.points_2 + (stat.points_2 || 0),
       58 |       points_3: acc.points_3 + (stat.points_3 || 0),
       59 |       freeThrows: acc.freeThrows + (stat.free_throws || 0),
       60 |       offensiveRebounds: acc.offensiveRebounds + (stat.offensive_rebounds || 0),
       61 |       defensiveRebounds: acc.defensiveRebounds + (stat.defensive_rebounds || 0),
       62 |       rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
       63 |       assists: acc.assists + (stat.assists || 0),
       64 |       steals: acc.steals + (stat.steals || 0),
       65 |       blocks: acc.blocks + (stat.blocks || 0),
       66 |       turnovers: acc.turnovers + (stat.turnovers || 0),
       67 |       fouls: acc.fouls + (stat.fouls || 0),
       68 |       games: acc.games + 1
>>>    69 |     }), { points: 0, points_2: 0, points_3: 0, freeThrows: 0, offensiveRebounds: 0, defensiveRebounds: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, games: 0 });
       70 | 
       71 |     // Cap GP by team's actual game count (consistent with standings)
       72 |     const teamMaxGames = teamGameCounts[player.team_id] || totals.games;
       73 |     const gp = Math.min(totals.games, teamMaxGames);
       74 | 
       75 |     return {
       76 |       ...player,
       77 |       team,
       78 |       ...totals,
       79 |       games: gp,
       80 |       ppg: gp > 0 ? (totals.points / gp).toFixed(1) : '0.0',
>>>    81 |       twopm: gp > 0 ? (totals.points_2 / gp).toFixed(1) : '0.0',
       82 |       threepm: gp > 0 ? (totals.points_3 / gp).toFixed(1) : '0.0',
       83 |       ftm: gp > 0 ? (totals.freeThrows / gp).toFixed(1) : '0.0',
       84 |       orebpg: gp > 0 ? (totals.offensiveRebounds / gp).toFixed(1) : '0.0',
       85 |       drebpg: gp > 0 ? (totals.defensiveRebounds / gp).toFixed(1) : '0.0',
       86 |       rpg: gp > 0 ? (totals.rebounds / gp).toFixed(1) : '0.0',

---

## src/components/stats/TeamStats.jsx

        8 |   const [sortField, setSortField] = useState("ppg");
        9 |   const [sortDirection, setSortDirection] = useState("desc");
       10 |   const teamStatistics = teams.map(team => {
       11 |     const teamGames = games.filter(g => 
       12 |       g.status === 'completed' && (g.home_team_id === team.id || g.away_team_id === team.id)
       13 |     );
       14 | 
       15 |     const teamStats = stats.filter(s => s.team_id === team.id);
       16 |     
       17 |     const totals = teamStats.reduce((acc, stat) => ({
>>>    18 |       points: acc.points + ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0),
       19 |       offensiveRebounds: acc.offensiveRebounds + (stat.offensive_rebounds || 0),
       20 |       defensiveRebounds: acc.defensiveRebounds + (stat.defensive_rebounds || 0),
       21 |       rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
       22 |       assists: acc.assists + (stat.assists || 0),
       23 |       steals: acc.steals + (stat.steals || 0),

---

## src/components/stats/mobile/MobileGameStats.jsx

        4 | import { format } from "date-fns";
        5 | 
        6 | export default function MobileGameStats({ games, teams, players, stats }) {
        7 |   const [expandedGame, setExpandedGame] = useState(null);
        8 | 
        9 |   const completedGames = games
       10 |     .filter(g => g.status === 'completed')
       11 |     .sort((a, b) => new Date(b.game_date) - new Date(a.game_date));
       12 | 
       13 |   const hasStats = (stat) =>
>>>    14 |     (stat.points_2 || 0) > 0 || (stat.points_3 || 0) > 0 || (stat.free_throws || 0) > 0 ||
       15 |     (stat.offensive_rebounds || 0) > 0 || (stat.defensive_rebounds || 0) > 0 ||
       16 |     (stat.assists || 0) > 0 || (stat.steals || 0) > 0 || (stat.blocks || 0) > 0 ||
       17 |     (stat.turnovers || 0) > 0 || (stat.fouls || 0) > 0;
       18 | 
       19 |   const getTopPerformer = (game) => {
       20 |     if (!game.player_of_game) return null;
       21 |     const playerStat = stats.find(s => s.game_id === game.id && s.player_id === game.player_of_game);
       22 |     if (!playerStat) return null;
       23 |     const player = players.find(p => p.id === game.player_of_game);
>>>    24 |     const points = ((playerStat.points_2 || 0) * 2) + ((playerStat.points_3 || 0) * 3) + (playerStat.free_throws || 0);
       25 |     return { player, stat: playerStat, points };
       26 |   };
       27 | 
       28 |   if (completedGames.length === 0) {
       29 |     return <p className="text-slate-500 text-center py-8">No completed games yet</p>;

       57 |                 {team?.name?.[0]}
       58 |               </div>
       59 |             )}
       60 |             <p className="text-xs font-semibold text-slate-700 text-center max-w-[70px] truncate">{team?.name}</p>
       61 |             <p className="text-2xl font-extrabold text-slate-900">{score || 0}</p>
       62 |           </div>
       63 |         );
       64 | 
       65 |         const PlayerRow = ({ stat, team }) => {
       66 |           const player = players.find(p => p.id === stat.player_id);
>>>    67 |           const pts = ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       68 |           const reb = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
       69 |           return (
       70 |             <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
       71 |               <div
       72 |                 className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"

---

## src/components/stats/mobile/MobileLeagueLeaders.jsx

        1 | import React from "react";
        2 | import { Card, CardContent } from "@/components/ui/card";
        3 | 
        4 | export default function MobileLeagueLeaders({ players, teams, stats, games = [] }) {
>>>     5 |   const calcPoints = (stat) => {
        6 |     const game = games.find(g => g.id === stat.game_id);
        7 |     const isDigital = game && game.entry_type === 'digital' && !game.edited;
>>>     8 |     return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
        9 |   };
       10 | 
       11 |   const didPlayerParticipate = (stat) => {
>>>    12 |     const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       13 |                      (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       14 |                      (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       15 |                      (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       16 |     if (stat.did_play) return true;
       17 |     if ((stat.minutes_played || 0) > 0) return true;

       38 |     teamGameCounts[g.away_team_id] = (teamGameCounts[g.away_team_id] || 0) + 1;
       39 |   });
       40 | 
       41 |   const playerAggregates = players.map(player => {
       42 |     const playerStats = stats.filter(s => s.player_id === player.id && validGameIds.has(s.game_id)).filter(didPlayerParticipate);
       43 |     const team = teams.find(t => t.id === player.team_id);
       44 |     const teamMaxGames = teamGameCounts[player.team_id] || 0;
       45 |     const gamesPlayed = Math.min(playerStats.length, teamMaxGames);
       46 | 
       47 |     const totals = playerStats.reduce((acc, stat) => ({
>>>    48 |       points: acc.points + calcPoints(stat),
       49 |       threes: acc.threes + (stat.points_3 || 0),
       50 |       rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
       51 |       assists: acc.assists + (stat.assists || 0),
       52 |       steals: acc.steals + (stat.steals || 0),
       53 |       blocks: acc.blocks + (stat.blocks || 0),

---

## src/components/stats/mobile/MobilePlayerStats.jsx

       10 |     g.result_type !== 'default' &&
       11 |     !g.exclude_from_player_stats &&
       12 |     !g.exclude_from_awards
       13 |   );
       14 | }
       15 | 
       16 | export default function MobilePlayerStats({ players, teams, stats, games = [] }) {
       17 |   // Build a set of valid game IDs — defaults are never included
       18 |   const validGameIds = new Set(games.filter(isActualPlayedGame).map(g => g.id));
       19 | 
>>>    20 |   const calcPoints = (stat) => {
       21 |     const game = games.find(g => g.id === stat.game_id);
       22 |     const isDigital = game && game.entry_type === 'digital' && !game.edited;
>>>    23 |     return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       24 |   };
       25 | 
       26 |   const didPlayerParticipate = (stat) => {
>>>    27 |     const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       28 |                      (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       29 |                      (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       30 |                      (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
       31 |     if (stat.did_play) return true;
       32 |     if ((stat.minutes_played || 0) > 0) return true;

       45 |   });
       46 | 
       47 |   const playerAggregates = players.map(player => {
       48 |     // Only count stats from actual played games
       49 |     const playerStats = stats
       50 |       .filter(s => s.player_id === player.id && validGameIds.has(s.game_id))
       51 |       .filter(didPlayerParticipate);
       52 |     const team = teams.find(t => t.id === player.team_id);
       53 | 
       54 |     const totals = playerStats.reduce((acc, stat) => ({
>>>    55 |       points: acc.points + calcPoints(stat),
>>>    56 |       points_2: acc.points_2 + (stat.points_2 || 0),
       57 |       points_3: acc.points_3 + (stat.points_3 || 0),
       58 |       freeThrows: acc.freeThrows + (stat.free_throws || 0),
       59 |       offensiveRebounds: acc.offensiveRebounds + (stat.offensive_rebounds || 0),
       60 |       defensiveRebounds: acc.defensiveRebounds + (stat.defensive_rebounds || 0),
       61 |       rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
       62 |       assists: acc.assists + (stat.assists || 0),
       63 |       steals: acc.steals + (stat.steals || 0),
       64 |       blocks: acc.blocks + (stat.blocks || 0),
       65 |       turnovers: acc.turnovers + (stat.turnovers || 0),
       66 |       games: acc.games + 1
>>>    67 |     }), { points: 0, points_2: 0, points_3: 0, freeThrows: 0, offensiveRebounds: 0, defensiveRebounds: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, games: 0 });
       68 | 
       69 |     // Cap GP by team's actual game count (consistent with standings)
       70 |     const teamMaxGames = teamGameCounts[player.team_id] || totals.games;
       71 |     const gp = Math.min(totals.games, teamMaxGames);
       72 |     return {
       73 |       ...player,
       74 |       team,
       75 |       gp,
       76 |       ppg: gp > 0 ? (totals.points / gp).toFixed(1) : '0.0',
>>>    77 |       twopm: gp > 0 ? (totals.points_2 / gp).toFixed(1) : '0.0',
       78 |       threepm: gp > 0 ? (totals.points_3 / gp).toFixed(1) : '0.0',
       79 |       ftm: gp > 0 ? (totals.freeThrows / gp).toFixed(1) : '0.0',
       80 |       rpg: gp > 0 ? (totals.rebounds / gp).toFixed(1) : '0.0',
       81 |       apg: gp > 0 ? (totals.assists / gp).toFixed(1) : '0.0',
       82 |       orebpg: gp > 0 ? (totals.offensiveRebounds / gp).toFixed(1) : '0.0',

---

## src/components/stats/mobile/MobileTeamStats.jsx

        4 | import TeamLogo from "../../teams/TeamLogo";
        5 | 
        6 | export default function MobileTeamStats({ teams, games, stats }) {
        7 |   const teamStatistics = teams.map(team => {
        8 |     const teamGames = games.filter(g =>
        9 |       g.status === 'completed' && (g.home_team_id === team.id || g.away_team_id === team.id)
       10 |     );
       11 |     const teamStats = stats.filter(s => s.team_id === team.id);
       12 | 
       13 |     const totals = teamStats.reduce((acc, stat) => ({
>>>    14 |       points: acc.points + ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0),
       15 |       offensiveRebounds: acc.offensiveRebounds + (stat.offensive_rebounds || 0),
       16 |       defensiveRebounds: acc.defensiveRebounds + (stat.defensive_rebounds || 0),
       17 |       rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
       18 |       assists: acc.assists + (stat.assists || 0),
       19 |       steals: acc.steals + (stat.steals || 0),

---

## src/components/utils/pogCalculator.jsx

        1 | import { resolveSettings } from "@/utils/awardDefaults";
        2 | 
        3 | /**
        4 |  * Calculate Player of the Game score based on stats
        5 |  * Accepts optional awardSettings to use league-specific weights.
>>>     6 |  * Points are always calculated as: points_2*2 + points_3*3 + free_throws
        7 |  * (consistent with how season award calculations treat digital/non-edited games).
        8 |  */
        9 | export function calculatePOGScore(stats, awardSettings, game) {
       10 |   const cfg = resolveSettings(awardSettings);
>>>    11 |   // Always use full point value (points_2 * 2) — same as digital entry season calculation
       12 |   const isDigital = game ? (game.entry_type === 'digital' && !game.edited) : true;
>>>    13 |   const totalPoints = cfg.pog_pts_weight * (
>>>    14 |     (isDigital ? (stats.points_2 || 0) * 2 : (stats.points_2 || 0)) +
       15 |     (stats.points_3 || 0) * 3 +
       16 |     (stats.free_throws || 0)
       17 |   );
       18 |   
       19 |   const score = 
>>>    20 |     totalPoints +
       21 |     cfg.pog_oreb_weight * (stats.offensive_rebounds || 0) +
       22 |     cfg.pog_dreb_weight * (stats.defensive_rebounds || 0) +
       23 |     cfg.pog_ast_weight * (stats.assists || 0) +
       24 |     cfg.pog_stl_weight * (stats.steals || 0) +
       25 |     cfg.pog_blk_weight * (stats.blocks || 0) -

---

## src/pages/AdminTools.jsx

       92 | 
       93 |       let updatedCount = 0;
       94 | 
       95 |       for (const game of games) {
       96 |         // Get stats for this game
       97 |         const gameStats = stats.filter(s => s.game_id === game.id);
       98 |         
       99 |         // Calculate scores
      100 |         const homeScore = gameStats
      101 |           .filter(s => s.team_id === game.home_team_id)
>>>   102 |           .reduce((sum, s) => sum + ((s.points_2 || 0) * 2) + ((s.points_3 || 0) * 3) + (s.free_throws || 0), 0);
      103 |         
      104 |         const awayScore = gameStats
      105 |           .filter(s => s.team_id === game.away_team_id)
>>>   106 |           .reduce((sum, s) => sum + ((s.points_2 || 0) * 2) + ((s.points_3 || 0) * 3) + (s.free_throws || 0), 0);
      107 | 
      108 |         // Update if scores don't match
      109 |         if (game.home_score !== homeScore || game.away_score !== awayScore) {
      110 |           await base44.entities.Game.update(game.id, {
      111 |             home_score: homeScore,

---

## src/pages/CoachInsights.jsx

      104 |     );
      105 | 
      106 |     const losses = teamGames.filter(g =>
      107 |       (g.home_team_id === selectedTeam && g.home_score < g.away_score) ||
      108 |       (g.away_team_id === selectedTeam && g.away_score < g.home_score)
      109 |     );
      110 | 
      111 |     const calculateGameStats = (gameList) => {
      112 |       if (gameList.length === 0) return { points: 0, assists: 0, reboundMargin: 0, turnovers: 0 };
      113 | 
>>>   114 |       let totalPoints = 0, totalAssists = 0, totalRebounds = 0, totalOppRebounds = 0, totalTurnovers = 0;
      115 | 
      116 |       gameList.forEach(game => {
      117 |         const isHome = game.home_team_id === selectedTeam;
      118 |         const teamScore = isHome ? game.home_score : game.away_score;
      119 |         const gameStats = playerStats.filter(s => s.game_id === game.id && s.team_id === selectedTeam);
      120 |         const oppStats = playerStats.filter(s => s.game_id === game.id && s.team_id !== selectedTeam);
      121 | 
>>>   122 |         totalPoints += teamScore;
      123 |         totalAssists += gameStats.reduce((sum, s) => sum + (s.assists || 0), 0);
      124 |         totalRebounds += gameStats.reduce((sum, s) => sum + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      125 |         totalOppRebounds += oppStats.reduce((sum, s) => sum + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      126 |         if (!excludeTurnovers) {
      127 |           totalTurnovers += gameStats.reduce((sum, s) => sum + (s.turnovers || 0), 0);
      128 |         }
      129 |       });
      130 | 
      131 |       return {
>>>   132 |         points: (totalPoints / gameList.length).toFixed(1),
      133 |         assists: (totalAssists / gameList.length).toFixed(1),
      134 |         reboundMargin: ((totalRebounds - totalOppRebounds) / gameList.length).toFixed(1),
      135 |         turnovers: excludeTurnovers ? null : (totalTurnovers / gameList.length).toFixed(1),
      136 |       };
      137 |     };

      167 |   const opponentSnapshot = useMemo(() => {
      168 |     if (!selectedOpponent) return null;
      169 | 
      170 |     const oppGames = games.filter(g =>
      171 |       g.status === 'completed' &&
      172 |       (g.home_team_id === selectedOpponent || g.away_team_id === selectedOpponent)
      173 |     );
      174 | 
      175 |     if (oppGames.length === 0) return null;
      176 | 
>>>   177 |     let totalPoints = 0, totalRebounds = 0, totalTurnovers = 0;
      178 | 
      179 |     oppGames.forEach(game => {
      180 |       const isHome = game.home_team_id === selectedOpponent;
>>>   181 |       totalPoints += isHome ? game.home_score : game.away_score;
      182 | 
      183 |       const gameStats = playerStats.filter(s => s.game_id === game.id && s.team_id === selectedOpponent);
      184 |       totalRebounds += gameStats.reduce((sum, s) => sum + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      185 |       if (!excludeTurnovers) {
      186 |         totalTurnovers += gameStats.reduce((sum, s) => sum + (s.turnovers || 0), 0);
      187 |       }
      188 |     });
      189 | 
      190 |     const oppPlayers = players.filter(p => p.team_id === selectedOpponent);
      191 |     const playerAverages = oppPlayers.map(player => {
      192 |       const pStats = playerStats.filter(s => s.player_id === player.id);
      193 |       const gamesPlayed = pStats.length;
      194 | 
      195 |       if (gamesPlayed === 0) return null;
      196 | 
>>>   197 |       const totalPts = pStats.reduce((sum, s) => sum + ((s.points_2 || 0) * 2) + ((s.points_3 || 0) * 3) + (s.free_throws || 0), 0);
      198 |       const defensiveScore = pStats.reduce((sum, s) => sum + (s.steals || 0) + (s.blocks || 0), 0);
      199 | 
      200 |       return {
      201 |         id: player.id,
      202 |         name: player.name,
      203 |         ppg: (totalPts / gamesPlayed).toFixed(1),
      204 |         defensiveScore: (defensiveScore / gamesPlayed).toFixed(1),
      205 |       };
      206 |     }).filter(Boolean);
      207 | 
      208 |     const topScorer = playerAverages.sort((a, b) => parseFloat(b.ppg) - parseFloat(a.ppg))[0];
      209 |     const topDefender = playerAverages.sort((a, b) => parseFloat(b.defensiveScore) - parseFloat(a.defensiveScore))[0];
      210 | 
      211 |     return {
>>>   212 |       avgPoints: (totalPoints / oppGames.length).toFixed(1),
      213 |       avgRebounds: (totalRebounds / oppGames.length).toFixed(1),
      214 |       avgTurnovers: excludeTurnovers ? null : (totalTurnovers / oppGames.length).toFixed(1),
      215 |       topScorer: topScorer || null,
      216 |       topDefender: topDefender || null,
      217 |     };

      222 |     if (!selectedTeam) return [];
      223 | 
      224 |     const teamPlayers = players.filter(p => p.team_id === selectedTeam);
      225 | 
      226 |     return teamPlayers.map(player => {
      227 |       const pStats = playerStats.filter(s => s.player_id === player.id);
      228 |       const gamesPlayed = pStats.length;
      229 | 
      230 |       if (gamesPlayed === 0) return null;
      231 | 
>>>   232 |       const totalPts = pStats.reduce((sum, s) => sum + ((s.points_2 || 0) * 2) + ((s.points_3 || 0) * 3) + (s.free_throws || 0), 0);
      233 |       const totalReb = pStats.reduce((sum, s) => sum + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      234 |       const totalAst = pStats.reduce((sum, s) => sum + (s.assists || 0), 0);
      235 |       const totalStl = pStats.reduce((sum, s) => sum + (s.steals || 0), 0);
      236 |       const totalBlk = pStats.reduce((sum, s) => sum + (s.blocks || 0), 0);
      237 |       const totalFouls = pStats.reduce((sum, s) => sum + (s.fouls || 0), 0);

      269 |       case 'assists': return sorted.sort((a, b) => parseFloat(b.apg) - parseFloat(a.apg));
      270 |       case 'rebounds': return sorted.sort((a, b) => parseFloat(b.rpg) - parseFloat(a.rpg));
      271 |       default: return sorted;
      272 |     }
      273 |   }, [playerRankings, sortBy]);
      274 | 
      275 |   // Team Season Averages
      276 |   const teamSeasonAverages = useMemo(() => {
      277 |     if (!selectedTeam || teamGames.length === 0) return null;
      278 | 
>>>   279 |     let totalPoints = 0, totalAssists = 0, totalReboundMargin = 0, totalTurnovers = 0, totalRebounds = 0;
      280 | 
      281 |     teamGames.forEach(game => {
      282 |       const isHome = game.home_team_id === selectedTeam;
>>>   283 |       totalPoints += isHome ? game.home_score : game.away_score;
      284 | 
      285 |       const teamStats = playerStats.filter(s => s.game_id === game.id && s.team_id === selectedTeam);
      286 |       const oppStats = playerStats.filter(s => s.game_id === game.id && s.team_id !== selectedTeam);
      287 | 
      288 |       totalAssists += teamStats.reduce((sum, s) => sum + (s.assists || 0), 0);

      291 |       const oppReb = oppStats.reduce((sum, s) => sum + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      292 |       totalRebounds += teamReb;
      293 |       totalReboundMargin += (teamReb - oppReb);
      294 | 
      295 |       if (!excludeTurnovers) {
      296 |         totalTurnovers += teamStats.reduce((sum, s) => sum + (s.turnovers || 0), 0);
      297 |       }
      298 |     });
      299 | 
      300 |     return {
>>>   301 |       points: totalPoints / teamGames.length,
      302 |       assists: totalAssists / teamGames.length,
      303 |       rebounds: totalRebounds / teamGames.length,
      304 |       reboundMargin: totalReboundMargin / teamGames.length,
      305 |       turnovers: excludeTurnovers ? null : totalTurnovers / teamGames.length,
      306 |     };

      309 |   // Last 3 Games Trend
      310 |   const last3GamesTrend = useMemo(() => {
      311 |     if (!selectedTeam || teamGames.length === 0 || !teamSeasonAverages) return null;
      312 | 
      313 |     const recentGames = teamGames
      314 |       .sort((a, b) => new Date(b.game_date) - new Date(a.game_date))
      315 |       .slice(0, 3);
      316 | 
      317 |     if (recentGames.length === 0) return null;
      318 | 
>>>   319 |     let totalPoints = 0, totalAssists = 0, totalReboundMargin = 0, totalTurnovers = 0;
      320 | 
      321 |     recentGames.forEach(game => {
      322 |       const isHome = game.home_team_id === selectedTeam;
>>>   323 |       totalPoints += isHome ? game.home_score : game.away_score;
      324 | 
      325 |       const teamStats = playerStats.filter(s => s.game_id === game.id && s.team_id === selectedTeam);
      326 |       const oppStats = playerStats.filter(s => s.game_id === game.id && s.team_id !== selectedTeam);
      327 | 
      328 |       totalAssists += teamStats.reduce((sum, s) => sum + (s.assists || 0), 0);

      330 |       const teamReb = teamStats.reduce((sum, s) => sum + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      331 |       const oppReb = oppStats.reduce((sum, s) => sum + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      332 |       totalReboundMargin += (teamReb - oppReb);
      333 | 
      334 |       if (!excludeTurnovers) {
      335 |         totalTurnovers += teamStats.reduce((sum, s) => sum + (s.turnovers || 0), 0);
      336 |       }
      337 |     });
      338 | 
      339 |     const recent = {
>>>   340 |       points: totalPoints / recentGames.length,
      341 |       assists: totalAssists / recentGames.length,
      342 |       reboundMargin: totalReboundMargin / recentGames.length,
      343 |       turnovers: excludeTurnovers ? null : totalTurnovers / recentGames.length,
      344 |     };
      345 | 

---

## src/pages/FixManualStats.jsx

       55 | 
       56 |       for (const game of targetGames) {
       57 |         const isEditedDigital = game.edited && game.entry_type !== 'manual';
       58 |         const stats = await base44.entities.PlayerStats.filter({ game_id: game.id });
       59 | 
       60 |         let homeScore = 0;
       61 |         let awayScore = 0;
       62 |         let statsUpdated = 0;
       63 | 
       64 |         await Promise.all(stats.map(async (stat) => {
>>>    65 |           let totalPoints;
       66 | 
       67 |           if (isEditedDigital) {
>>>    68 |             // Old edited digital games stored points_2 as floor((total - 3pt*3 - ft)/2)
>>>    69 |             // So true total = points_2*2 + 3pt*3 + ft
>>>    70 |             totalPoints = ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       71 |           } else {
>>>    72 |             // Manual games stored points_2 = total - 3pt*3 - ft, so already correct
>>>    73 |             totalPoints = (stat.points_2 || 0) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
       74 |           }
       75 | 
>>>    76 |           // Store using lossless manual format: points_2 = total - 3pt*3 - ft
       77 |           const points3pts = (stat.points_3 || 0) * 3;
       78 |           const ft = stat.free_throws || 0;
>>>    79 |           const newPoints2 = Math.max(0, totalPoints - points3pts - ft);
       80 | 
>>>    81 |           if (newPoints2 !== (stat.points_2 || 0)) {
>>>    82 |             await base44.entities.PlayerStats.update(stat.id, { points_2: newPoints2 });
       83 |             statsUpdated++;
       84 |             fixedStats++;
       85 |           }
       86 | 
       87 |           if (stat.team_id === game.home_team_id) {
>>>    88 |             homeScore += totalPoints;
       89 |           } else {
>>>    90 |             awayScore += totalPoints;
       91 |           }
       92 |         }));
       93 | 
       94 |         // Update game scores and ensure entry_type is 'manual'
       95 |         await base44.entities.Game.update(game.id, {

---

## src/pages/GameLog.jsx

       71 |   const hasAdminAccess = isAppAdmin || leagues.length > 0;
       72 | 
       73 |   if (currentUser && !identitiesLoading && !hasAdminAccess) {
       74 |     return (
       75 |       <div className="flex items-center justify-center h-64">
       76 |         <p className="text-slate-500">You don't have permission to view this page.</p>
       77 |       </div>
       78 |     );
       79 |   }
       80 | 
>>>    81 |   const POINTS_STAT_TYPES = ["points_2", "points_3", "free_throws"];
       82 | 
       83 |   const selectedGame = games.find(g => g.id === selectedGameId);
       84 |   const homeTeam = teams.find(t => t.id === selectedGame?.home_team_id);
       85 |   const awayTeam = teams.find(t => t.id === selectedGame?.away_team_id);
       86 | 
       87 |   const statTypeColors = {
>>>    88 |     points_2: "bg-green-100 text-green-800",
       89 |     points_3: "bg-blue-100 text-blue-800",
       90 |     free_throws: "bg-yellow-100 text-yellow-800",
       91 |     free_throws_missed: "bg-red-100 text-red-800",
       92 |     offensive_rebounds: "bg-purple-100 text-purple-800",
       93 |     defensive_rebounds: "bg-indigo-100 text-indigo-800",

---

## src/pages/LiveBoxScore.jsx

       21 |   return Object.values(groups).map(rows => {
       22 |     // Sort descending by updated_date to find the most recent row
       23 |     const sorted = [...rows].sort((a, b) => {
       24 |       const da = a.updated_date || a.created_date || '';
       25 |       const db = b.updated_date || b.created_date || '';
       26 |       return db.localeCompare(da);
       27 |     });
       28 |     const latest = sorted[0];
       29 |     return {
       30 |       ...latest,
>>>    31 |       points_2: rows.reduce((acc, s) => acc + (s.points_2 || 0), 0),
       32 |       points_3: rows.reduce((acc, s) => acc + (s.points_3 || 0), 0),
       33 |       free_throws: rows.reduce((acc, s) => acc + (s.free_throws || 0), 0),
       34 |       free_throws_missed: rows.reduce((acc, s) => acc + (s.free_throws_missed || 0), 0),
       35 |       offensive_rebounds: rows.reduce((acc, s) => acc + (s.offensive_rebounds || 0), 0),
       36 |       defensive_rebounds: rows.reduce((acc, s) => acc + (s.defensive_rebounds || 0), 0),

      187 |   if (!displayGame || !homeTeam || !awayTeam) {
      188 |     return (
      189 |       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
      190 |         <div className="text-center">
      191 |           <p className="text-slate-600">Loading...</p>
      192 |         </div>
      193 |       </div>
      194 |     );
      195 |   }
      196 | 
>>>   197 |   const calcScore = (stats) => stats.reduce((acc, s) => acc + (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0), 0);
      198 |   const homeScore = calcScore(homePlayerStats);
      199 |   const awayScore = calcScore(awayPlayerStats);
      200 | 
      201 |   const StatTable = ({ team, playerStats }) => {
      202 |     const teamPlayers = playerStats
      203 |       .map(stat => ({ ...stat, player: players.find(p => p.id === stat.player_id) }))
      204 |       .sort((a, b) => (a.player?.jersey_number || 0) - (b.player?.jersey_number || 0));
      205 | 
>>>   206 |     const teamScore = teamPlayers.reduce((acc, s) => acc + (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0), 0);
      207 |     const team3PT = teamPlayers.reduce((acc, s) => acc + (s.points_3 || 0), 0);
      208 |     const teamFT = teamPlayers.reduce((acc, s) => acc + (s.free_throws || 0), 0);
      209 |     const teamREB = teamPlayers.reduce((acc, s) => acc + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0);
      210 |     const teamAST = teamPlayers.reduce((acc, s) => acc + (s.assists || 0), 0);
      211 |     const teamSTL = teamPlayers.reduce((acc, s) => acc + (s.steals || 0), 0);

      216 |     return (
      217 |       <div>
      218 |         <div className="flex items-center gap-2 mb-4">
      219 |           <TeamLogo team={team} size="md" />
      220 |           <h3 className="font-bold text-lg text-slate-900">{team?.name}</h3>
      221 |         </div>
      222 | 
      223 |         {/* Mobile: Cards */}
      224 |         <div className="block md:hidden space-y-2 mb-4">
      225 |           {teamPlayers.map(stat => {
>>>   226 |             const points = (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
      227 |             const rebounds = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
      228 |             return (
      229 |               <div key={stat.player_id} className="rounded-lg p-3" style={{ backgroundColor: stat.is_active ? 'rgba(34,197,94,0.08)' : '#f8fafc' }}>
      230 |                 <div className="flex items-center gap-2 mb-2">
      231 |                   <div className="relative">

      279 |                 <TableHead className="text-center">REB</TableHead>
      280 |                 <TableHead className="text-center">AST</TableHead>
      281 |                 <TableHead className="text-center">STL</TableHead>
      282 |                 <TableHead className="text-center">BLK</TableHead>
      283 |                 <TableHead className="text-center">TO</TableHead>
      284 |                 <TableHead className="text-center">F</TableHead>
      285 |               </TableRow>
      286 |             </TableHeader>
      287 |             <TableBody>
      288 |               {teamPlayers.map(stat => {
>>>   289 |                 const points = (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
      290 |                 const rebounds = (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
      291 |                 return (
      292 |                   <TableRow key={stat.player_id} style={{ backgroundColor: stat.is_active ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
      293 |                     <TableCell>
      294 |                       <div className="flex items-center gap-2">

---

## src/pages/PlayerProfile.jsx

      108 |       !g.exclude_from_player_stats &&
      109 |       !g.exclude_from_awards
      110 |     ).map(g => g.id)),
      111 |     [leagueGames]
      112 |   );
      113 | 
      114 |   // Stats for THIS player using resolved playerRecord
      115 |   const resolvedPlayerId = playerRecord?.id;
      116 | 
      117 |   const didPlayerParticipate = (stat) => {
>>>   118 |     const hasStats = (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
      119 |                      (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
      120 |                      (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
      121 |                      (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0;
      122 | 
      123 |     if (stat.did_play) return true;

---

## src/pages/RegularSeasonRecap.jsx

        4 | import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
        5 | import { Button } from "@/components/ui/button";
        6 | import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
        7 | import { Sparkles, Copy, RefreshCw, AlertCircle, CheckCircle, Newspaper } from "lucide-react";
        8 | import { DEFAULT_AWARD_SETTINGS } from "@/utils/awardDefaults";
        9 | 
       10 | function didPlay(stat) {
       11 |   if (stat.did_play) return true;
       12 |   if ((stat.minutes_played || 0) > 0) return true;
       13 |   return (
>>>    14 |     (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       15 |     (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       16 |     (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       17 |     (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0
       18 |   );
       19 | }
       20 | 
       21 | function isActualGame(g) {
       22 |   return g.status === "completed" && !g.is_default_result && g.result_type !== "default" && !g.exclude_from_awards;
       23 | }
       24 | 
       25 | function calcPts(stat, game) {
       26 |   const isDigital = game && game.entry_type === "digital" && !game.edited;
>>>    27 |   return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) +
       28 |     (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
       29 | }
       30 | 
       31 | function calculateStandings(teams, games) {
       32 |   return teams

---

## src/pages/Reports.jsx

        7 | import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
        8 | import { BarChart3, Trophy, Medal, Sparkles, Copy, RefreshCw, AlertCircle, CheckCircle, Newspaper, Filter, Key } from "lucide-react";
        9 | import { DEFAULT_AWARD_SETTINGS } from "@/utils/awardDefaults";
       10 | import AwardLeadersTop20 from "@/components/stats/AwardLeadersTop20";
       11 | 
       12 | // ─── Season Recap helpers ─────────────────────────────────────────────────────
       13 | function didPlay(stat) {
       14 |   if (stat.did_play) return true;
       15 |   if ((stat.minutes_played || 0) > 0) return true;
       16 |   return (
>>>    17 |     (stat.points_2 || 0) + (stat.points_3 || 0) + (stat.free_throws || 0) +
       18 |     (stat.assists || 0) + (stat.steals || 0) + (stat.blocks || 0) +
       19 |     (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0) +
       20 |     (stat.fouls || 0) + (stat.technical_fouls || 0) + (stat.unsportsmanlike_fouls || 0) > 0
       21 |   );
       22 | }
       23 | 
       24 | function isActualGame(g) {
       25 |   return g.status === "completed" && !g.is_default_result && g.result_type !== "default" && !g.exclude_from_awards;
       26 | }
       27 | 
       28 | function calcPts(stat, game) {
       29 |   const isDigital = game && game.entry_type === "digital" && !game.edited;
>>>    30 |   return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) +
       31 |     (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
       32 | }
       33 | 
       34 | function calculateStandings(teams, games) {
       35 |   return teams

---

## src/pages/StoryBuilder.jsx

      133 |       if (playerStats.length === 0) throw new Error("no_stats");
      134 | 
      135 |       const homeScore = selectedGame.home_score || 0;
      136 |       const awayScore = selectedGame.away_score || 0;
      137 |       if (homeScore === 0 && awayScore === 0) throw new Error("no_stats");
      138 | 
      139 |       // --- Build stats summary ---
      140 |       const buildPlayerStatsSummary = () => {
      141 |         return playerStats
      142 |           .filter(ps => {
>>>   143 |             const pts = (ps.points_2 || 0) * 2 + (ps.points_3 || 0) * 3 + (ps.free_throws || 0);
      144 |             const anyStats = pts > 0 || (ps.offensive_rebounds || 0) > 0 || (ps.defensive_rebounds || 0) > 0
      145 |               || (ps.assists || 0) > 0 || (ps.steals || 0) > 0 || (ps.blocks || 0) > 0
      146 |               || (ps.turnovers || 0) > 0 || (ps.fouls || 0) > 0;
      147 |             return ps.did_play || anyStats;
      148 |           })
      149 |           .map(ps => {
      150 |             const player = players.find(p => p.id === ps.player_id);
      151 |             const team = teams.find(t => t.id === ps.team_id);
>>>   152 |             const pts = (ps.points_2 || 0) * 2 + (ps.points_3 || 0) * 3 + (ps.free_throws || 0);
      153 |             return {
      154 |               name: player?.name || "Unknown",
      155 |               team: team?.name || "Unknown",
      156 |               team_id: ps.team_id,
      157 |               pts,

      178 |       const winnerTeam = homeWon ? homeTeam : awayTeam;
      179 |       const loserTeam = homeWon ? awayTeam : homeTeam;
      180 |       const winnerScore = homeWon ? homeScore : awayScore;
      181 |       const loserScore = homeWon ? awayScore : homeScore;
      182 |       const winnerTeamId = homeWon ? selectedGame.home_team_id : selectedGame.away_team_id;
      183 |       const loserTeamId = homeWon ? selectedGame.away_team_id : selectedGame.home_team_id;
      184 | 
      185 |       // --- Build activity log narrative ---
      186 |       const buildLogNarrative = () => {
      187 |         const pointEvents = gameLogs.filter(l =>
>>>   188 |           ["points_2", "points_3", "free_throws"].includes(l.stat_type) &&
      189 |           l.new_value > l.old_value
      190 |         );
      191 | 
      192 |         let homeRunning = 0;
      193 |         let awayRunning = 0;
      194 |         const snapshots = [];
      195 |         gameLogs.forEach(l => {
      196 |           const pts = l.stat_points ?? 0;
      197 |           const added = l.new_value > l.old_value;
>>>   198 |           if (added && ["points_2", "points_3", "free_throws"].includes(l.stat_type)) {
      199 |             if (l.team_id === selectedGame.home_team_id) homeRunning += pts;
      200 |             else awayRunning += pts;
      201 |           }
      202 |           snapshots.push({ home: homeRunning, away: awayRunning, team: l.team_id, stat: l.stat_type });
      203 |         });

---

**Unique files:** 36  
**Total match lines:** 142  
