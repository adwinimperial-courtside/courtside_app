# OWNER Menu Audit

Audited: `src/components/layout/SidebarMenuContent.jsx` → `ownerItems` array (visible only when `isAppAdmin === true`).

## Findings

| # | Menu Item | Page Key / URL | Page File | Exists? | In pages.config? | Used by other sidebar sections? |
|---|---|---|---|---|---|---|
| 1 | Requests | `RequestManagement` | `src/pages/RequestManagement.jsx` | ✅ | ✅ | ❌ |
| 2 | User Management | `UserManagement` | `src/pages/UserManagement.jsx` | ✅ | ✅ | ❌ |
| 3 | User Roles | `UserRoles` | `src/pages/UserRoles.jsx` | ✅ | ✅ | ❌ |
| 4 | Analytics | `Analytics` | `src/pages/Analytics.jsx` | ❌ | ❌ | ❌ (dead link) |
| 5 | Delete League | `DeleteLeague` | `src/pages/DeleteLeague.jsx` | ✅ | ✅ | ❌ |
| 6 | Data Backup | `DataBackup` | `src/pages/DataBackup.jsx` | ✅ | ✅ | ❌ |
| 7 | Roster User Matching | `RosterUserMatching` | `src/pages/RosterUserMatching.jsx` | ✅ | ✅ | ❌ |
| 8 | All Players | `AllPlayersView` | `src/pages/AllPlayersView.jsx` | ❌ | ❌ | ❌ (dead link) |
| 9 | Season Recap | `/RegularSeasonRecap` (hardcoded, bypasses `createPageUrl`) | `src/pages/RegularSeasonRecap.jsx` | ❌ | ❌ | ❌ (dead link) |

## Dead links (3)
- **Analytics** — no page file, no config entry
- **All Players (`AllPlayersView`)** — no page file, no config entry
- **Season Recap (`/RegularSeasonRecap`)** — no page file, no config entry; URL hardcoded (unusual — every other item uses `createPageUrl(...)`)

## Live links (6) — files + registrations exist
RequestManagement, UserManagement, UserRoles, DeleteLeague, DataBackup, RosterUserMatching.

## Overlap with other sidebar sections
None. The OWNER items do not appear in `navigationItems`, `leagueAdminItems`, or `playerNavItem`. Removing the OWNER section will not break any other menu group.

## Related files worth noting
- `src/pages/LeagueOwners.jsx` exists and is registered in `pages.config.js` but is **not** referenced by any sidebar item. (Orphan — not part of OWNER menu, but flagged since name is similar.)
