# Base44 File Categorization

Working directory confirmed: `/Users/macm5pro/Projects/courtside`
Branch: `feature/initial-schema`

Legend for IMPORTED_BY:
- **ORPHANED** = no other src file imports this component
- **ORPHANED CHAIN** = only imported by another orphaned component
- Component names are abbreviated to filename only

---

## FILE | BASE44_CALLS | IMPORTED_BY

### src/api/

| File | Base44 Calls | Imported By |
|---|---|---|
| `src/api/base44Client.js` | (stub — defines the shim) | All 36 files below |

---

### src/components/admin/ (24 files)

| File | Base44 Calls | Imported By |
|---|---|---|
| `ApplicationAccess.jsx` | `asServiceRole.entities.User.list` `asServiceRole.entities.User.update` `asServiceRole.entities.User.delete` | **ORPHANED** |
| `ApplyPendingAssignments.jsx` | `auth.me` `entities.PendingUserAssignment.filter` `entities.PendingUserAssignment.update` `entities.User.update` | **ORPHANED** — Layout.jsx was refactored and no longer imports this |
| `BulkIdentityMatching.jsx` | `entities.Player.list` `entities.Team.list` `entities.UserLeagueIdentity.filter` `functions.invoke` | **ORPHANED CHAIN** — imported only by PlayerIdentityAdmin.jsx (itself orphaned) |
| `CoachesView.jsx` | `entities.League.list` `entities.User.list` | `pages/Coaches.jsx` |
| `DeleteGameEntry.jsx` | `auth.me` `entities.DeletionLog.create` `entities.Game.delete` `entities.Game.filter` `entities.PlayerStats.delete` `entities.PlayerStats.filter` `entities.Team.update` | **ORPHANED** — AdminTools.jsx rewritten, no longer imports this |
| `EditGameEntry.jsx` | `entities.Game.filter` `entities.Game.update` `entities.PlayerStats.create` `entities.PlayerStats.delete` `entities.PlayerStats.filter` `entities.PlayerStats.update` | **ORPHANED** — AdminTools.jsx rewritten, no longer imports this |
| `EnhancedUserManagement.jsx` | `entities.League.list` `entities.PendingUserAssignment.create` `entities.User.delete` `entities.User.list` `entities.User.update` `functions.invoke` `users.inviteUser` | **ORPHANED** — old UserManagement page deleted |
| `LeagueAccessRequests.jsx` | `entities.League.list` `entities.LeagueAccessRequest.list` `entities.LeagueAccessRequest.update` `entities.User.list` `functions.invoke` | **ORPHANED** |
| `LeagueOwnersView.jsx` | `entities.League.list` `entities.User.list` | **ORPHANED** |
| `ManageRequests.jsx` | `entities.LeagueSetupRequest.list` `entities.LeagueSetupRequest.update` | **ORPHANED** |
| `ManualGameEntry.jsx` | `entities.Game.create` `entities.PlayerStats.create` `entities.Team.update` | **ORPHANED** — AdminTools.jsx rewritten, no longer imports this |
| `PendingBaseUsers.jsx` | `functions.invoke` | **ORPHANED** |
| `PendingUserManagement.jsx` | `entities.League.list` `entities.PendingUserAssignment.create` `entities.PendingUserAssignment.delete` `entities.PendingUserAssignment.filter` `entities.PendingUserAssignment.update` | **ORPHANED** |
| `PlayerIdentityAdmin.jsx` | `entities.League.list` `entities.Team.list` `entities.User.filter` `entities.User.update` `entities.UserLeagueIdentity.list` | **ORPHANED** |
| `PlayerIdentityDetailPanel.jsx` | `entities.User.update` `functions.invoke` | **ORPHANED CHAIN** — imported only by PlayerIdentityAdmin.jsx (orphaned) |
| `PlayerLeagueMatchModal.jsx` | `entities.UserLeagueIdentity.update` `functions.invoke` | **ORPHANED CHAIN** — imported by PlayerIdentityDetailPanel.jsx and BulkIdentityMatching.jsx (both orphaned) |
| `PlayerMatchModal.jsx` | `entities.Player.list` `entities.UserLeagueIdentity.create` `entities.UserLeagueIdentity.filter` `entities.UserLeagueIdentity.update` `functions.invoke` | **ORPHANED CHAIN** — imported only by UserApplicationsReview.jsx (orphaned) |
| `PlayersView.jsx` | `entities.League.list` `entities.User.list` | **ORPHANED** |
| `StatIntegrityChecker.jsx` | `entities.Game.filter` `entities.GameLog.filter` `entities.PlayerStats.filter` `entities.PlayerStats.update` | **ORPHANED** — AdminTools.jsx rewritten, no longer imports this |
| `UserApplicationsReview.jsx` | `entities.League.list` `entities.Team.list` `entities.UserApplication.filter` `functions.invoke` | **ORPHANED** |
| `UserLeagueAssignment.jsx` | `entities.League.list` `entities.User.list` `entities.User.update` | **ORPHANED** |
| `UserManagement.jsx` | `entities.League.list` `entities.User.list` `entities.User.update` | **ORPHANED** — UserManagement page deleted |
| `ViewersView.jsx` | `entities.League.list` `entities.User.list` | `pages/Viewers.jsx` |

---

### src/components/player/

| File | Base44 Calls | Imported By |
|---|---|---|
| `PlayerDashboardCard.jsx` | `auth.updateMe` | `pages/PlayerProfile.jsx` |
| `PlayerProfileHeader.jsx` | `auth.updateMe` | **ORPHANED** — not imported by any current file |

---

### src/components/registration/

| File | Base44 Calls | Imported By |
|---|---|---|
| `PlayerIdentityModal.jsx` | `auth.updateMe` `entities.League.list` `entities.Player.list` `entities.Team.list` `entities.UserLeagueIdentity.create` | **ORPHANED** — Layout.jsx was refactored and no longer imports this |
| `RegistrationGate.jsx` | `auth.logout` `auth.updateMe` `entities.Team.list` `entities.UserApplication.create` `functions.invoke` | **ORPHANED** — Layout.jsx was refactored and no longer imports this |

---

### src/components/teams/

| File | Base44 Calls | Imported By |
|---|---|---|
| `PlayerManagement.jsx` | `entities.Player.create` `entities.Player.delete` `entities.Player.filter` `entities.Player.update` `entities.Team.filter` `entities.Team.update` | **ORPHANED** — not imported by any current file |

---

### src/pages/

| File | Base44 Calls | Imported By |
|---|---|---|
| `ApplyForLeague.jsx` | `auth.me` `entities.League.list` `entities.Team.list` `entities.UserApplication.create` `entities.UserApplication.filter` | `App.jsx`, `SidebarMenuContent.jsx` |
| `CoachInsights.jsx` | `auth.me` `entities.Game.list` `entities.League.list` `entities.Player.list` `entities.PlayerStats.list` `entities.Team.list` | `pages.config.js`, `SidebarMenuContent.jsx` |
| `Coaches.jsx` | `auth.me` | `pages.config.js` |
| `FixManualStats.jsx` | `auth.me` `entities.Game.filter` `entities.Game.update` `entities.League.list` `entities.PlayerStats.filter` `entities.PlayerStats.update` `entities.Team.list` | `pages.config.js` |
| `LeagueIDs.jsx` | `entities.League.list` | `pages.config.js` |
| `PlayerProfile.jsx` | `auth.me` `entities.Game.filter` `entities.League.list` `entities.Player.filter` `entities.PlayerStats.list` `entities.Team.list` `entities.UserLeagueIdentity.filter` | `pages.config.js`, `SidebarMenuContent.jsx` |
| `Viewers.jsx` | `auth.me` | `pages.config.js` |
| `Whiteboard.jsx` | `auth.me` (+ also uses `supabase` directly — partially migrated) | `pages.config.js`, `SidebarMenuContent.jsx` |

---

## Summary

### By category

| Category | Count | Notes |
|---|---|---|
| **Fully orphaned** (safe to delete/ignore) | 18 | No live page or layout mounts them |
| **Orphaned chain** (only referenced by other orphans) | 4 | BulkIdentityMatching, PlayerIdentityDetailPanel, PlayerLeagueMatchModal, PlayerMatchModal |
| **Reachable via live pages** | 5 | CoachesView (via Coaches), ViewersView (via Viewers), PlayerDashboardCard (via PlayerProfile), PlayerManagement† |
| **Live pages** still calling base44 | 8 | ApplyForLeague, CoachInsights, Coaches, FixManualStats, LeagueIDs, PlayerProfile, Viewers, Whiteboard† |

† `PlayerManagement` — no import found but Teams page may reference it; `Whiteboard` — partially migrated, also uses Supabase directly.

### Orphaned files (22 total — nothing in the live app loads these)

```
src/components/admin/ApplicationAccess.jsx
src/components/admin/ApplyPendingAssignments.jsx
src/components/admin/BulkIdentityMatching.jsx
src/components/admin/DeleteGameEntry.jsx
src/components/admin/EditGameEntry.jsx
src/components/admin/EnhancedUserManagement.jsx
src/components/admin/LeagueAccessRequests.jsx
src/components/admin/LeagueOwnersView.jsx
src/components/admin/ManageRequests.jsx
src/components/admin/ManualGameEntry.jsx
src/components/admin/PendingBaseUsers.jsx
src/components/admin/PendingUserManagement.jsx
src/components/admin/PlayerIdentityAdmin.jsx
src/components/admin/PlayerIdentityDetailPanel.jsx
src/components/admin/PlayerLeagueMatchModal.jsx
src/components/admin/PlayerMatchModal.jsx
src/components/admin/PlayersView.jsx
src/components/admin/StatIntegrityChecker.jsx
src/components/admin/UserApplicationsReview.jsx
src/components/admin/UserLeagueAssignment.jsx
src/components/admin/UserManagement.jsx
src/components/player/PlayerProfileHeader.jsx
src/components/registration/PlayerIdentityModal.jsx
src/components/registration/RegistrationGate.jsx
src/components/teams/PlayerManagement.jsx
```

### Pages that need Supabase migration to become functional (all 8 call base44.auth.me → returns {})

```
src/pages/ApplyForLeague.jsx     — auth.me + 4 entity types
src/pages/CoachInsights.jsx      — auth.me + 5 entity types
src/pages/Coaches.jsx            — auth.me only (thin wrapper)
src/pages/FixManualStats.jsx     — auth.me + 3 entity types
src/pages/LeagueIDs.jsx          — 1 entity type (no auth.me)
src/pages/PlayerProfile.jsx      — auth.me + 5 entity types (most complex)
src/pages/Viewers.jsx            — auth.me only (thin wrapper)
src/pages/Whiteboard.jsx         — auth.me only (rest already on Supabase)
```
