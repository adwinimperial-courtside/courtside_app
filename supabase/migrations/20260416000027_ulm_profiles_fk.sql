-- Add full_name to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Backfill full_name from auth.users metadata where available
UPDATE profiles p
SET full_name = u.raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE p.id = u.id
  AND p.full_name IS NULL
  AND u.raw_user_meta_data->>'full_name' IS NOT NULL;

-- Direct FK from user_league_memberships.user_id → profiles(id)
-- Needed so PostgREST can traverse the join without going through auth.users
ALTER TABLE user_league_memberships
  ADD CONSTRAINT user_league_memberships_profiles_fk
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update handle_new_user trigger to also capture full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, user_type, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'full_name',
    'viewer',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
