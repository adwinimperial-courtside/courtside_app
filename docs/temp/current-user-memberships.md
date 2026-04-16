# user_league_memberships — current data
**Query:** `SELECT ulm.user_id, ulm.league_id, ulm.role, ulm.is_active, au.email FROM user_league_memberships ulm JOIN auth.users au ON au.id = ulm.user_id ORDER BY ulm.created_at DESC LIMIT 10;`
**Date:** 2026-04-16

| email | user_id | league_id | role | is_active |
|-------|---------|-----------|------|-----------|
| adwin.imperial@gmail.com | 425cb41e-6d1f-405f-b871-9b306b9f3c1a | a1000000-0000-0000-0000-000000000001 | league_admin | true |

## Notes
- 1 active membership exists — adwin.imperial@gmail.com as league_admin for the Korisliiga Pro league
- This user will be routed directly to `/LeagueSelection` by the updated Home.jsx logic
- No other registered users yet
