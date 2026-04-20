# Supabase Table Inventory & Base44 Entity Mapping

Working directory confirmed: `/Users/macm5pro/Projects/courtside`
Branch: `feature/initial-schema`

---

## 1. Remote Supabase Tables (public schema)

20 tables confirmed on the remote database:

| # | Table Name |
|---|---|
| 1 | `game_edits_audit` |
| 2 | `game_logs` |
| 3 | `games` |
| 4 | `id_mapping` |
| 5 | `impersonation_log` |
| 6 | `league_applications` |
| 7 | `league_award_settings` |
| 8 | `league_award_settings_audit` |
| 9 | `league_invitations` |
| 10 | `league_subscriptions` |
| 11 | `leagues` |
| 12 | `pending_user_assignments` |
| 13 | `player_stats` |
| 14 | `players` |
| 15 | `profiles` |
| 16 | `teams` |
| 17 | `user_applications` |
| 18 | `user_league_identity` |
| 19 | `user_league_memberships` |
| 20 | `whiteboard_plays` |

---

## 2. Base44 Entity → Supabase Table Mapping

| Base44 Entity | Supabase Table | Confidence |
|---|---|---|
| `User` | `profiles` (+ Supabase Auth) | High |
| `League` | `leagues` | High |
| `Team` | `teams` | High |
| `Game` | `games` | High |
| `Player` | `players` | High |
| `PlayerStats` | `player_stats` | High |
| `GameLog` | `game_logs` | High |
| `UserLeagueIdentity` | `user_league_identity` | High |
| `PendingUserAssignment` | `pending_user_assignments` | High |
| `UserApplication` | `user_applications` | High |
| `LeagueAccessRequest` | `league_applications` | High (same concept, different naming) |
| `LeagueSetupRequest` | No direct table — likely base44-only entity | Unknown |
| `DeletionLog` | No direct table found in migrations | Unknown |
| `TacticalBriefing` | No direct table found in migrations | Unknown |
| `AIUsageCounter` | No direct table found in migrations | Unknown |
| `AwardSettings` | `league_award_settings` | High |

---

## 3. Entity Field Inventory (from grep of call sites)

### `UserLeagueIdentity` → `user_league_identity`

Fields used in create/update calls:
- `user_id`
- `league_id`
- `team_id`
- `matched_player_id`
- `matched_player_name`
- `match_method` (values: `"manual_admin"`)
- `identity_record_id` (used as the row `id` when calling `.update()`)
- `role` (referenced in PlayerIdentityModal)
- `display_name` (read from user, passed into identity context)

Filter patterns seen:
- `.filter({ user_id: currentUser.id })`
- `.filter({ league_id: sourceLeagueId })`
- `.list("-created_date", 5000)`

---

### `PendingUserAssignment` → `pending_user_assignments`

Fields used in create/update calls:
- `email` (lowercase, used as lookup key)
- `user_type` (values: `"viewer"`, `"player"`, `"coach"`, `"league_admin"`)
- `assigned_league_ids` (array of UUIDs)
- `default_league_id` (nullable UUID)
- `applied` (boolean — false = pending, true = already applied to user)

Filter patterns seen:
- `.filter({ applied: false })`
- `.filter({ email: currentUser.email.toLowerCase(), applied: false })`

When applied: sets `user_type`, `assigned_league_ids` on the User record, then marks `applied: true`.

---

### `LeagueSetupRequest` — no Supabase table found

Fields used:
- `league_name`
- `contact_person`
- `email`
- `message`
- `status` (values: `"pending"`, `"done"`)
- `created_date`

Used only in `src/components/admin/ManageRequests.jsx` — list and update status. This entity may exist only in base44's backend (no corresponding migration). **Needs a table or can be dropped if feature is being removed.**

---

### `LeagueAccessRequest` → `league_applications`

Fields used:
- `user_id`
- `status` (values: `"pending"`, `"approved"`, `"rejected"`)
- `created_date`
- (from LeagueAccessRequests.jsx) `requestId` used as row id for `.update()`

Used in `src/components/admin/LeagueAccessRequests.jsx` — list all, approve/reject.

---

### `DeletionLog` — no Supabase table found

Fields used (only one call site — `DeleteGameEntry.jsx:65`):
- `entity_type` (value: `'Game'`)
- `entity_id`
- `entity_details` (string: `"HomeTeam vs AwayTeam - Date (Score: X-Y)"`)
- `deleted_by` (user email)
- `deletion_date` (ISO timestamp)

One write-only call. No reads found. **No migration creates this table.** Either needs a new migration or the feature can log to `game_edits_audit` instead.

---

## 4. Tables in Supabase With No Base44 Entity Counterpart

These tables exist in the DB but have no `base44.entities.*` call in the current codebase:

| Table | Notes |
|---|---|
| `game_edits_audit` | Written by DB triggers (audit trail for game edits) |
| `id_mapping` | Unknown — no frontend usage found |
| `impersonation_log` | Written by `mint-impersonation-token` Edge Function |
| `league_award_settings_audit` | Written by DB triggers |
| `league_invitations` | Used by `AcceptInvite.jsx` page (new, untracked) |
| `league_subscriptions` | No frontend usage found |
| `user_league_memberships` | Referenced in SQL functions but no direct frontend entity |
| `whiteboard_plays` | Used via Supabase client directly in `Whiteboard.jsx` (already migrated) |

---

## Summary

- **20 tables** confirmed on remote Supabase
- **13 base44 entities** still referenced in code
- **10 entities** have clear 1:1 Supabase table equivalents
- **3 entities** (`LeagueSetupRequest`, `DeletionLog`, `TacticalBriefing`) have no matching migration — need investigation before migration
- **8 Supabase tables** have no base44 entity (managed by triggers, edge functions, or direct Supabase client)
