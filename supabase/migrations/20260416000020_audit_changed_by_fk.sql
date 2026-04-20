-- Add FK from changed_by to profiles(id) so PostgREST can resolve profiles(full_name) join.
-- profiles.id = auth.users.id (same UUID), so this is a valid reference.
ALTER TABLE public.league_award_settings_audit
  ADD CONSTRAINT league_award_settings_audit_changed_by_profiles_fkey
  FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
