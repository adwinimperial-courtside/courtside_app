# Courtside by AI — Session Handover
## Base44 Removal + Impersonation System
**Date:** 2026-04-20
**Branch:** `feature/initial-schema`
**Latest commit:** `9634d15` — "Remove Base44 completely, add impersonation system, migrate all pages to Supabase"

---

## What Was Done This Session

### 1. OWNER Menu Cleanup
- Deleted 7 old OWNER pages: RequestManagement, UserManagement, UserRoles, DeleteLeague, DataBackup, RosterUserMatching, LeagueOwners
- Removed from pages.config.js and SidebarMenuContent.jsx
- OWNER section kept with empty array, ready for new items

### 2. Complete Base44 Removal
- **Discovered:** The entire app (83 files) was still on Base44 for data fetching — including pages we thought were rebuilt on Supabase (Schedule, Standings, etc.)
- **Discovered:** base44Client.js had already been stubbed to a no-op proxy (all entities returned empty arrays), meaning the app was already non-functional on Base44
- **Discovered:** AuthContext.jsx and Layout.jsx in the MAIN project were already on Supabase auth (an earlier worktree version was still on Base44, which caused initial confusion)
- Deleted 25 orphaned Base44 components (admin, registration, teams, player)
- Migrated 8 pages to Supabase queries: Whiteboard, Coaches, Viewers, LeagueIDs, ApplyForLeague, CoachInsights, FixManualStats, PlayerProfile
- Migrated 2 components: CoachesView, ViewersView
- Migrated PlayerDashboardCard avatar upload from Base44 UploadFile to Supabase Storage
- Deleted base44Client.js — zero Base44 references remain in codebase
- **Total files deleted this session: 33**

### 3. Impersonation System (for app_admin only)
**Backend:**
- `impersonation_log` table created (migration 20260420000001) with RLS policies
- `mint-impersonation-token` Edge Function deployed — mints 15-minute JWT for target user, logs to audit table
- Uses jose library for HS256 JWT signing with Supabase JWT_SECRET

**Frontend:**
- AuthContext.jsx: added startImpersonation/stopImpersonation, token swap via supabase.auth.setSession(), auto-expiry timer, realIsAppAdmin preserved during impersonation
- SimulateUser.jsx: searchable user list, confirmation dialog, calls startImpersonation
- ImpersonationBanner.jsx: fixed amber banner with countdown timer and Exit button
- DevicePreviewToggle.jsx: floating FAB (bottom-right), phone/tablet/desktop viewport simulation
- Layout.jsx: integrates banner (padding-top when visible), device preview wrapper, passes realIsAppAdmin to sidebar
- SidebarMenuContent.jsx: "Simulate User" added to OWNER section
- pages.config.js: SimulateUser registered

### 4. Bug Fixes
- Fixed last_active updating for impersonated users during SIGNED_IN event (uses ref to avoid stale closure)

---

## What Needs Testing (Next Session Priority)

### Critical — Test These First
1. **SimulateUser page loads** — navigate to it from OWNER menu, verify user list appears
2. **Impersonation works end-to-end** — click Simulate on a user, verify:
   - Banner appears with correct user info and countdown
   - Sidebar menu changes to reflect impersonated user's role
   - Pages show impersonated user's data (not admin's)
   - Exit button restores admin session
   - Auto-expiry works after 15 minutes
3. **Device preview** — verify floating button appears, phone/tablet/desktop modes constrain content width correctly

### Important — Verify Migrated Pages Work
All these pages were migrated from base44.entities to supabase.from() — they need verification:
4. Schedule page loads game data
5. Standings page loads standings
6. Statistics page loads stats
7. AwardLeaders page loads award data
8. CoachInsights page loads insights
9. PlayerProfile page loads player data
10. ApplyForLeague page works (form submission)
11. Coaches page loads coach list
12. Viewers page loads viewer list
13. GameLog page loads logs
14. AdminTools page functions (manual game entry, edit, delete)
15. LeagueUsers page loads users
16. LeagueAwardSettings page loads settings
17. Whiteboard page loads/saves plays

### Minor
18. FixManualStats page works
19. LeagueIDs page loads
20. Avatar upload in PlayerDashboardCard (requires `avatars` storage bucket — see below)

---

## Action Items (Not Code)

1. **Create `avatars` Supabase Storage bucket** — Dashboard → Storage → New bucket → name: `avatars`, public: yes. Needed for profile photo uploads. Not urgent.
2. **Resend domain verification** — still pending for courtsidebyai.com. Blocks invite email sending.

---

## Known Issues / Deviations

1. **user_applications schema gap** — old Base44 payload included fields (league_ids, league_team_pairs, is_additional_request, team_id, current_user_type) that don't exist in the Supabase table. Team selection during player application is collected in UI but not persisted. May need migration to add team_id column later.
2. **Pages that were NOT migrated in data layer** — Schedule, Standings, Statistics, AwardLeaders, GameLog, AdminTools, LeagueUsers, LeagueAwardSettings were reported as "completed on Supabase" in earlier sessions. They DO use Supabase imports but need verification that their queries actually return data. Some may have been working against Base44 entities that are now gone.
3. **Worktrees cleaned up** — three Claude Code worktrees were removed. All work now confirmed on feature/initial-schema branch only.

---

## Architecture State

### Auth Flow
- Supabase Auth (email/password + OAuth)
- Session managed by supabase.auth in AuthContext
- Profile data from `profiles` table
- Role: app_admin in user_metadata, all others in profiles.user_type
- Five roles: app_admin, league_admin, coach, player, viewer

### Data Flow
- All pages use supabase.from('table').select() via TanStack Query
- Zero Base44 dependencies remain
- base44Client.js deleted

### Impersonation Flow
1. Admin clicks Simulate on SimulateUser page
2. Frontend calls mint-impersonation-token Edge Function
3. Edge Function validates admin, mints 15-min JWT, logs to impersonation_log
4. Frontend stashes real session, calls supabase.auth.setSession() with new JWT
5. onAuthStateChange fires, fetches impersonated user's profile
6. All pages see impersonated user's data via RLS
7. Banner shows with countdown
8. On exit or expiry: real session restored

### Key File Locations
- Auth: src/lib/AuthContext.jsx
- Layout: src/Layout.jsx
- Supabase client: src/lib/supabaseClient.js
- Sidebar: src/components/layout/SidebarMenuContent.jsx
- Pages config: src/pages.config.js
- Migrations: supabase/migrations/
- Edge Functions: supabase/functions/

---

## Git State
- Branch: feature/initial-schema
- Latest commit: 9634d15
- All changes committed, working tree clean
- No worktrees exist
