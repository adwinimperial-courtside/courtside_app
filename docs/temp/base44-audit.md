# Base44 Audit

**Date:** 2026-04-17  
**Scope:** All `base44`, `Base44`, `NavigationTracker` references in `/Users/macm5pro/Projects/courtside`  
**Method:** grep across all src/, base44/, config files  

---

## Summary Counts

| Category | Files |
|---|---|
| A — Dead code (delete entirely) | 21 |
| B — Active data calls (replace with Supabase) | 33 |
| C — Configuration | 3 |

---

## Category A — Dead Code

These files exist solely for Base44 and serve no purpose in the migrated app. Delete entirely (or remove the specific lines noted).

---

### A1. `src/api/base44Client.js`
**What it does:** Initialises the Base44 SDK client using `app-params.js` (reads `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL` from env/localStorage/URL). Exports the `base44` object used by all other Base44 calls.  
**Action:** Delete this file once all Category B files are migrated. It becomes unreachable at that point.

---

### A2. `src/api/entities.js`
**What it does:** Re-exports `base44.entities.Query` and `base44.auth` as named exports. Not imported by any active page — only ever used by the Base44 migration context.  
**Action:** Delete entirely.

---

### A3. `src/api/integrations.js`
**What it does:** Re-exports `base44.integrations.Core` and individual integration helpers (InvokeLLM, SendEmail, SendSMS, UploadFile, GenerateImage, ExtractDataFromUploadedFile). No Supabase equivalent exists for these services.  
**Action:** Delete entirely. Any features relying on these (AI briefings, email sending) will need new integrations if they are to be rebuilt.

---

### A4. `src/lib/NavigationTracker.jsx`
**What it does:** Uses `base44.appLogs.logUserInApp(pageName)` to log page views to Base44 analytics on every route change. Provides no user-visible functionality.  
**Action:** Delete file. Also remove the import and `<NavigationTracker />` from `src/App.jsx` lines 6 and 82.

---

### A5. `src/lib/AuthContextBase44.jsx`
**What it does:** A legacy auth context that fetches public settings from `base44.com` using `app-params` (appId, serverUrl, token). The active app uses `src/lib/AuthContext.jsx` (Supabase-based). This file is not imported anywhere except itself.  
**Action:** Delete entirely.

---

### A6. `src/lib/app-params.js`
**What it does:** Reads `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL`, `access_token`, and `functions_version` from URL params, localStorage (under `base44_*` keys), and env vars. Used only by `base44Client.js` and `AuthContextBase44.jsx`.  
**Action:** Delete entirely once A1 and A5 are deleted.

---

### A7. `src/pages/Analytics.jsx`
**What it does:** Admin analytics dashboard that calls `base44.functions.invoke("getLoginAnalytics", ...)` for today's actives, daily active history, user search, and user login history. All data comes from a Base44 backend function with no Supabase equivalent.  
**Action:** Delete entirely. If login analytics are wanted in future, rebuild against Supabase.

---

### A8. `src/pages/RegularSeasonRecap.jsx`
**What it does:** Calls `base44.entities.{League, Team, Player, Game, PlayerStats}` and `base44.integrations.Core.InvokeLLM` to generate an AI season recap. **Not registered in `pages.config.js`** — unreachable in the app.  
**Action:** Delete entirely. Not routed, and the LLM dependency has no replacement.

---

### A9. `src/pages/AllPlayersView.jsx`
**What it does:** Calls `base44.entities.{Player, Team, League}` and `base44.auth.me()`. **Not registered in `pages.config.js`** — unreachable in the app.  
**Action:** Delete entirely.

---

### A10. `src/pages/StoryBuilder.jsx`
**What it does:** Calls `base44.entities.{AIUsageCounter, League, Game, GameLog}` and `base44.auth.me()`. `AIUsageCounter`, `GameLog`, and `TacticalBriefing` are Base44-only entities with no Supabase table equivalents. **Not registered in `pages.config.js`** — unreachable in the app.  
**Action:** Delete entirely.

---

### A11. `src/components/insights/AITacticalBriefing.jsx`
**What it does:** Calls `base44.entities.TacticalBriefing`, `base44.entities.AIUsageCounter`, and `base44.integrations.Core.InvokeLLM` to generate AI coaching briefings. Relies entirely on Base44-only entities and integrations with no Supabase equivalent.  
**Action:** Delete entirely.

---

### A12–A26. `base44/` directory (15 functions + 3 entity schemas)

All files in `base44/` are Base44-platform artefacts. None are executed by the Vite frontend — they ran on Base44's serverless infrastructure.

| File | What it does |
|---|---|
| `base44/entities/AwardSettings.jsonc` | Schema for the AwardSettings entity (superseded by `league_award_settings` Supabase table) |
| `base44/entities/Game.jsonc` | Schema for the Game entity (superseded by `games` Supabase table) |
| `base44/entities/UserApplication.jsonc` | Schema for user role application entity |
| `base44/functions/approvePendingUser/entry.ts` | Approves/rejects pending users via `base44.asServiceRole.entities.User` |
| `base44/functions/approveLeagueAccess/entry.ts` | Approves league access requests |
| `base44/functions/approveUserApplication/entry.ts` | Approves/rejects user applications, assigns leagues |
| `base44/functions/applyRosterMatches/entry.ts` | Matches players to rosters via Base44 entities |
| `base44/functions/getPublicLeagues/entry.ts` | Lists public leagues via `base44.asServiceRole.entities.League` |
| `base44/functions/getLoginAnalytics/entry.ts` | Returns login analytics from Base44 LoginEvent entity |
| `base44/functions/getLiveVisitors/entry.ts` | Gets live visitors (uses Base44 LLM integration) |
| `base44/functions/getPendingDashboardUsers/entry.ts` | Lists pending users via Base44 User entity |
| `base44/functions/getLeagueUsers/entry.ts` | Lists all users via Base44 User entity |
| `base44/functions/matchPlayerLeagues/entry.ts` | Matches players to leagues via Base44 entities |
| `base44/functions/notifyNewApplications/entry.ts` | Sends email via `base44.asServiceRole.integrations.Core.SendEmail` |
| `base44/functions/notifyPendingRequest/entry.ts` | Sends email for pending league access requests |
| `base44/functions/recordLoginEvent/entry.ts` | Logs login events via Base44 LoginEvent entity |
| `base44/functions/sendAccessApprovedEmail/entry.ts` | Sends approval email via Base44 integrations |
| `base44/functions/updateUserFullName/entry.ts` | Updates user full_name via Base44 User entity |

**Action:** Delete the entire `base44/` directory.

---

## Category B — Active Data Calls

These files are routed/used in the live app and have Base44 data-fetching calls that must be replaced with direct Supabase queries before the files can be cleaned up.

### Pages

| File | Base44 calls | Replacement notes |
|---|---|---|
| `src/pages/CoachInsights.jsx` | `auth.me()`, `entities.{League, Team, Game, PlayerStats, Player}.list()` | Replace `auth.me()` → `supabase.auth.getUser()`. Replace entity calls → `supabase.from(...)` queries matching Statistics page pattern. |
| `src/pages/PlayerProfile.jsx` | `auth.me()`, `entities.{UserLeagueIdentity, League, Team, Player, Game, PlayerStats}` | Replace auth + all entity queries with Supabase. `UserLeagueIdentity` maps to `user_league_identities` table. |
| `src/pages/Whiteboard.jsx` | `auth.me()`, `entities.League.list()` | Replace `auth.me()` → `supabase.auth.getUser()`. Replace League query → `supabase.from("leagues")`. |
| `src/pages/ApplyForLeague.jsx` | `functions.invoke("getPublicLeagues")`, `entities.{Team, UserApplication}`, `auth.updateMe()`, `auth.logout()` | Replace getPublicLeagues → `supabase.from("leagues")`. UserApplication → `user_applications` table. `auth.updateMe` → `supabase.auth.updateUser`. |
| `src/pages/UserRoles.jsx` | `auth.me()`, `entities.{User, League, Team, UserLeagueIdentity}.list()` | Replace auth + all entity queries. `User` list → `supabase.from("profiles")`. |
| `src/pages/UserManagement.jsx` | `auth.me()` only (thin wrapper, delegates to admin components) | Replace `auth.me()` → `supabase.auth.getUser()`. Component B-series must be fixed too. |
| `src/pages/Viewers.jsx` | `auth.me()` only | Replace → `supabase.auth.getUser()`. |
| `src/pages/Coaches.jsx` | `auth.me()` only | Replace → `supabase.auth.getUser()`. |
| `src/pages/RequestManagement.jsx` | `auth.me()` only | Replace → `supabase.auth.getUser()`. |
| `src/pages/LeagueIDs.jsx` | `auth.me()` only | Replace → `supabase.auth.getUser()`. |
| `src/pages/RosterUserMatching.jsx` | `auth.me()`, `entities.{League, Team, Player}` | Replace auth + entity queries with Supabase. |
| `src/pages/DataBackup.jsx` | Multiple `entities.*` calls | Replace all with Supabase queries. |
| `src/pages/DeleteLeague.jsx` | Multiple `entities.*` calls including deletes | Replace all with Supabase queries + RLS. |
| `src/pages/FixManualStats.jsx` | Multiple `entities.*` calls | Replace all with Supabase queries. |

### Admin Components

All of these are rendered inside routed admin pages (UserManagement, Viewers, Coaches, etc.).

| File | Base44 calls | Replacement notes |
|---|---|---|
| `src/components/admin/ViewersView.jsx` | `entities.User.list()` | Replace → `supabase.from("profiles")` |
| `src/components/admin/CoachesView.jsx` | `entities.User.list()` | Replace → `supabase.from("profiles")` |
| `src/components/admin/UserManagement.jsx` | `entities.User.*` | Replace → `supabase.from("profiles")` |
| `src/components/admin/UserLeagueAssignment.jsx` | `entities.{User, League}.*` | Replace with Supabase |
| `src/components/admin/UserApplicationsReview.jsx` | `entities.{UserApplication, User}.*` | Replace with Supabase |
| `src/components/admin/StatIntegrityChecker.jsx` | `entities.{Game, PlayerStats}.*` | Replace with Supabase |
| `src/components/admin/PlayersView.jsx` | `entities.{Player, Team}.*` | Replace with Supabase |
| `src/components/admin/PlayerMatchModal.jsx` | `entities.*` | Replace with Supabase |
| `src/components/admin/PlayerLeagueMatchModal.jsx` | `entities.*` | Replace with Supabase |
| `src/components/admin/PlayerIdentityDetailPanel.jsx` | `entities.UserLeagueIdentity.*` | Replace with Supabase |
| `src/components/admin/PlayerIdentityAdmin.jsx` | `entities.*` | Replace with Supabase |
| `src/components/admin/PendingUserManagement.jsx` | `entities.{User, UserApplication}.*` | Replace with Supabase |
| `src/components/admin/PendingBaseUsers.jsx` | `entities.User.*` | Replace with Supabase (likely `profiles` table with status filter) |
| `src/components/admin/ManualGameEntry.jsx` | `entities.{Game, Team, Player}.*` | Replace with Supabase |
| `src/components/admin/ManageRequests.jsx` | `entities.*` | Replace with Supabase |
| `src/components/admin/LeagueOwnersView.jsx` | `entities.{User, League}.*` | Replace with Supabase |
| `src/components/admin/LeagueAccessRequests.jsx` | `entities.*` | Replace with Supabase |
| `src/components/admin/EnhancedUserManagement.jsx` | `entities.{User, League, Team, UserLeagueIdentity}.*` | Replace with Supabase |
| `src/components/admin/EditGameEntry.jsx` | `entities.{Game, PlayerStats}.*` | Replace with Supabase |
| `src/components/admin/DeleteGameEntry.jsx` | `entities.{Game, PlayerStats}.*` | Replace with Supabase |
| `src/components/admin/BulkIdentityMatching.jsx` | `entities.*` | Replace with Supabase |
| `src/components/admin/ApplyPendingAssignments.jsx` | `entities.*` | Replace with Supabase |
| `src/components/admin/ApplicationAccess.jsx` | `entities.*` | Replace with Supabase |

### Other Components

| File | Base44 calls | Replacement notes |
|---|---|---|
| `src/components/registration/RegistrationGate.jsx` | `entities.{League, Team, Player}.*`, `auth.updateMe()` | Replace entity queries with Supabase. `auth.updateMe` → `supabase.auth.updateUser`. |
| `src/components/registration/PlayerIdentityModal.jsx` | `auth.updateMe()`, `entities.UserLeagueIdentity.create()` | Replace auth update + Supabase insert. |
| `src/components/player/PlayerProfileHeader.jsx` | `integrations.Core.UploadFile()`, `auth.updateMe()` | Replace file upload with Supabase Storage. Replace auth update with `supabase.auth.updateUser`. |
| `src/components/player/PlayerDashboardCard.jsx` | `integrations.Core.UploadFile()`, `auth.updateMe()` | Same as PlayerProfileHeader. |
| `src/components/teams/PlayerManagement.jsx` | `entities.{Player, Team}.*` | Replace with `supabase.from("players")` / `supabase.from("teams")`. |
| `src/lib/PageNotFound.jsx` | `auth.me()` for role-based redirect | Replace with `supabase.auth.getUser()`. |
| `src/components/schedule/POGSpotlightModal.jsx` | `auth.me()` stub | Replace with `supabase.auth.getUser()`. |

---

## Category C — Configuration

| File | What references Base44 | Action |
|---|---|---|
| `package.json` | `"name": "base44-app"`, `"@base44/sdk": "^0.8.26"`, `"@base44/vite-plugin": "^1.0.7"` | Rename `name` field. Remove both `@base44` packages from dependencies. Run `npm install` to regenerate lock file. |
| `package-lock.json` | Entire `@base44` package tree | Regenerates automatically after `package.json` is cleaned. |
| `index.html` | `href="https://base44.com/logo_v2.svg"` (favicon), `<title>Base44 APP</title>` | Replace favicon with app logo. Change title to `Courtside by AI`. |

---

## Notes

- **`vite.config.js` is clean.** Despite `@base44/vite-plugin` being in `package.json`, the vite config never imports or uses it.
- **No `.env` files** exist in the repo. Base44 config (`VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL`) was injected via URL params or localStorage at runtime. Nothing to delete from env files.
- **`src/App.jsx`** itself is not dead code, but lines 6 and 82 (`import NavigationTracker` / `<NavigationTracker />`) must be removed as part of deleting A4.
- **Recommended deletion order:** Delete A4 (NavigationTracker) first and clean App.jsx, then delete A7–A11 (orphaned pages/components), then tackle B-series one page at a time. Delete A1–A6 (the SDK client and config) last, once all B-series calls are migrated.
