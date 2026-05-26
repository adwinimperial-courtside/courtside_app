-- =============================================================================
-- Broadcast lower thirds — timing columns for Phase 4 lower-third graphics
-- Migration: 20260526000005_broadcast_lower_thirds.sql
--
-- Uses the existing current_graphic JSONB column (reserved since Phase 1) as
-- the payload carrier. Two new columns track timing so the overlay can handle
-- auto-fade and OBS browser-source reconnect resilience correctly.
-- =============================================================================

-- Timestamp set by the control panel when a graphic is fired.
-- Overlay computes elapsed = now() - lower_third_started_at.
-- If elapsed > lower_third_duration_ms the graphic has already expired — don't show.
-- Set back to NULL when the operator clears via the control panel.
ALTER TABLE broadcast_state
  ADD COLUMN IF NOT EXISTS lower_third_started_at  TIMESTAMPTZ;

-- Display window in milliseconds. Written by the control panel at fire time.
-- Default 6000ms (6s). Duration varies by graphic type:
--   player_intro   → 7000
--   quarter_recap  → 8000
--   all others     → 6000
-- The overlay runs a client-side setTimeout using this value for the auto-fade.
ALTER TABLE broadcast_state
  ADD COLUMN IF NOT EXISTS lower_third_duration_ms  INTEGER NOT NULL DEFAULT 6000;
