-- Ensure updated_at helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- league_award_settings: per-league award calculation weights
CREATE TABLE public.league_award_settings (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id                     UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by                    UUID REFERENCES auth.users(id),

  -- MVP weights
  mvp_points_weight             DECIMAL(4,1) NOT NULL DEFAULT 1,
  mvp_oreb_weight               DECIMAL(4,1) NOT NULL DEFAULT 1.2,
  mvp_dreb_weight               DECIMAL(4,1) NOT NULL DEFAULT 1,
  mvp_ast_weight                DECIMAL(4,1) NOT NULL DEFAULT 1.5,
  mvp_stl_weight                DECIMAL(4,1) NOT NULL DEFAULT 2.5,
  mvp_blk_weight                DECIMAL(4,1) NOT NULL DEFAULT 2,
  mvp_to_penalty                DECIMAL(4,1) NOT NULL DEFAULT 2,
  mvp_foul_penalty              DECIMAL(4,1) NOT NULL DEFAULT 0.5,
  mvp_tech_penalty              DECIMAL(4,1) NOT NULL DEFAULT 3,
  mvp_unsport_penalty           DECIMAL(4,1) NOT NULL DEFAULT 4,
  mvp_gis_contribution          DECIMAL(4,2) NOT NULL DEFAULT 0.6,
  mvp_games_played_contribution INTEGER      NOT NULL DEFAULT 20,
  mvp_team_win_contribution     INTEGER      NOT NULL DEFAULT 20,
  mvp_season_tech_penalty       DECIMAL(4,1) NOT NULL DEFAULT 3,
  mvp_season_unsport_penalty    DECIMAL(4,1) NOT NULL DEFAULT 5,
  mvp_min_games_pct             INTEGER      NOT NULL DEFAULT 60,

  -- DPOY weights
  dpoy_stl_weight               DECIMAL(4,1) NOT NULL DEFAULT 3,
  dpoy_blk_weight               DECIMAL(4,1) NOT NULL DEFAULT 2.5,
  dpoy_oreb_weight              DECIMAL(4,1) NOT NULL DEFAULT 1.5,
  dpoy_dreb_weight              DECIMAL(4,1) NOT NULL DEFAULT 1,
  dpoy_foul_penalty             DECIMAL(4,1) NOT NULL DEFAULT 1.5,
  dpoy_to_penalty               DECIMAL(4,1) NOT NULL DEFAULT 2,
  dpoy_tech_penalty             DECIMAL(4,1) NOT NULL DEFAULT 3,
  dpoy_unsport_penalty          DECIMAL(4,1) NOT NULL DEFAULT 4,
  dpoy_games_played_contribution INTEGER     NOT NULL DEFAULT 10,
  dpoy_season_tech_penalty      DECIMAL(4,1) NOT NULL DEFAULT 2,
  dpoy_season_unsport_penalty   DECIMAL(4,1) NOT NULL DEFAULT 3,
  dpoy_min_games_pct            INTEGER      NOT NULL DEFAULT 60,

  -- POG weights
  pog_points_weight             DECIMAL(4,1) NOT NULL DEFAULT 1,
  pog_oreb_weight               DECIMAL(4,1) NOT NULL DEFAULT 1.2,
  pog_dreb_weight               DECIMAL(4,1) NOT NULL DEFAULT 1,
  pog_ast_weight                DECIMAL(4,1) NOT NULL DEFAULT 1.5,
  pog_stl_weight                DECIMAL(4,1) NOT NULL DEFAULT 2.5,
  pog_blk_weight                DECIMAL(4,1) NOT NULL DEFAULT 2,
  pog_to_penalty                DECIMAL(4,1) NOT NULL DEFAULT 2,
  pog_foul_penalty              DECIMAL(4,1) NOT NULL DEFAULT 0.5,
  pog_tech_penalty              DECIMAL(4,1) NOT NULL DEFAULT 3,
  pog_unsport_penalty           DECIMAL(4,1) NOT NULL DEFAULT 4,
  pog_winning_team_only         BOOLEAN      NOT NULL DEFAULT true,

  -- Mythical Five
  mythical_source               TEXT         NOT NULL DEFAULT 'mvp_rankings',
  mythical_count                INTEGER      NOT NULL DEFAULT 5,

  CONSTRAINT league_award_settings_league_id_key UNIQUE (league_id)
);

-- Auto-update updated_at
CREATE TRIGGER trg_league_award_settings_updated_at
  BEFORE UPDATE ON public.league_award_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.league_award_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "award_settings: app_admin full access"
  ON public.league_award_settings
  FOR ALL
  TO authenticated
  USING (is_app_admin());

CREATE POLICY "award_settings: league_admin select own"
  ON public.league_award_settings
  FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM public.user_league_memberships
      WHERE user_id = auth.uid()
        AND role = 'league_admin'
        AND is_active = true
    )
  );

CREATE POLICY "award_settings: league_admin update own"
  ON public.league_award_settings
  FOR UPDATE
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM public.user_league_memberships
      WHERE user_id = auth.uid()
        AND role = 'league_admin'
        AND is_active = true
    )
  );

-- Auto-create settings row when a new league is inserted
CREATE OR REPLACE FUNCTION public.handle_new_league_award_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.league_award_settings (league_id)
  VALUES (NEW.id)
  ON CONFLICT (league_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_league_award_settings
  AFTER INSERT ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_league_award_settings();

-- Backfill settings for existing leagues
INSERT INTO public.league_award_settings (league_id)
SELECT id FROM public.leagues
ON CONFLICT (league_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Audit table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.league_award_settings_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id   UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  changed_by  UUID NOT NULL REFERENCES auth.users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  award_type  TEXT NOT NULL,
  field_name  TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT
);

ALTER TABLE public.league_award_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "award_settings_audit: app_admin full access"
  ON public.league_award_settings_audit
  FOR ALL
  TO authenticated
  USING (is_app_admin());

CREATE POLICY "award_settings_audit: league_admin select own"
  ON public.league_award_settings_audit
  FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM public.user_league_memberships
      WHERE user_id = auth.uid()
        AND role = 'league_admin'
        AND is_active = true
    )
  );
