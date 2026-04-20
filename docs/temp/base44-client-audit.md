# Base44 Client Audit — Main Project (feature/initial-schema)

## Step 1: Worktree Cleanup Result

All three Claude worktrees were already removed from disk. Orphan branches deleted:
- `claude/flamboyant-albattani-a11382` (was a0cc1ed)
- `claude/practical-mclaren-92fe7f` (was b3819d1)
- `claude/reverent-antonelli-cd9313` (was 2faae83)

`git worktree list` now shows only:
```
/Users/macm5pro/Projects/courtside  3e2b20a [feature/initial-schema]
```

---

## 1. src/api/base44Client.js — FULL CONTENTS

```js
// Stub — base44 is deprecated. Pages still referencing this will return empty data.
// Migrate each page to Supabase and remove this file.
const noop = () => Promise.resolve([]);
const noopObj = () => Promise.resolve({});

const entityProxy = new Proxy({}, {
  get: () => new Proxy({}, {
    get: () => noop,
  }),
});

export const base44 = {
  auth: {
    me: noopObj,
    logout: () => {},
    redirectToLogin: () => {},
  },
  entities: entityProxy,
  functions: { invoke: noop },
  integrations: { Core: { UploadFile: noop, InvokeLLM: noop } },
  analytics: { track: () => {} },
  appLogs: { logUserInApp: () => {} },
};
```

**Key finding:** `base44Client.js` is now a **stub/no-op shim**. Every method returns empty data or does nothing:
- `base44.auth.me()` → `Promise.resolve({})`
- `base44.entities.AnyEntity.list()` → `Promise.resolve([])`
- `base44.functions.invoke()` → `Promise.resolve([])`
- `base44.analytics.track()` → no-op

Any page still calling `base44.auth.me()` to get the current user will receive `{}`. Any entity query returns `[]`. **The base44 backend is fully disconnected.** Pages must be migrated to Supabase before they will show real data.

---

## 2. src/api/entities.js

**FILE DOES NOT EXIST** — deleted in the migration to Supabase.

---

## 3. src/api/integrations.js

**FILE DOES NOT EXIST** — deleted in the migration to Supabase.

---

## 4. supabase/migrations/ — Full Listing

```
total 392
-rw-r--r--   0 bytes   20260408181041_remote_schema.sql          (EMPTY — placeholder)
-rw-r--r--  23 KB      20260415000000_initial_schema.sql
-rw-r--r--   151 B     20260415000001_add_default_league.sql
-rw-r--r--  68 KB      20260415000002_test_data.sql
-rw-r--r--   704 B     20260415000003_team_and_player_fields.sql
-rw-r--r--  1.4 KB     20260415000004_game_fields.sql
-rw-r--r--  1.8 KB     20260415000005_game_live_fields.sql
-rw-r--r--  1.1 KB     20260415000006_replica_identity_full.sql
-rw-r--r--  1.5 KB     20260415000007_player_stats_live_fields.sql
-rw-r--r--   981 B     20260415000008_players_name_column.sql
-rw-r--r--  3.1 KB     20260415000009_game_logs_table.sql
-rw-r--r--   676 B     20260416000010_lineup_repair_lock.sql
-rw-r--r--   500 B     20260416000011_player_stats_is_active.sql
-rw-r--r--   275 B     20260416000013_profiles_user_type.sql
-rw-r--r--   518 B     20260416000014_profiles_auto_create.sql
-rw-r--r--  1.2 KB     20260416000015_league_applications.sql
-rw-r--r--   111 B     20260416000016_leagues_public_read.sql
-rw-r--r--  1.1 KB     20260416000017_league_applications_rls.sql
-rw-r--r--  6.6 KB     20260416000018_league_award_settings.sql
-rw-r--r--   334 B     20260416000019_audit_insert_policy.sql
-rw-r--r--   362 B     20260416000020_audit_changed_by_fk.sql
-rw-r--r--  1.1 KB     20260416000023_admin_tools_audit.sql
-rw-r--r--   383 B     20260416000025_audit_game_deleted.sql
-rw-r--r--   761 B     20260416000026_profiles_email_last_active.sql
-rw-r--r--  1.2 KB     20260416000027_ulm_profiles_fk.sql
-rw-r--r--  1.7 KB     20260416000028_league_invitations.sql
-rw-r--r--  3.0 KB     20260419000028_whiteboard_plays.sql
-rw-r--r--   971 B     20260420000001_create_impersonation_log.sql   ← newest
```

28 migration files total. The `impersonation_log` table was added on 2026-04-20 (the most recent migration).

---

## 5. All base44.entities Usages — Frequency Count

These are the entity references still alive in `src/` (all going to the stub, returning `[]`):

```
17  base44.entities.User
17  base44.entities.League
15  base44.entities.Team
13  base44.entities.PlayerStats
11  base44.entities.UserLeagueIdentity
10  base44.entities.Player
10  base44.entities.Game
 7  base44.entities.PendingUserAssignment
 4  base44.entities.UserApplication
 2  base44.entities.LeagueSetupRequest
 2  base44.entities.LeagueAccessRequest
 1  base44.entities.GameLog
 1  base44.entities.DeletionLog
```

**Total: 110 entity call-sites across 13 entity types.** Every one of these currently returns `[]` or `{}` because `base44Client.js` is a stub.

---

## Summary

| Item | State |
|---|---|
| `base44Client.js` | **Stub/no-op shim** — all methods return empty data |
| `entities.js` | Deleted |
| `integrations.js` | Deleted |
| Supabase migrations | 28 files, newest is `impersonation_log` (Apr 20) |
| Remaining base44 call-sites | 110 across 13 entity types — all returning empty |
| `base44.auth.me()` callers | Still present in many pages — all returning `{}` |

The main project is in a **broken intermediate state**: base44 is stubbed out but Supabase client has not yet been wired into the pages that need it. Any page relying on `base44.entities.*` or `base44.auth.me()` is showing empty/blank data in production.
