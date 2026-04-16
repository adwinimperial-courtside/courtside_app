import { resolveSettings } from "@/utils/awardDefaults";

/**
 * Calculate Player of the Game score based on stats
 * Accepts optional awardSettings to use league-specific weights.
 * Points are always calculated as: points_2*2 + points_3*3 + free_throws
 * (consistent with how season award calculations treat digital/non-edited games).
 */
export function calculatePOGScore(stats, awardSettings, game) {
  const cfg = resolveSettings(awardSettings);
  // Always use full point value (points_2 * 2) — same as digital entry season calculation
  const isDigital = game ? (game.entry_type === 'digital' && !game.edited) : true;
  const totalPoints = cfg.pog_pts_weight * (
    (isDigital ? (stats.points_2 || 0) * 2 : (stats.points_2 || 0)) +
    (stats.points_3 || 0) * 3 +
    (stats.free_throws || 0)
  );
  
  const score = 
    totalPoints +
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
}---
export const DEFAULT_AWARD_SETTINGS = {
  mvp_pts_weight: 1.0,
  mvp_oreb_weight: 1.2,
  mvp_dreb_weight: 1.0,
  mvp_ast_weight: 1.5,
  mvp_stl_weight: 2.5,
  mvp_blk_weight: 2.0,
  mvp_turnover_penalty: 2.0,
  mvp_foul_penalty: 0.5,
  mvp_tech_penalty: 3.0,
  mvp_unsportsmanlike_penalty: 4.0,
  mvp_avg_gis_weight: 0.6,
  mvp_gp_percent_weight: 20.0,
  mvp_team_win_percent_weight: 20.0,
  mvp_min_games_percent: 60.0,
  mvp_tech_final_penalty: 3.0,
  mvp_unsp_final_penalty: 5.0,

  dpoy_stl_weight: 3.0,
  dpoy_blk_weight: 2.5,
  dpoy_oreb_weight: 1.5,
  dpoy_dreb_weight: 1.0,
  dpoy_foul_penalty: 1.5,
  dpoy_turnover_penalty: 2.0,
  dpoy_tech_penalty: 3.0,
  dpoy_unsportsmanlike_penalty: 4.0,
  dpoy_gp_percent_weight: 10.0,
  dpoy_min_games_percent: 60.0,
  dpoy_tech_final_penalty: 2.0,
  dpoy_unsp_final_penalty: 3.0,

  pog_pts_weight: 1.0,
  pog_oreb_weight: 1.2,
  pog_dreb_weight: 1.0,
  pog_ast_weight: 1.5,
  pog_stl_weight: 2.5,
  pog_blk_weight: 2.0,
  pog_turnover_penalty: 2.0,
  pog_foul_penalty: 0.5,
  pog_tech_penalty: 3.0,
  pog_unsportsmanlike_penalty: 4.0,
  pog_winning_team_only: true,

  mythical_five_source: 'mvp_rankings',
  mythical_five_count: 5,
};

/** Merge saved settings over defaults — guarantees all keys are present */
export function resolveSettings(saved) {
  if (!saved) return DEFAULT_AWARD_SETTINGS;
  return { ...DEFAULT_AWARD_SETTINGS, ...saved };
}