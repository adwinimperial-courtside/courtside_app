-- =============================================================================
-- Avatars storage bucket — public-read bucket for crew logos
-- Migration: 20260526000003_avatars_bucket.sql
-- Path convention: crew/{gameId}/{filename}
-- =============================================================================

-- Create the bucket (public = anon can read objects via signed/public URL).
-- on conflict: safe to re-run if bucket already exists.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ── Read ──────────────────────────────────────────────────────────────────────
-- Anyone (including anon OBS browser source) can read objects.
create policy "avatars: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

-- ── Write: app admins (unrestricted path) ────────────────────────────────────
create policy "avatars: app admin insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and is_app_admin()
  );

create policy "avatars: app admin update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and is_app_admin()
  );

create policy "avatars: app admin delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and is_app_admin()
  );

-- ── Write: league admins (restricted to crew/<gameId>/ paths) ────────────────
-- (storage.foldername returns text[] — [1] = first segment, [2] = second segment)
create policy "avatars: league admin insert crew"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'crew'
    and get_my_league_role(
      (select league_id from games
       where id = ((storage.foldername(name))[2])::uuid)
    ) = 'league_admin'
  );

create policy "avatars: league admin update crew"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'crew'
    and get_my_league_role(
      (select league_id from games
       where id = ((storage.foldername(name))[2])::uuid)
    ) = 'league_admin'
  );

create policy "avatars: league admin delete crew"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'crew'
    and get_my_league_role(
      (select league_id from games
       where id = ((storage.foldername(name))[2])::uuid)
    ) = 'league_admin'
  );
