CREATE POLICY "award_settings_audit: league_admin insert own"
  ON public.league_award_settings_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    league_id IN (
      SELECT league_id FROM public.user_league_memberships
      WHERE user_id = auth.uid()
        AND role = 'league_admin'
        AND is_active = true
    )
  );
