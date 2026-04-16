# user_league_memberships table — column audit
**Query:** `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_league_memberships';`
**Date:** 2026-04-16

| column_name | data_type |
|-------------|-----------|
| id | uuid |
| user_id | uuid |
| league_id | uuid |
| role | text |
| is_active | boolean |
| is_billing_admin | boolean |
| invited_by | uuid |
| joined_at | timestamp with time zone |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |

## Notes
- `user_id` → FK to `auth.users.id`
- `league_id` → FK to `leagues.id`
- `role` → text (values expected: `league_admin`, `coach`, `player`, `viewer`)
- `is_active` → membership active flag (used in LeagueSelection query)
- `is_billing_admin` → billing flag, not currently used in frontend
- `invited_by` → FK to `auth.users.id`, nullable
- Table is fully functional — LeagueSelection.jsx already queries it correctly
