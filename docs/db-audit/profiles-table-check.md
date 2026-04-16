# profiles table — column audit
**Query:** `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles';`
**Date:** 2026-04-16

| column_name | data_type |
|-------------|-----------|
| id | uuid |
| display_name | text |
| avatar_url | text |
| timezone | text |
| preferred_locale | text |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |
| default_league_id | uuid |

## Notes
- `user_type` column is **missing** — needs to be added via migration for ADR-003 role model
- `id` is the FK to `auth.users.id`
