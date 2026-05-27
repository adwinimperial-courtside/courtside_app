// Authoritative total points for a single player_stats row (or an aggregated set
// of rows for the same player in the same game).
//
// Priority chain:
// 1. `total_points` — set by the Base44 importer for non-digital games where
//    `points_2` was zeroed out and the true total stored here.
// 2. `points`       — set by AdminTools manual entry (authoritative because the
//    back-computed `points_2` count can be off by ±1 due to integer division).
// 3. Formula        — `points_2 × 2 + points_3 × 3 + free_throws`. Correct for
//    live-tracked (digital) games where `points_2` is a basket count.
//
// SQL equivalent: COALESCE(total_points, points_2 * 2 + points_3 * 3 + free_throws)
export function totalPoints(stat) {
  if (!stat) return 0;
  if (stat.total_points != null) return stat.total_points;
  if (stat.points != null && stat.points > 0) return stat.points;
  return (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
}

// Alias exported per spec. Identical to totalPoints for new call-sites that
// do not need the AdminTools `points` fallback.
export function getPlayerTotalPoints(stat) {
  return totalPoints(stat);
}
