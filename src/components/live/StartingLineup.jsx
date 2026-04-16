import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";

export default function StartingLineup({
  game,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  homeStarters,
  awayStarters,
  onHomeStartersChange,
  onAwayStartersChange,
  onStartGame,
  onBack
}) {
  const queryClient = useQueryClient();
  const sortedHomePlayers = [...homePlayers].sort((a, b) => a.jersey_number - b.jersey_number);
  const sortedAwayPlayers = [...awayPlayers].sort((a, b) => a.jersey_number - b.jersey_number);

  const toggleHomeStarter = (playerId) => {
    if (homeStarters.includes(playerId)) {
      onHomeStartersChange(homeStarters.filter(id => id !== playerId));
    } else if (homeStarters.length < 5) {
      onHomeStartersChange([...homeStarters, playerId]);
    }
  };

  const toggleAwayStarter = (playerId) => {
    if (awayStarters.includes(playerId)) {
      onAwayStartersChange(awayStarters.filter(id => id !== playerId));
    } else if (awayStarters.length < 5) {
      onAwayStartersChange([...awayStarters, playerId]);
    }
  };

  const startGameMutation = useMutation({
    mutationFn: async () => {
      // Build player_stats rows for all 10 starters
      const starterRows = [
        ...homeStarters.map(playerId => ({
          game_id: game.id,
          league_id: game.league_id,
          player_id: playerId,
          team_id: game.home_team_id,
          is_starter: true,
          is_active: true,
        })),
        ...awayStarters.map(playerId => ({
          game_id: game.id,
          league_id: game.league_id,
          player_id: playerId,
          team_id: game.away_team_id,
          is_starter: true,
          is_active: true,
        })),
      ];

      const { error: insertError } = await supabase
        .from('player_stats')
        .insert(starterRows);
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('games')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', game.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player_stats', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game', game.id] });
      onStartGame();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-slate-600 hover:bg-slate-200/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Select Starting Lineups</h1>
          <p className="text-slate-500">Choose 5 players from each team to start the game</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/70 border-slate-200 backdrop-blur">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-green-600"
                  >
                    {homeTeam?.name?.[0]}
                  </div>
                  {homeTeam?.name}
                </CardTitle>
                <span className="text-sm text-slate-500">{homeStarters.length}/5</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {homePlayers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No players available</p>
              ) : (
                sortedHomePlayers.map(player => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                      homeStarters.includes(player.id)
                        ? 'bg-green-100/80 border border-green-300'
                        : 'hover:bg-slate-100/50'
                    }`}
                    onClick={() => toggleHomeStarter(player.id)}
                  >
                    <Checkbox
                      checked={homeStarters.includes(player.id)}
                      className="border-slate-400"
                    />
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-green-600"
                    >
                      {player.jersey_number}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{player.name}</p>
                      <p className="text-sm text-slate-500">{player.position}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/70 border-slate-200 backdrop-blur">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-blue-600"
                  >
                    {awayTeam?.name?.[0]}
                  </div>
                  {awayTeam?.name}
                </CardTitle>
                <span className="text-sm text-slate-500">{awayStarters.length}/5</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {awayPlayers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No players available</p>
              ) : (
                sortedAwayPlayers.map(player => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                      awayStarters.includes(player.id)
                        ? 'bg-blue-100/80 border border-blue-300'
                        : 'hover:bg-slate-100/50'
                    }`}
                    onClick={() => toggleAwayStarter(player.id)}
                  >
                    <Checkbox
                      checked={awayStarters.includes(player.id)}
                      className="border-slate-400"
                    />
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-blue-600"
                    >
                      {player.jersey_number}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{player.name}</p>
                      <p className="text-sm text-slate-500">{player.position}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {startGameMutation.isError && (
          <p className="text-red-500 text-sm text-center mb-4">
            Failed to start game. Please try again.
          </p>
        )}

        <div className="text-center">
          <Button
            onClick={() => startGameMutation.mutate()}
            disabled={homeStarters.length !== 5 || awayStarters.length !== 5 || startGameMutation.isPending}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 h-14 px-12 text-lg shadow-lg shadow-indigo-500/30 text-white"
          >
            <Play className="w-5 h-5 mr-2" />
            {startGameMutation.isPending ? 'Starting...' : 'Start Game'}
          </Button>
          {(homeStarters.length !== 5 || awayStarters.length !== 5) && !startGameMutation.isPending && (
            <p className="text-sm text-slate-500 mt-3">
              Please select exactly 5 starters for each team
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
