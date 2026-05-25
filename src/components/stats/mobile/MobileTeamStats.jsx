import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import TeamLogo from "../../teams/TeamLogo";

export default function MobileTeamStats({ teams, games, stats }) {
  const teamStatistics = teams.map(team => {
    const teamGames = games.filter(g =>
      g.status === 'completed' && (g.home_team_id === team.id || g.away_team_id === team.id)
    );
    const teamStats = stats.filter(s => s.team_id === team.id);

    const totals = teamStats.reduce((acc, stat) => ({
      points: acc.points + ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0),
      offensiveRebounds: acc.offensiveRebounds + (stat.offensive_rebounds || 0),
      defensiveRebounds: acc.defensiveRebounds + (stat.defensive_rebounds || 0),
      rebounds: acc.rebounds + (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0),
      assists: acc.assists + (stat.assists || 0),
      steals: acc.steals + (stat.steals || 0),
      blocks: acc.blocks + (stat.blocks || 0),
      turnovers: acc.turnovers + (stat.turnovers || 0),
    }), { points: 0, offensiveRebounds: 0, defensiveRebounds: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0 });

    const gp = teamGames.length;
    return {
      ...team,
      gp,
      ppg: gp > 0 ? (totals.points / gp).toFixed(1) : '0.0',
      rpg: gp > 0 ? (totals.rebounds / gp).toFixed(1) : '0.0',
      apg: gp > 0 ? (totals.assists / gp).toFixed(1) : '0.0',
      orebpg: gp > 0 ? (totals.offensiveRebounds / gp).toFixed(1) : '0.0',
      drebpg: gp > 0 ? (totals.defensiveRebounds / gp).toFixed(1) : '0.0',
      stlpg: gp > 0 ? (totals.steals / gp).toFixed(1) : '0.0',
      blkpg: gp > 0 ? (totals.blocks / gp).toFixed(1) : '0.0',
      topg: gp > 0 ? (totals.turnovers / gp).toFixed(1) : '0.0',
    };
  }).filter(t => t.gp > 0).sort((a, b) => parseFloat(b.ppg) - parseFloat(a.ppg));

  if (teamStatistics.length === 0) {
    return <p className="text-[var(--ct-text-secondary)] text-center py-8">No team stats yet</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-purple-600" />
        <h2 className="text-base font-semibold text-[var(--ct-text-primary)]">Team Statistics (Per Game)</h2>
      </div>
      {teamStatistics.map(team => (
        <Card key={team.id} className="border-[var(--ct-border)] ">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <TeamLogo team={team} size="sm" />
              <div>
                <p className="font-bold text-[var(--ct-text-primary)] text-sm">{team.name}</p>
                <p className="text-xs text-[var(--ct-text-secondary)]">{team.gp} GP</p>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-2xl font-extrabold text-purple-600">{team.ppg}</span>
              <span className="text-sm text-[var(--ct-text-secondary)] ml-1">PTS</span>
            </div>
            <div className="flex gap-4 mb-3 text-sm">
              <span><span className="font-semibold text-[var(--ct-text-primary)]">{team.rpg}</span> <span className="text-[var(--ct-text-secondary)]">REB</span></span>
              <span className="text-[var(--ct-text-muted)]">•</span>
              <span><span className="font-semibold text-[var(--ct-text-primary)]">{team.apg}</span> <span className="text-[var(--ct-text-secondary)]">AST</span></span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ct-text-secondary)]">
              <span>OREB <span className="font-semibold text-[var(--ct-text-primary)]">{team.orebpg}</span></span>
              <span>•</span>
              <span>DREB <span className="font-semibold text-[var(--ct-text-primary)]">{team.drebpg}</span></span>
              <span>•</span>
              <span>STL <span className="font-semibold text-[var(--ct-text-primary)]">{team.stlpg}</span></span>
              <span>•</span>
              <span>BLK <span className="font-semibold text-[var(--ct-text-primary)]">{team.blkpg}</span></span>
              <span>•</span>
              <span>TO <span className="font-semibold text-[var(--ct-text-primary)]">{team.topg}</span></span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}