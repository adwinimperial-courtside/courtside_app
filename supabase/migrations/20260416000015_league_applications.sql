CREATE TABLE public.league_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('league_admin', 'coach', 'player', 'viewer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  full_name text NOT NULL,
  country text,
  league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL,
  team_name text,
  nickname text,
  league_name text,
  season_start_date date,
  num_teams integer,
  avg_players_per_team integer,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.league_applications IS 'Role applications submitted by users. Approved applications create user_league_memberships rows.';

CREATE INDEX idx_league_applications_user_id ON public.league_applications(user_id);
CREATE INDEX idx_league_applications_status ON public.league_applications(status);
CREATE INDEX idx_league_applications_league_id ON public.league_applications(league_id);
