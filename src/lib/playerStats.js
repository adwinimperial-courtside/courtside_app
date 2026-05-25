// Authoritative total points for a single player_stats row (or an aggregated set
// of rows for the same player in the same game).
//
// Why both branches exist:
// • Manual entry (AdminTools) stores the admin-typed total directly in `points`.
//   Its derived `points_2` count is `floor((pts − 3pt·3 − ft) / 2)` which can
//   lose precision on odd remainders — so `points_2 × 2 + points_3 × 3 + free_throws`
//   is NOT equal to `points` for manual rows. `points` is authoritative.
// • Digital entry (LiveStatTracker) writes one row per action with the makes
//   fields only; `points` is not set. Summed across action rows for a game,
//   `points_2 × 2 + points_3 × 3 + free_throws` is the correct total.
//
// Rule: honour `points` when present and positive; otherwise derive from makes.
export function totalPoints(stat) {
  if (!stat) return 0;
  if (stat.points != null && stat.points > 0) return stat.points;
  return (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
}
