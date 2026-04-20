# Audit Data Check — 2026-04-16

## Query 1: SELECT * FROM league_award_settings_audit ORDER BY changed_at DESC LIMIT 10

✅ 7 rows found — audit inserts ARE working.

| id | changed_at | award_type | field_name | old_value | new_value | changed_by |
|---|---|---|---|---|---|---|
| 84961020 | 2026-04-16 18:49 | mythical_five | mythical_count | 7 | 5 | 425cb41e |
| c24e538c | 2026-04-16 18:44 | mythical_five | mythical_count | 5 | 7 | 425cb41e |
| bd7f7b03 | 2026-04-16 18:41 | pog | pog_oreb_weight | 1.2 | 1.3 | 425cb41e |
| bc06f2ff | 2026-04-16 18:38 | pog | pog_winning_team_only | true | false | 425cb41e |
| 876a51a4 | 2026-04-16 18:38 | pog | pog_to_penalty | 2 | 1.5 | 425cb41e |
| 16d3b647 | 2026-04-16 18:38 | dpoy | dpoy_blk_weight | 2.5 | 2.7 | 425cb41e |
| dbaf71f1 | 2026-04-16 18:33 | pog | pog_dreb_weight | 1 | 1.2 | 425cb41e |

## Query 2: LEFT JOIN profiles ON p.full_name

❌ ERROR: column p.full_name does not exist

## Actual profiles columns

| column | type |
|---|---|
| id | uuid |
| display_name | text |  ← correct column name
| avatar_url | text |
| timezone | text |
| preferred_locale | text |
| created_at | timestamptz |
| updated_at | timestamptz |
| default_league_id | uuid |
| user_type | text |

## Root Cause

The ChangeHistory component queries `profiles(full_name)` but the column is `display_name`.
This causes PostgREST to return a 400 error, `data` is null, history renders empty.

## Fix

Change all references from `profiles(full_name)` / `r.profiles?.full_name` to `display_name`.
