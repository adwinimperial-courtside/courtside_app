CREATE POLICY "leagues: anyone can read active leagues"
ON public.leagues
FOR SELECT
USING (is_active = true);
