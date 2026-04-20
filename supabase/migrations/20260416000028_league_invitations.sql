CREATE TABLE IF NOT EXISTS league_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id    UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('viewer', 'player', 'coach', 'league_admin')),
  invited_by   UUID NOT NULL REFERENCES profiles(id),
  token        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at  TIMESTAMPTZ,
  accepted_by  UUID REFERENCES profiles(id)
);

CREATE INDEX idx_league_invitations_token ON league_invitations(token);
CREATE INDEX idx_league_invitations_email ON league_invitations(email);

ALTER TABLE league_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations: app_admin full access"
  ON league_invitations FOR ALL
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

CREATE POLICY "invitations: league_admin can select own league"
  ON league_invitations FOR SELECT
  USING (get_my_league_role(league_id) = 'league_admin');

CREATE POLICY "invitations: league_admin can insert own league"
  ON league_invitations FOR INSERT
  WITH CHECK (get_my_league_role(league_id) = 'league_admin');

CREATE POLICY "invitations: league_admin can update own league"
  ON league_invitations FOR UPDATE
  USING (get_my_league_role(league_id) = 'league_admin');

-- Anyone can read their own invite by token (needed for unauthenticated acceptance)
CREATE POLICY "invitations: public can read by token"
  ON league_invitations FOR SELECT
  USING (true);
