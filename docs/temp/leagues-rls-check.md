# RLS Policies — `leagues` table

Query: `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'leagues';`

| policyname | cmd | qual |
|---|---|---|
| leagues: app_admin full access | ALL | `is_app_admin()` |
| leagues: league_admin can update | UPDATE | `get_my_league_role(id) = 'league_admin'` |
| leagues: members can read | SELECT | `get_my_league_role(id) IS NOT NULL` |

## Notes

- **SELECT** is gated on `get_my_league_role(id) IS NOT NULL` — a user can only read a league row if they have a role in it (i.e. an active membership).
- **No public/anon SELECT** — unauthenticated users and users with no membership cannot see any league rows.
- **INSERT** — no policy exists; only `app_admin` can insert (covered by the ALL policy).
- **UPDATE** — league_admin can update their own league; app_admin can update all.
- The `get_my_league_role()` function is likely doing a lookup against `user_league_memberships`, so a user with zero active memberships will get `NULL` and see no leagues.
