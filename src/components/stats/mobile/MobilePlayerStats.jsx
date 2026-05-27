import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import { totalPoints, didPlay } from "@/lib/playerStats";

// Only games that were truly played on the court
function isActualPlayedGame(g) {
  return (
    g.status === 'completed' &&
    !g.is_default_result &&
    g.result_type !== 'default' &&
    !g.exclude_from_player_stats &&
    !g.exclude_from_awards
  );
}

export default function MobilePlayerStats({ players, teams, stats, games = [] }) {
  // Build a set of valid game IDs — defaults are never included
  const validGameIds = new Set(games.filter(isActualPlayedGame).map(g => g.id));

  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const playerAggregates = players.map(player => {
    // Only count stats from actual played games
    const playerStats = stats
      .filter(s => s.player_id === player.id && validGameIds.has(s.game_id))
      .filter(didPlay);
    const team = teams.find(t => t.id === player.team_id);

    const totals = playerStats.reduce((acc, stat) => ({
      points: acc.points + totalPoints(stat),
      points_2: acc.points_2 + (stat.points_2 || 0),
      points_3: acc.points_3 + (stat.points_3 || 0),
      freeThrows: acc.freeThrows + (stat.free_throws || 0),
      offensiveRebounds: acc.offensiveRebounds + (stat.offensive_rebounds || 0),
      defensiveRebounds: acc.defensiveRebounds + (stat.defensive_rebounds || 0),
      rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
      assists: acc.assists + (stat.assists || 0),
      steals: acc.steals + (stat.steals || 0),
      blocks: acc.blocks + (stat.blocks || 0),
      turnovers: acc.turnovers + (stat.turnovers || 0),
      games: acc.games + 1
    }), { points: 0, points_2: 0, points_3: 0, freeThrows: 0, offensiveRebounds: 0, defensiveRebounds: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, games: 0 });

    const gp = totals.games;
    return {
      ...player,
      team,
      gp,
      ppg: gp > 0 ? (totals.points / gp).toFixed(1) : '0.0',
      twopm: gp > 0 ? (totals.points_2 / gp).toFixed(1) : '0.0',
      threepm: gp > 0 ? (totals.points_3 / gp).toFixed(1) : '0.0',
      ftm: gp > 0 ? (totals.freeThrows / gp).toFixed(1) : '0.0',
      rpg: gp > 0 ? (totals.rebounds / gp).toFixed(1) : '0.0',
      apg: gp > 0 ? (totals.assists / gp).toFixed(1) : '0.0',
      orebpg: gp > 0 ? (totals.offensiveRebounds / gp).toFixed(1) : '0.0',
      drebpg: gp > 0 ? (totals.defensiveRebounds / gp).toFixed(1) : '0.0',
      spg: gp > 0 ? (totals.steals / gp).toFixed(1) : '0.0',
      bpg: gp > 0 ? (totals.blocks / gp).toFixed(1) : '0.0',
      tpg: gp > 0 ? (totals.turnovers / gp).toFixed(1) : '0.0',
    };
  }).filter(p => p.gp > 0).sort((a, b) => parseFloat(b.ppg) - parseFloat(a.ppg));

  if (playerAggregates.length === 0) {
    return <p className="text-[var(--ct-text-secondary)] text-center py-8">No player stats yet</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-purple-600" />
        <h2 className="text-base font-semibold text-[var(--ct-text-primary)]">Player Statistics (Per Game)</h2>
      </div>
      {playerAggregates.map(player => {
        const isExpanded = expandedPlayer === player.id;
        return (
          <Card key={player.id} className="border-[var(--ct-border)] ">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: player.team?.color || '#f97316' }}
                >
                  {player.jersey_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--ct-text-primary)] text-sm truncate">{player.name}</p>
                  <p className="text-xs text-[var(--ct-text-secondary)]">{player.team?.name} • {player.gp} GP</p>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-2xl font-extrabold text-purple-600">{player.ppg}</span>
                <span className="text-sm text-[var(--ct-text-secondary)] ml-1">PPG</span>
              </div>

              <div className="flex gap-3 text-xs text-[var(--ct-text-secondary)] mb-2">
                <span>2PM <span className="font-semibold text-[var(--ct-text-primary)]">{player.twopm}</span></span>
                <span>•</span>
                <span>3PM <span className="font-semibold text-[var(--ct-text-primary)]">{player.threepm}</span></span>
                <span>•</span>
                <span>FTM <span className="font-semibold text-[var(--ct-text-primary)]">{player.ftm}</span></span>
              </div>

              <div className="flex gap-3 text-xs text-[var(--ct-text-secondary)] mb-3">
                <span>RPG <span className="font-semibold text-[var(--ct-text-primary)]">{player.rpg}</span></span>
                <span>•</span>
                <span>APG <span className="font-semibold text-[var(--ct-text-primary)]">{player.apg}</span></span>
              </div>

              <button
                onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                className="text-xs text-purple-600 font-semibold flex items-center gap-1"
              >
                {isExpanded ? <><ChevronUp className="w-3 h-3" /> Hide Advanced</> : <><ChevronDown className="w-3 h-3" /> Show Advanced</>}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--ct-border)] flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ct-text-secondary)]">
                  <span>OREB <span className="font-semibold text-[var(--ct-text-primary)]">{player.orebpg}</span></span>
                  <span>•</span>
                  <span>DREB <span className="font-semibold text-[var(--ct-text-primary)]">{player.drebpg}</span></span>
                  <span>•</span>
                  <span>STL <span className="font-semibold text-[var(--ct-text-primary)]">{player.spg}</span></span>
                  <span>•</span>
                  <span>BLK <span className="font-semibold text-[var(--ct-text-primary)]">{player.bpg}</span></span>
                  <span>•</span>
                  <span>TO <span className="font-semibold text-[var(--ct-text-primary)]">{player.tpg}</span></span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}