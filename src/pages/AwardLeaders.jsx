import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Filter } from "lucide-react";
import AwardLeadersComponent from "../components/stats/AwardLeaders";

export default function AwardLeadersPage() {
  const [selectedLeague, setSelectedLeague] = useState(null);

  // 1. Leagues
  const { data: leagues = [] } = useQuery({
    queryKey: ["leagues", "active"],
    queryFn: () =>
      supabase.from("leagues").select("*").eq("is_active", true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
  });

  // Auto-select first league once loaded
  useEffect(() => {
    if (leagues.length > 0 && !selectedLeague) setSelectedLeague(leagues[0].id);
  }, [leagues, selectedLeague]);

  const leagueSelected = !!selectedLeague;

  // 2. Teams
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", selectedLeague],
    queryFn: () =>
      supabase.from("teams").select("*").eq("league_id", selectedLeague).eq("is_active", true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: leagueSelected,
    staleTime: 0,
  });

  const teamIds = useMemo(() => teams.map(t => t.id), [teams]);

  // 3. Players
  const { data: players = [] } = useQuery({
    queryKey: ["players", teamIds],
    queryFn: () =>
      supabase.from("players").select("*").in("team_id", teamIds)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: teamIds.length > 0,
    staleTime: 0,
  });

  // 4. Games (all final games for the league)
  const { data: games = [] } = useQuery({
    queryKey: ["games", selectedLeague, "final"],
    queryFn: () =>
      supabase.from("games").select("*").eq("league_id", selectedLeague).eq("status", "final")
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: leagueSelected,
    staleTime: 0,
  });

  const gameIds = useMemo(() => games.map(g => g.id), [games]);

  // 5. Player stats
  const { data: allStats = [] } = useQuery({
    queryKey: ["player_stats", gameIds],
    queryFn: () =>
      supabase.from("player_stats").select("*").in("game_id", gameIds)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: gameIds.length > 0,
    staleTime: 0,
  });

  // 6. Award settings
  const { data: leagueAwardSettings = null } = useQuery({
    queryKey: ["league_award_settings", selectedLeague],
    queryFn: () =>
      supabase.from("league_award_settings").select("*").eq("league_id", selectedLeague).maybeSingle()
        .then(({ data, error }) => { if (error) throw error; return data; }),
    enabled: leagueSelected,
    staleTime: 60000,
  });

  const selectedLeagueObj = leagues.find(l => l.id === selectedLeague) || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">Award Leaders</h1>
          </div>
          <p className="text-slate-500 text-sm sm:text-base ml-[52px] sm:ml-[60px]">
            MVP race, Defensive Player of the Year, and Player of the Game log
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-yellow-600" />
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Select League</h2>
          </div>
          <div className="max-w-sm">
            <Select value={selectedLeague || ""} onValueChange={setSelectedLeague}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a league..." />
              </SelectTrigger>
              <SelectContent>
                {leagues.map(league => (
                  <SelectItem key={league.id} value={league.id}>
                    {league.name} {league.season ? `(${league.season})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!leagueSelected ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Select a league to view award leaders</p>
          </div>
        ) : (
          <AwardLeadersComponent
            league={selectedLeagueObj}
            teams={teams}
            games={games}
            players={players}
            stats={allStats}
            awardSettings={leagueAwardSettings}
          />
        )}
      </div>
    </div>
  );
}
