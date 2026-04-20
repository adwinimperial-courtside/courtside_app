# Base44 Category B Triage

**Date:** 2026-04-17  
**Input:** `docs/temp/base44-audit.md` — Category B files  
**Method:** Cross-referenced against `pages.config.js` (routing), `SidebarMenuContent.jsx` (navigation), and grep for all import references across `src/`

---

## How to read this

- **B-KEEP** — Routed, reachable from the sidebar, no rebuilt replacement. Must convert data calls to Supabase before any cleanup.
- **B-DELETE** — Not reachable (not routed, not in sidebar, not imported by any live page), OR the entire feature is base44-specific with no Supabase equivalent.
- **B-UNCLEAR** — Routed, but not in the sidebar and unclear if still needed. Win to decide.

---

## Pages

### B-KEEP Pages

| Page | In pages.config.js | In sidebar | Why keep |
|---|---|---|---|
| `src/pages/CoachInsights.jsx` | ✅ | ✅ navigationItems (all users) | Core feature. Loads League/Team/Game/PlayerStats/Player via base44. Note: imports `AITacticalBriefing` (Category A) — that import must be removed/replaced with a placeholder when this page is rebuilt. |
| `src/pages/PlayerProfile.jsx` | ✅ | ✅ playerNavItem (player/coach role) | Core feature for player/coach users. Loads UserLeagueIdentity, League, Team, Player, Game, PlayerStats. `PlayerDashboardCard` photo upload needs Supabase Storage. |
| `src/pages/Whiteboard.jsx` | ✅ | ✅ navigationItems (all users) | Only 2 base44 calls: `auth.me()` + `entities.League.list()`. Simplest migration in the B list. |
| `src/pages/UserRoles.jsx` | ✅ | ✅ ownerItems (app_admin only) | Admin user management. Fetches User, League, Team, UserLeagueIdentity lists. |
| `src/pages/UserManagement.jsx` | ✅ | ✅ ownerItems (app_admin only) | Uses `auth.me()` and renders `EnhancedUserManagement` + `PlayerIdentityAdmin` components — both are B-KEEP components. |
| `src/pages/RequestManagement.jsx` | ✅ | ✅ ownerItems as "Requests" | Uses `auth.me()` and renders `UserApplicationsReview` (B-KEEP component). |
| `src/pages/RosterUserMatching.jsx` | ✅ | ✅ ownerItems | Complex player-to-roster matching tool. Fetches League, Team, Player entities. |
| `src/pages/DeleteLeague.jsx` | ✅ | ✅ ownerItems | Destructive admin feature. Needs full rewrite — lists leagues and deletes all associated data. Supabase cascade deletes required. |

---

### B-DELETE Pages

| Page | Reason |
|---|---|
| `src/pages/ApplyForLeague.jsx` | **NOT in `pages.config.js`.** Sidebar shows "Request League Access" link via `createPageUrl("ApplyForLeague")` but that resolves to a broken route. Page is unreachable. |
| `src/pages/DataBackup.jsx` | Routed + in owner sidebar, BUT the entire feature iterates over 16 base44-only entities (`GameLog`, `LoginEvent`, `AIUsageCounter`, `TacticalBriefing`, `PendingUserAssignment`, `DeletionLog`, `User`, etc.) of which most do not exist in Supabase. The backup/restore cycle is entirely base44-specific and non-functional post-migration. |
| `src/pages/Viewers.jsx` | Routed but **not in any sidebar section**. Not linked from any other page. Thin wrapper that only renders `ViewersView` (a B-DELETE component). Superseded by `UserManagement`/`UserRoles`. |
| `src/pages/Coaches.jsx` | Routed but **not in any sidebar section**. Not linked from any other page. Thin wrapper for `CoachesView` (a B-DELETE component). Superseded by `UserManagement`/`UserRoles`. |
| `src/pages/LeagueOwners.jsx` | Routed but **not in any sidebar section**. Not linked from any other page. Thin wrapper for `LeagueOwnersView` (a B-DELETE component). Superseded by `UserManagement`/`UserRoles`. |

---

### B-UNCLEAR Pages (Win's decision)

| Page | Situation | Question for Win |
|---|---|---|
| `src/pages/LeagueIDs.jsx` | Routed, **not in sidebar**. Shows a simple read-only table of all league UUIDs (for admin reference). Only 1 base44 call: `entities.League.list()` — trivial to rebuild. | Is this still useful? If yes, takes 10 min to migrate. If not, delete. |
| `src/pages/FixManualStats.jsx` | Routed, **not in sidebar**, app_admin-only. Utility tool that recalculates/repairs manually entered stat totals across a selected league. Uses `entities.{League, Team, PlayerStats}`. | Is this still needed post-migration? If yes, rebuild with Supabase. If the stats are clean now, delete. |

---

## Admin Components

### B-KEEP Components (used by B-KEEP pages)

| Component | Used by | Base44 calls |
|---|---|---|
| `src/components/admin/EnhancedUserManagement.jsx` | `UserManagement` page | `entities.User.*` — replace with `supabase.from("profiles")` |
| `src/components/admin/PlayerIdentityAdmin.jsx` | `UserManagement` page | `entities.*` — replace with Supabase |
| `src/components/admin/BulkIdentityMatching.jsx` | `PlayerIdentityAdmin` | `entities.*` |
| `src/components/admin/PlayerIdentityDetailPanel.jsx` | `PlayerIdentityAdmin` | `entities.UserLeagueIdentity.*` |
| `src/components/admin/PlayerLeagueMatchModal.jsx` | `BulkIdentityMatching`, `PlayerIdentityDetailPanel` | `entities.*` |
| `src/components/admin/UserApplicationsReview.jsx` | `RequestManagement` page | `entities.{UserApplication, User}.*` |
| `src/components/admin/PlayerMatchModal.jsx` | `UserApplicationsReview` | `entities.*` |
| `src/components/player/PlayerDashboardCard.jsx` | `PlayerProfile` page | `integrations.Core.UploadFile()` + `auth.updateMe()` — replace with Supabase Storage + `supabase.auth.updateUser` |

---

### B-DELETE Components (orphaned — not imported by any live page)

These components are not imported or rendered anywhere in the app. Delete alongside their related pages.

**Admin components imported only by B-DELETE pages:**

| Component | Only imported by |
|---|---|
| `src/components/admin/ViewersView.jsx` | `Viewers` page (B-DELETE) |
| `src/components/admin/CoachesView.jsx` | `Coaches` page (B-DELETE) |
| `src/components/admin/LeagueOwnersView.jsx` | `LeagueOwners` page (B-DELETE) |

**Admin components with no importer at all:**

| Component | Notes |
|---|---|
| `src/components/admin/StatIntegrityChecker.jsx` | No import found anywhere in `src/` |
| `src/components/admin/ManualGameEntry.jsx` | No import found anywhere |
| `src/components/admin/EditGameEntry.jsx` | No import found anywhere |
| `src/components/admin/DeleteGameEntry.jsx` | No import found anywhere |
| `src/components/admin/PlayersView.jsx` | No import found anywhere |
| `src/components/admin/ApplicationAccess.jsx` | No import found anywhere |
| `src/components/admin/ApplyPendingAssignments.jsx` | No import found anywhere |
| `src/components/admin/LeagueAccessRequests.jsx` | No import found anywhere |
| `src/components/admin/ManageRequests.jsx` | No import found anywhere |
| `src/components/admin/PendingBaseUsers.jsx` | No import found anywhere |
| `src/components/admin/PendingUserManagement.jsx` | No import found anywhere |
| `src/components/admin/UserLeagueAssignment.jsx` | No import found anywhere |

**Other orphaned components:**

| Component | Notes |
|---|---|
| `src/components/registration/RegistrationGate.jsx` | No import found anywhere in `src/` |
| `src/components/registration/PlayerIdentityModal.jsx` | No import found anywhere |
| `src/components/player/PlayerProfileHeader.jsx` | No import found anywhere |
| `src/components/teams/PlayerManagement.jsx` | No import found anywhere |

---

## Additional findings not in original audit

These files also reference base44 but were not in the original Category B list:

| File | Issue |
|---|---|
| `src/App.jsx` (line 16) | Imports `AllPlayersView` page — which is Category A dead code (not routed, not in sidebar). This import line can be deleted. |
| `src/components/layout/SidebarMenuContent.jsx` | Links to `AllPlayersView`, `StoryBuilder` (Category A dead pages), and `ApplyForLeague` (B-DELETE) — all broken routes. These 3 sidebar entries should be removed. |

---

## Summary

| Classification | Count | Action |
|---|---|---|
| B-KEEP pages | 8 | Convert data calls to Supabase |
| B-KEEP components | 8 | Convert data calls to Supabase |
| B-DELETE pages | 5 | Delete files + remove from pages.config.js |
| B-DELETE components | 16 | Delete files |
| B-UNCLEAR pages | 2 | Win to decide |
| Bonus cleanups | 2 | Remove broken sidebar links + App.jsx import |
