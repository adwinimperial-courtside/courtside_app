# Migration 000015 — league_applications
**Date:** 2026-04-16
**File:** supabase/migrations/20260416000015_league_applications.sql

## Push output

```
Initialising login role...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20260416000015_league_applications.sql

 [Y/n]
Applying migration 20260416000015_league_applications.sql...
Finished supabase db push.
```

## Result
✅ Applied successfully.

## Table created: public.league_applications

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| user_id | uuid | FK → auth.users, CASCADE DELETE |
| requested_role | text | CHECK: league_admin / coach / player / viewer |
| status | text | DEFAULT 'pending', CHECK: pending / approved / rejected |
| full_name | text | NOT NULL |
| country | text | nullable |
| league_id | uuid | FK → leagues, SET NULL on delete |
| team_name | text | nullable |
| nickname | text | nullable |
| league_name | text | nullable (for new league requests) |
| season_start_date | date | nullable |
| num_teams | integer | nullable |
| avg_players_per_team | integer | nullable |
| reviewed_by | uuid | FK → auth.users, SET NULL on delete |
| reviewed_at | timestamptz | nullable |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

## Indexes created
- `idx_league_applications_user_id`
- `idx_league_applications_status`
- `idx_league_applications_league_id`
