-- Authoritative total-points column for player_stats rows.
--
-- Rationale: Base44 has two stat-entry modes.
--   - "digital" (live-tracked, edited=false):  points_2 is a COUNT of 2PT baskets
--     made; total points = points_2 * 2 + points_3 * 3 + free_throws.
--   - everything else (manual entry, or digital that was later edited): points_2
--     stores the 2PT *points contribution* directly (basket count is unknown);
--     total points = points_2 + points_3 * 3 + free_throws.
--
-- We can't safely derive a single formula at query time from points_2/points_3/
-- free_throws alone because we lose the 2PT basket count for non-digital games.
-- This column stores the authoritative total for those rows; for digital rows
-- it stays NULL and callers can fall back to the standard formula.
--
-- See: docs/temp/edited-game-investigation-2026-05-26.md (empirical proof).

ALTER TABLE player_stats
  ADD COLUMN total_points INTEGER NULL;

COMMENT ON COLUMN player_stats.total_points IS
  'Authoritative total points for this player in this game. NULL means derive from breakdown (points_2*2 + points_3*3 + free_throws). Set during Base44 import for non-digital games where the 2PT basket count is unknown.';
