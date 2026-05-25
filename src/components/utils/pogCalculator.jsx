import { resolveSettings } from "@/utils/awardDefaults";
import { totalPoints } from "@/lib/playerStats";

/**
 * Calculate Player of the Game score based on stats.
 * Uses the shared totalPoints helper: prefers authoritative `points` (manual
 * entry) otherwise derives from makes (points_2 * 2 + points_3 * 3 + free_throws).
 */
export function calculatePOGScore(stats, awardSettings, game) {
  const cfg = resolveSettings(awardSettings);
  const ptsScore = cfg.pog_pts_weight * totalPoints(stats);

  const score =
    ptsScore +
    cfg.pog_oreb_weight * (stats.offensive_rebounds || 0) +
    cfg.pog_dreb_weight * (stats.defensive_rebounds || 0) +
    cfg.pog_ast_weight * (stats.assists || 0) +
    cfg.pog_stl_weight * (stats.steals || 0) +
    cfg.pog_blk_weight * (stats.blocks || 0) -
    cfg.pog_turnover_penalty * (stats.turnovers || 0) -
    cfg.pog_foul_penalty * (stats.fouls || 0) -
    cfg.pog_tech_penalty * (stats.technical_fouls || 0) -
    cfg.pog_unsportsmanlike_penalty * (stats.unsportsmanlike_fouls || 0);
  
  return score;
}

/**
 * Find the player with the highest POG score from the winning team
 * Returns the player_id of the POG, or null if no stats
 */
export function findPlayerOfGame(playerStats, game, awardSettings) {
  const cfg = resolveSettings(awardSettings);
  if (!playerStats || playerStats.length === 0 || !game) return null;
  
  // Determine the winning team
  const winningTeamId = game.home_score > game.away_score 
    ? game.home_team_id 
    : game.away_score > game.home_score 
      ? game.away_team_id 
      : null;
  
  // Restrict to winning team only if configured (default: true)
  const eligibleStats = cfg.pog_winning_team_only
    ? (winningTeamId ? playerStats.filter(stat => stat.team_id === winningTeamId) : [])
    : playerStats;
  
  if (eligibleStats.length === 0) return null;
  
  let maxScore = -Infinity;
  let pogPlayerId = null;
  
  eligibleStats.forEach(stat => {
    const score = calculatePOGScore(stat, awardSettings, game);
    if (score > maxScore) {
      maxScore = score;
      pogPlayerId = stat.player_id;
    }
  });
  
  return pogPlayerId;
}