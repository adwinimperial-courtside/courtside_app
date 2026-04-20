import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Filter, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Standings computation ────────────────────────────────────────────────────

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

  // 2-team tie: head-to-head first, fall through to points diff if h2h tied
  if (group.length === 2) {
    const [a, b] = group;
    const h2hGames = allGames.filter(g =>
      (g.home_team_id === a.id && g.away_team_id === b.id) ||
      (g.home_team_id === b.id && g.away_team_id === a.id)
    );
    const sa = getMiniStats(a.id, h2hGames);
    const sb = getMiniStats(b.id, h2hGames);
    if (sb.winPct !== sa.winPct) return sb.winPct > sa.winPct ? [b, a] : [a, b];
    // h2h tied — fall through to points diff
    return b.pointsDiff >= a.pointsDiff ? [b, a] : [a, b];
  }

  // 3+ team tie: points differential only
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

  // Group by winPct, sort within each tied group, then flatten
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Standings() {
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);

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

  // Default to first league once loaded
  useEffect(() => {
    if (leagues.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(leagues[0].id);
    }
  }, [leagues, selectedLeagueId]);

  // 2. Fetch teams for selected league
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

  // 3. Fetch final games for selected league
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

      // Streak
      const streak = getTeamStreak(team.id, games);

      // Trend: standings without this team's most recent game
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

      return { ...team, streak, trend };
    });
  }, [teams, games]);

  const isLoading = leaguesLoading || teamsLoading || gamesLoading;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-x-hidden">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-12">

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900">Team Standings</h1>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm pl-1">Team rankings and records</p>
        </div>

        {/* League selector */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-6 mb-3 sm:mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-yellow-600" />
            <h2 className="text-base font-semibold text-slate-900">Filter by League</h2>
          </div>
          <div className="w-full max-w-md">
            {leaguesLoading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading leagues…
              </div>
            ) : leagues.length === 0 ? (
              <p className="text-slate-500 text-sm py-2">No leagues available.</p>
            ) : (
              <Select
                value={selectedLeagueId || ""}
                onValueChange={setSelectedLeagueId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select league" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map(league => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Standings table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Section label */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Trophy className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-slate-900 text-base">Team Standings</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : standings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-slate-500 text-sm">No teams in this league yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="block sm:hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                      <th className="text-left py-2 pl-3 pr-1 font-semibold">#</th>
                      <th className="text-left py-2 font-semibold">Team</th>
                      <th className="text-center py-2 font-semibold">W</th>
                      <th className="text-center py-2 font-semibold">L</th>
                      <th className="text-center py-2 font-semibold">Str</th>
                      <th className="text-center py-2 pr-3 font-semibold">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, i) => (
                      <tr key={team.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pl-3 pr-1 font-bold text-slate-700">{i + 1}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: team.color || '#3b82f6' }}
                            >
                              {team.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 uppercase truncate max-w-[110px] text-[11px]">
                              {team.name}
                            </span>
                            {team.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600 flex-shrink-0" />}
                            {team.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />}
                            {team.trend === 'neutral' && <Minus className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="py-2.5 text-center font-bold text-green-600">{team.wins}</td>
                        <td className="py-2.5 text-center font-bold text-red-500">{team.losses}</td>
                        <td className="py-2.5 text-center font-bold">
                          {team.streak ? (
                            <span className={team.streak.type === 'W' ? 'text-green-600' : 'text-red-500'}>
                              {team.streak.type}{team.streak.count}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className={`py-2.5 text-center font-bold pr-3 ${
                          team.pointsDiff > 0 ? 'text-green-600' :
                          team.pointsDiff < 0 ? 'text-red-500' :
                          'text-slate-400'
                        }`}>
                          {team.pointsDiff > 0 ? '+' : ''}{team.pointsDiff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="text-left py-3 pl-4 pr-2 font-semibold w-12">#</th>
                      <th className="text-left py-3 font-semibold">Team</th>
                      <th className="text-center py-3 font-semibold w-16">W</th>
                      <th className="text-center py-3 font-semibold w-16">L</th>
                      <th className="text-center py-3 font-semibold w-20">Win%</th>
                      <th className="text-center py-3 font-semibold w-20">Streak</th>
                      <th className="text-center py-3 pr-4 font-semibold w-20">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, i) => (
                      <tr key={team.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 pl-4 pr-2 font-bold text-slate-700">{i + 1}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ backgroundColor: team.color || '#3b82f6' }}
                            >
                              {team.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 uppercase tracking-wide">
                              {team.name}
                            </span>
                            {team.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />}
                            {team.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            {team.trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="py-3 text-center font-bold text-green-600">{team.wins}</td>
                        <td className="py-3 text-center font-bold text-red-500">{team.losses}</td>
                        <td className="py-3 text-center font-bold text-slate-900">
                          {(team.winPct * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 text-center font-bold">
                          {team.streak ? (
                            <span className={team.streak.type === 'W' ? 'text-green-600' : 'text-red-500'}>
                              {team.streak.type}{team.streak.count}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className={`py-3 text-center font-bold pr-4 ${
                          team.pointsDiff > 0 ? 'text-green-600' :
                          team.pointsDiff < 0 ? 'text-red-500' :
                          'text-slate-400'
                        }`}>
                          {team.pointsDiff > 0 ? '+' : ''}{team.pointsDiff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
