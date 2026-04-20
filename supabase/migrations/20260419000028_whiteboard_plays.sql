-- =============================================================================
-- Whiteboard Plays — tactical play storage for coaches
-- Migration: 20260419000028_whiteboard_plays.sql
-- =============================================================================

-- updated_at auto-update function (create or replace, safe to run multiple times)
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- TABLE: whiteboard_plays
-- =============================================================================

create table if not exists whiteboard_plays (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references leagues(id) on delete cascade,
  created_by   uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  tags         text[] not null default '{}'::text[],
  court_type   text not null default 'half' check (court_type in ('full', 'half')),
  play_data    jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- updated_at trigger
create trigger whiteboard_plays_updated_at
  before update on whiteboard_plays
  for each row
  execute function set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table whiteboard_plays enable row level security;

-- SELECT: authenticated users can read plays in leagues they belong to OR plays they created
create policy "whiteboard_plays: members can read"
  on whiteboard_plays
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from user_league_memberships ulm
      where ulm.user_id = auth.uid()
        and ulm.league_id = whiteboard_plays.league_id
        and ulm.is_active = true
    )
  );

-- INSERT: authenticated users can insert plays for leagues they belong to
create policy "whiteboard_plays: members can insert"
  on whiteboard_plays
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from user_league_memberships ulm
      where ulm.user_id = auth.uid()
        and ulm.league_id = whiteboard_plays.league_id
        and ulm.is_active = true
    )
  );

-- UPDATE: only creator can update
create policy "whiteboard_plays: creator can update"
  on whiteboard_plays
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- DELETE: creator or app_admin can delete
create policy "whiteboard_plays: creator or admin can delete"
  on whiteboard_plays
  for delete
  to authenticated
  using (
    created_by = auth.uid()
    or coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'app_admin')::boolean,
      false
    )
  );
