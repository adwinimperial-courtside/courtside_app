# AdminTools — Schema Findings

## games table (relevant columns)

| column | type | nullable | default | notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | |
| league_id | uuid | NO | — | |
| home_team_id | uuid | YES | — | |
| away_team_id | uuid | YES | — | |
| scheduled_at | timestamptz | YES | — | date column (NOT game_date) |
| status | text | YES | — | "scheduled", "live", "final" |
| home_score | integer | YES | 0 | |
| away_score | integer | YES | 0 | |
| entry_type | text | YES | 'digital' | ⚠️ ALREADY EXISTS — default is 'digital' not 'live' |
| edited | boolean | YES | false | ⚠️ ALREADY EXISTS — column is `edited` not `is_edited` |
| player_of_game | uuid | YES | — | already exists |
| last_edited_by | — | — | — | ❌ DOES NOT EXIST — needs to be added |
| last_edited_at | — | — | — | ❌ DOES NOT EXIST — needs to be added |

## Audit tables

| table | exists |
|---|---|
| league_award_settings_audit | ✅ yes |
| game_edits_audit | ❌ NO — needs to be created |

## Migration 000023 — what to add

```sql
-- Add missing columns only (entry_type and edited already exist)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Create game_edits_audit table
CREATE TABLE IF NOT EXISTS game_edits_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT
);
```

## ⚠️ Critical notes for Step 2

- DO NOT add `entry_type` or `edited` — they already exist
- Column name is `edited` (not `is_edited`)
- `entry_type` default is `'digital'` (not `'live'`) — manual entries should set `entry_type = 'manual'`
- Only add: `last_edited_by`, `last_edited_at`
- Create: `game_edits_audit` table
