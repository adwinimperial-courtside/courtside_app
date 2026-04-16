-- Add is_active column to player_stats
-- is_starter = player began the game in the starting 5 (never changes after tip-off)
-- is_active = player is currently on the court (changes with every substitution)
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Backfill: anyone currently marked is_starter = true should also be is_active = true
-- (safe assumption for existing live/completed games)
UPDATE player_stats SET is_active = true WHERE is_starter = true;
