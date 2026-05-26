-- =============================================================================
-- Phase A: Legacy ingestion columns
--
-- Adds the schema foundation for ADR-011 (selective per-league data ingestion).
-- All changes are additive — existing data and queries are unaffected.
--
-- NOTE: The `id_mapping` table designed in ADR-009 was already created in
-- 20260415000000_initial_schema.sql. This migration does NOT recreate it.
-- The Edge Function will use the existing table as-is. Any structural
-- differences from ADR-009's exact spec (e.g. id column, migrated_at vs
-- created_at column name) are cosmetic and accommodated in the Edge Function.
--
-- Creates:
--   1. legacy_base44_id TEXT (partial-indexed) on the 6 target tables
--   2. legacy_created_by_email TEXT on the 6 target tables
--   3. legacy_extras JSONB NOT NULL DEFAULT '{}' on the 6 target tables
--
-- See docs/adr/ADR-011-selective-per-league-data-ingestion.md for context.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Legacy columns on the 6 target tables (same pattern for each)
-- -----------------------------------------------------------------------------

-- leagues
ALTER TABLE leagues
  ADD COLUMN legacy_base44_id TEXT,
  ADD COLUMN legacy_created_by_email TEXT,
  ADD COLUMN legacy_extras JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_leagues_legacy_base44_id
  ON leagues (legacy_base44_id)
  WHERE legacy_base44_id IS NOT NULL;

COMMENT ON COLUMN leagues.legacy_base44_id IS
  'Original Base44 24-char hex ID, preserved during ADR-011 ingestion. NULL for records created natively.';

-- teams
ALTER TABLE teams
  ADD COLUMN legacy_base44_id TEXT,
  ADD COLUMN legacy_created_by_email TEXT,
  ADD COLUMN legacy_extras JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_teams_legacy_base44_id
  ON teams (legacy_base44_id)
  WHERE legacy_base44_id IS NOT NULL;

COMMENT ON COLUMN teams.legacy_base44_id IS
  'Original Base44 24-char hex ID, preserved during ADR-011 ingestion. NULL for records created natively.';

-- players
ALTER TABLE players
  ADD COLUMN legacy_base44_id TEXT,
  ADD COLUMN legacy_created_by_email TEXT,
  ADD COLUMN legacy_extras JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_players_legacy_base44_id
  ON players (legacy_base44_id)
  WHERE legacy_base44_id IS NOT NULL;

COMMENT ON COLUMN players.legacy_base44_id IS
  'Original Base44 24-char hex ID, preserved during ADR-011 ingestion. NULL for records created natively.';

-- games
ALTER TABLE games
  ADD COLUMN legacy_base44_id TEXT,
  ADD COLUMN legacy_created_by_email TEXT,
  ADD COLUMN legacy_extras JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_games_legacy_base44_id
  ON games (legacy_base44_id)
  WHERE legacy_base44_id IS NOT NULL;

COMMENT ON COLUMN games.legacy_base44_id IS
  'Original Base44 24-char hex ID, preserved during ADR-011 ingestion. NULL for records created natively.';

-- player_stats
ALTER TABLE player_stats
  ADD COLUMN legacy_base44_id TEXT,
  ADD COLUMN legacy_created_by_email TEXT,
  ADD COLUMN legacy_extras JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_player_stats_legacy_base44_id
  ON player_stats (legacy_base44_id)
  WHERE legacy_base44_id IS NOT NULL;

COMMENT ON COLUMN player_stats.legacy_base44_id IS
  'Original Base44 24-char hex ID, preserved during ADR-011 ingestion. NULL for records created natively.';

-- game_logs
ALTER TABLE game_logs
  ADD COLUMN legacy_base44_id TEXT,
  ADD COLUMN legacy_created_by_email TEXT,
  ADD COLUMN legacy_extras JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_game_logs_legacy_base44_id
  ON game_logs (legacy_base44_id)
  WHERE legacy_base44_id IS NOT NULL;

COMMENT ON COLUMN game_logs.legacy_base44_id IS
  'Original Base44 24-char hex ID, preserved during ADR-011 ingestion. NULL for records created natively.';
