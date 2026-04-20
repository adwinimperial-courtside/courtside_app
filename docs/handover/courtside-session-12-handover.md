# Courtside by AI — Session 12 Handover
**Date:** 2026-04-17
**Next action:** Continue Phase 5 — Rebuild remaining B-KEEP pages on Supabase, Story Builder, production hardening

---

## What Was Accomplished This Session

### Award Leaders Page (Complete)
- Full rebuild of AwardLeaders.jsx page and component
- Three tabs: MVP Race, DPOY Race, Player of the Game
- MVP & DPOY: top 10 eligible + ineligible players greyed out with "Needs X more games" text
- All weights and thresholds pulled from league_award_settings (no hardcoded values)
- Award badges: gold MVP, purple Mythical 1–4, blue DPOY, green POG
- Trend arrows: green up / red down / grey dash (compares current score vs score before most recent game)
- Expandable rows: per-stat weighted breakdown with contribution column (Framer Motion animated)
- POG tab: simple game log — Date, Game matchup, Score, POG Winner with badge, Team (most recent first)
- Collapsible "How is this calculated?" sections per tab (collapsed by default)
- Empty states for no league selected, no completed games, no POG winners
- League selector fixed to match working pattern from other pages

### Standings Page Enhancements (Complete)
- Added Streak column: shows current consecutive W/L streak (e.g., "W3" green, "L2" red)
- Added Trend indicator: arrow displayed inline next to team name (not a separate column)
- Column order: #, Team (with trend arrow), W, L, Win%, Streak, +/-

### Base44 Cleanup — Phase 1 (Complete)
Full audit and removal of all dead Base44 code from the codebase.

**Deleted 44+ files:**
- 21 Category A files (dead code): base44Client.js, entities.js, integrations.js, NavigationTracker, AuthContextBase44, app-params.js, Analytics page, RegularSeasonRecap, AllPlayersView, StoryBuilder, AITacticalBriefing, entire base44/ directory
- 7 B-DELETE pages: ApplyForLeague, DataBackup, Viewers, Coaches, LeagueOwners, LeagueIDs, FixManualStats
- 16 B-DELETE components: ViewersView, CoachesView, LeagueOwnersView, StatIntegrityChecker, ManualGameEntry, EditGameEntry, DeleteGameEntry, PlayersView, ApplicationAccess, ApplyPendingAssignments, LeagueAccessRequests, ManageRequests, PendingBaseUsers, PendingUserManagement, UserLeagueAssignment, RegistrationGate, PlayerIdentityModal, PlayerProfileHeader, PlayerManagement
- Players.jsx page (orphaned after PlayersView deletion)

**Cleaned up references:**
- App.jsx: removed NavigationTracker, removed deleted page imports and routes, updated to Supabase AuthContext API
- SidebarMenuContent.jsx: replaced with main project version, removed broken nav links (StoryBuilder, Analytics, DataBackup, All Players, Season Recap, ApplyForLeague), replaced base44 queries with Supabase
- pages.config.js: removed all deleted page entries
- index.html: title changed to "Courtside by AI", removed base44 favicon
- package.json: renamed to "courtside-by-ai", removed @base44/sdk and @base44/vite-plugin

**Files copied from main project during build fix:**
- supabaseClient.js, AuthContext.jsx, Layout.jsx, SidebarMenuContent.jsx, TeamDetailView.jsx, auth/ components, AcceptInvite.jsx

**Build:** Clean — 2725 modules, zero base44 references, zero errors

---

## B-KEEP Files — Still Need Rebuilding

These 16 files still contain base44.entities.* calls. The plan is NOT to convert them line-by-line but to delete and rebuild each feature fresh on Supabase, same approach as Schedule/Standings/Statistics/Award Leaders.

### Pages (8)
| Page | What it does | Complexity |
|------|-------------|------------|
| Whiteboard.jsx | Drawing/tactics board with league selector | Low (only 2 base44 calls) |
| CoachInsights.jsx | Stats dashboard for coaches | Medium-High |
| PlayerProfile.jsx | Player detail page with stats, photo upload | High |
| UserRoles.jsx | Admin: view/manage user roles | Medium |
| UserManagement.jsx | Admin: user management wrapper | Medium (renders B-KEEP components) |
| RequestManagement.jsx | Admin: review user applications | Medium |
| RosterUserMatching.jsx | Admin: match players to rosters | High |
| DeleteLeague.jsx | Admin: delete a league and all data | Medium |

### Components (8)
| Component | Used by | What it does |
|-----------|---------|-------------|
| EnhancedUserManagement.jsx | UserManagement page | Full user management UI |
| PlayerIdentityAdmin.jsx | UserManagement page | Player identity matching admin |
| BulkIdentityMatching.jsx | PlayerIdentityAdmin | Bulk match players to identities |
| PlayerIdentityDetailPanel.jsx | PlayerIdentityAdmin | Detail view of player identity |
| PlayerLeagueMatchModal.jsx | BulkIdentityMatching, DetailPanel | Modal for matching player to league |
| UserApplicationsReview.jsx | RequestManagement page | Review pending applications |
| PlayerMatchModal.jsx | UserApplicationsReview | Match player during application review |
| PlayerDashboardCard.jsx | PlayerProfile page | Player card with photo upload |

---

## Migrations Applied (All Sessions)

| Migration | Description |
|-----------|-------------|
| 20260416000018 | league_award_settings + league_award_settings_audit tables |
| 20260416000019 | INSERT policy for league_award_settings_audit |
| 20260416000020 | FK from audit.changed_by to profiles |
| 20260416000023 | game_edits_audit table, games.last_edited_by/at columns |
| 20260416000026 | profiles: email, last_active, full_name columns; FK from user_league_memberships to profiles |
| 20260416000027 | league_invitations table |

---

## Key Patterns Established

### Auth Pattern
- app_admin: check via currentUser?.user_metadata?.app_admin === true (isAppAdmin from useAuth)
- All other roles: check via userProfile?.user_type (userType from useAuth)
- League-specific roles: check user_league_memberships table

### Audit Trail Pattern
- Create [feature]_audit table with: id, [parent]_id, league_id, changed_by (FK to profiles), changed_at, field_name, old_value, new_value
- RLS: app_admin full access, league_admin for their leagues
- On save: compare old vs new values, insert audit row for each change
- Display in collapsible "Change History" section

### Admin Page Access
- Check isAppAdmin OR userType === 'league_admin'
- league_admin sees only their leagues (from user_league_memberships where role='league_admin')
- app_admin sees all leagues

### Validation Pattern
- No inline validation while typing
- Validate all rows on Save click
- Show error summary banner at top
- Highlight error rows with red background
- Disable Save until errors fixed

### Data Fetching
- All rebuilt pages use base44.entities.* which calls Supabase underneath
- B-KEEP pages still use base44.entities.* directly — will be rebuilt fresh
- New rebuilds should use direct supabase.from(...) queries with TanStack Query

---

## Database Schema Notes

### games table
- entry_type: 'digital' (default) or 'manual'
- edited: boolean, true if game was edited after completion
- last_edited_by: UUID FK to auth.users
- last_edited_at: timestamptz
- player_of_game: UUID FK to players
- exclude_from_awards: boolean
- exclude_from_pog: boolean

### profiles table
- email, full_name, last_active columns
- last_active updated on each login

### user_league_memberships table
- FK to profiles(id) via user_league_memberships_profiles_fk

### league_invitations table
- Tracks email invites with token, status, expiry
- Status: pending, accepted, expired, revoked

### league_award_settings table
- All MVP/DPOY/POG weights per league
- Eligibility thresholds per league

---

## Parked Items

| Item | Status | Notes |
|------|--------|-------|
| Invite email sending | PARKED | Resend requires domain verification. Verify courtsidebyai.com at resend.com/domains |
| Story Builder | NOT STARTED | Deleted from sidebar. Needs full rebuild when ready |
| Lineup repair lock UI | PARKED | DB columns exist, UI logic incomplete |
| Atomic DB increments | PARKED | Race condition with concurrent writes — pre-production fix |

---

## Edge Functions

### send-invite-email
- Location: supabase/functions/send-invite-email/index.ts
- Config: verify_jwt = false (in config.toml)
- Requires: RESEND_API_KEY secret in Supabase Dashboard
- Current FROM: onboarding@resend.dev (Resend test address)
- To enable production emails: verify domain, change FROM to noreply@courtsidebyai.com

---

## Test Accounts

| Email | Role | Notes |
|-------|------|-------|
| adwin.imperial@gmail.com | app_admin | Main account |
| adwin.imperial@outlook.com | viewer | Test account |
| adwin.imperial@icloud.com | (invited) | Pending invite for testing |

---

## Git Status

**Branch:** feature/initial-schema
**Last commit:** Session 12 — Award Leaders, Standings enhancements, Base44 Phase 1 cleanup

---

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 1 — Core pages | ✅ Complete |
| Phase 2 — League management | ✅ Complete |
| Phase 3A — Live game components | ✅ Complete |
| Phase 3B — LiveStatTracker + ScoreHeader | ✅ Complete |
| Phase 4 — Standings, Statistics, LiveBoxScore, End Game | ✅ Complete |
| Phase 5 — Auth/Roles, Admin Pages, Base44 Cleanup | 🔄 In Progress |
| Phase 6 — Production deployment | 🔲 Pending |

---

## Phase 5 — Remaining Work

1. **Rebuild B-KEEP pages** — 8 pages + 8 components still have base44 calls. Rebuild fresh on Supabase (don't convert, rebuild)
2. **Invite email domain verification** — verify courtsidebyai.com in Resend
3. **Story Builder** — full rebuild when ready
4. **Production hardening:**
   - Remove debug console.log statements
   - Lineup repair lock UI
   - Atomic DB increments via Postgres RPC

---

*Generated: 2026-04-17*
*Next session: Rebuild B-KEEP pages starting with Whiteboard (simplest), then work through the list*
