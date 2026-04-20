-- Allow game_edits_audit to survive game deletion
-- game_id becomes nullable; when a game is deleted the FK is SET NULL

ALTER TABLE game_edits_audit
  ALTER COLUMN game_id DROP NOT NULL;

ALTER TABLE game_edits_audit
  DROP CONSTRAINT game_edits_audit_game_id_fkey,
  ADD CONSTRAINT game_edits_audit_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL;
