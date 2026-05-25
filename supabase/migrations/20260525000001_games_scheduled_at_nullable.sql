-- =============================================================================
-- Courtside by AI — Make games.scheduled_at nullable
-- Migration: 20260525000001_games_scheduled_at_nullable.sql
-- Date: 2026-05-25
-- Reason: CreateGameDialog marks Date & Time as Optional and sends null when
--         no date is chosen, but the original schema had NOT NULL — causing
--         silent insert failures ("stuck" Schedule Game button).
-- =============================================================================

alter table games
  alter column scheduled_at drop not null;
