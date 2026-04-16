ALTER TABLE public.league_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications: user can insert own"
ON public.league_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "applications: user can read own"
ON public.league_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "applications: app_admin full access"
ON public.league_applications
FOR ALL
TO authenticated
USING (is_app_admin());

CREATE POLICY "applications: league_admin can read their league"
ON public.league_applications
FOR SELECT
TO authenticated
USING (
  league_id IN (
    SELECT league_id FROM user_league_memberships
    WHERE user_id = auth.uid()
    AND role = 'league_admin'
    AND is_active = true
  )
);

CREATE POLICY "applications: league_admin can update their league"
ON public.league_applications
FOR UPDATE
TO authenticated
USING (
  league_id IN (
    SELECT league_id FROM user_league_memberships
    WHERE user_id = auth.uid()
    AND role = 'league_admin'
    AND is_active = true
  )
);
