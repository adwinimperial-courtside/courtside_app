-- Add audit columns to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Create game_edits_audit table
CREATE TABLE IF NOT EXISTS game_edits_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  description TEXT,
  old_value TEXT,
  new_value TEXT
);

ALTER TABLE game_edits_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_edits_audit: app_admin full access"
  ON game_edits_audit
  FOR ALL
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

CREATE POLICY "game_edits_audit: league_admin can select"
  ON game_edits_audit
  FOR SELECT
  USING (get_my_league_role(league_id) = 'league_admin');

CREATE POLICY "game_edits_audit: league_admin can insert"
  ON game_edits_audit
  FOR INSERT
  WITH CHECK (get_my_league_role(league_id) = 'league_admin');
