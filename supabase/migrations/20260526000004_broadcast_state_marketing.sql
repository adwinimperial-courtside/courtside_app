-- =============================================================================
-- broadcast_state — marketing columns (broadcaster logo visibility + streamer ticker)
-- Migration: 20260526000004_broadcast_state_marketing.sql
-- =============================================================================

alter table broadcast_state
  add column if not exists streamer_text     text    not null default '',
  add column if not exists streamer_visible  boolean not null default false,
  add column if not exists crew_logo_visible boolean not null default true;

comment on column broadcast_state.streamer_text     is 'Sponsor / announcement message scrolling across the bottom of the overlay.';
comment on column broadcast_state.streamer_visible  is 'When true, render the bottom streamer ticker. Subordinate to overlay_visible.';
comment on column broadcast_state.crew_logo_visible is 'When true, render the broadcaster logo (top-right). Subordinate to overlay_visible.';
