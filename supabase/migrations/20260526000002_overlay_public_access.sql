-- =============================================================================
-- Overlay public access — allow anon to read game + team data for OBS overlay
-- Migration: 20260526000002_overlay_public_access.sql
-- =============================================================================

-- Games: anon can read rows that have a broadcast_state entry.
-- Intentional: scores, clock, and team names are broadcast-public data.
create policy "games: public overlay read"
  on games
  for select
  to public
  using (
    exists (select 1 from broadcast_state where game_id = games.id)
  );

-- Teams: anon can read all team rows (names and colors are not sensitive).
create policy "teams: public read"
  on teams
  for select
  to public
  using (true);

-- Ensure games sends full row data on UPDATE so Realtime payload.new is complete.
alter table games replica identity full;
