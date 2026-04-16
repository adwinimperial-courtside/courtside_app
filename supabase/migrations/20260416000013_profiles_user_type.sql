ALTER TABLE public.profiles
ADD COLUMN user_type text NOT NULL DEFAULT 'viewer'
CHECK (user_type IN ('app_admin', 'league_admin', 'coach', 'player', 'viewer'));

COMMENT ON COLUMN public.profiles.user_type IS 'Role assigned to this user. Default is viewer on registration.';
