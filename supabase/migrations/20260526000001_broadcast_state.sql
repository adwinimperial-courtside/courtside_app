-- =============================================================================
-- Broadcast State — overlay control for live game OBS browser source
-- Migration: 20260526000001_broadcast_state.sql
-- =============================================================================

-- =============================================================================
-- A. TABLE: broadcast_state
-- =============================================================================

create table if not exists broadcast_state (
  id                uuid primary key default gen_random_uuid(),
  game_id           uuid not null unique references games(id) on delete cascade,
  overlay_visible   boolean not null default true,
  scorebug_visible  boolean not null default true,
  crew_name         text,
  crew_logo_url     text,
  current_graphic   jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =============================================================================
-- B. INDEX
-- =============================================================================

create index idx_broadcast_state_game_id on broadcast_state(game_id);

-- =============================================================================
-- C. updated_at TRIGGER
-- =============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger broadcast_state_updated_at
  before update on broadcast_state
  for each row
  execute function set_updated_at();

-- =============================================================================
-- D. ROW LEVEL SECURITY
-- =============================================================================

alter table broadcast_state enable row level security;

-- =============================================================================
-- E. POLICIES
-- =============================================================================

-- Public read: intentional — anonymous overlay URL needs anon read access.
-- No sensitive data lives in this table.
create policy "broadcast_state: public can read"
  on broadcast_state
  for select
  to public
  using (true);

-- Insert: app_admin or league_admin for the game's league
create policy "broadcast_state: admin can insert"
  on broadcast_state
  for insert
  to authenticated
  with check (
    is_app_admin()
    or get_my_league_role((select league_id from games where id = game_id)) = 'league_admin'
  );

-- Update: same admin check on both using and with check
create policy "broadcast_state: admin can update"
  on broadcast_state
  for update
  to authenticated
  using (
    is_app_admin()
    or get_my_league_role((select league_id from games where id = game_id)) = 'league_admin'
  )
  with check (
    is_app_admin()
    or get_my_league_role((select league_id from games where id = game_id)) = 'league_admin'
  );

-- Delete: app_admin only
create policy "broadcast_state: app_admin can delete"
  on broadcast_state
  for delete
  to authenticated
  using (is_app_admin());

-- =============================================================================
-- F. BACKFILL: one row per existing game
-- =============================================================================

insert into broadcast_state (game_id)
select id from games
on conflict (game_id) do nothing;

-- =============================================================================
-- G. AUTO-CREATE broadcast_state FOR NEW GAMES
-- =============================================================================

create or replace function create_broadcast_state_for_game()
returns trigger
language plpgsql
as $$
begin
  insert into broadcast_state (game_id)
  values (new.id)
  on conflict (game_id) do nothing;
  return new;
end;
$$;

create trigger games_create_broadcast_state
  after insert on games
  for each row
  execute function create_broadcast_state_for_game();

-- =============================================================================
-- H. REALTIME
-- =============================================================================

alter table broadcast_state replica identity full;

alter publication supabase_realtime add table broadcast_state;
