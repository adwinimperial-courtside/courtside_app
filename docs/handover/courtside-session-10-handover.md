# Courtside by AI — Session 10 Handover
**Date:** 2026-04-16
**Next action:** Continue Phase 5 — PlayerProfile, LeagueAwardSettings, AwardLeaders, production hardening

---

## What Was Accomplished This Session

### Phase 5 — Auth & Roles (Completed)

| Component | Status | Notes |
|-----------|--------|-------|
| profiles table | ✅ MIGRATED | Added user_type column, default 'viewer' |
| handle_new_user trigger | ✅ CREATED | Auto-creates profiles row on registration |
| AuthContext.jsx | ✅ REBUILT | Now fetches profiles row, exposes userProfile, userType, isAppAdmin |
| LoginPage.jsx | ✅ REBUILT | Registration toggle, Full Name, Country, email/password, new logo |
| Layout.jsx | ✅ REBUILT | Base44 fully removed, uses useAuth, logout working, role badge, email shown |
| SidebarMenuContent.jsx | ✅ REBUILT | Base44 removed, uses userType/isAppAdmin props, role-based nav |
| RoleSelection.jsx | ✅ BUILT | 4 role cards: League Admin, Coach, Player, Viewer |
| LeagueApplication.jsx | ✅ BUILT | Role-specific forms, multi-select leagues for coach/player/viewer |
| PendingApproval.jsx | ✅ BUILT | Pending screen with refresh, auto-check on mount |
| ApplicationReview.jsx | ✅ BUILT | Admin approval/rejection UI, creates membership on approve |
| Home.jsx | ✅ UPDATED | Smart routing: membership → LeagueSelection, pending → PendingApproval, none → RoleSelection |
| pages.config.js | ✅ UPDATED | mainPage changed from Schedule to Home, new pages registered |
| App.jsx | ✅ UPDATED | Post-login redirect goes to /Home not /LeagueSelection |
| LeagueSelection.jsx | ✅ PATCHED | Redirects to /RoleSelection when user has no active memberships |

### Migrations Applied This Session

| Migration | Description |
|-----------|-------------|
| 20260416000013_profiles_user_type.sql | Added user_type to profiles table |
| 20260416000014_profiles_auto_create.sql | Trigger to auto-create profiles on registration |
| 20260416000015_league_applications.sql | New league_applications table |
| 20260416000016_leagues_public_read.sql | RLS policy: anyone can read active leagues |
| 20260416000017_league_applications_rls.sql | RLS policies for league_applications table |

### Key Decisions Made

| Decision | Outcome |
|----------|---------|
| app_admin storage | user_metadata.app_admin = true (already in use), not profiles table |
| Role model | 5 roles: app_admin, league_admin, coach, player, viewer |
| Registration flow | Self-serve, default user_type = viewer |
| Application flow | One row per league per application — allows per-league approval |
| League admin application | Creates new league row on approval |
| mainPage | Changed to Home so routing logic runs on app load |

### Bugs Fixed This Session

| Bug | Fix |
|-----|-----|
| Base44 routing intercepting navigation | Removed base44.auth.me() from Layout.jsx |
| mainPage = Schedule bypassing Home.jsx routing | Changed to mainPage = Home |
| Post-login redirect to LeagueSelection | Changed to /Home so routing logic runs |
| LeagueSelection showing for users with no memberships | Added redirect to /RoleSelection when activeLeagues.length === 0 |
| league_applications RLS blocking insert | Added INSERT policy for authenticated users |
| leagues RLS blocking new users from seeing leagues | Added public SELECT policy for is_active leagues |
| Supabase confirmation email redirect to wrong port | Fixed site_url in Supabase Dashboard to localhost:5173 |

---

## Architecture Patterns (Must Follow)

### Auth Pattern
- app_admin: check via `currentUser?.user_metadata?.app_admin === true` (isAppAdmin from useAuth)
- All other roles: check via `userProfile?.user_type` (userType from useAuth)
- Never use Base44 auth — fully removed

### useAuth Hook — Available Values
```javascript
const { 
  currentUser,      // Supabase auth user object
  session,          // Supabase session
  isAuthenticated,  // boolean
  isLoadingAuth,    // boolean — wait for this before routing
  userProfile,      // profiles table row
  userType,         // string: 'league_admin' | 'coach' | 'player' | 'viewer' | null
  isAppAdmin,       // boolean: user_metadata.app_admin === true
  signOut           // function
} = useAuth()
```

### Routing Logic (Home.jsx)
1. Not authenticated → /Landing
2. Has active user_league_memberships row → /LeagueSelection
3. Has pending league_applications row → /PendingApproval
4. No application or only rejected → /RoleSelection

### Application Approval Flow
1. User submits league_applications row (one per league)
2. Admin sees it in ApplicationReview.jsx
3. On approve: update status='approved' + insert user_league_memberships row
4. For league_admin: also create leagues row first, then membership
5. On reject: update status='rejected'
6. User refreshes PendingApproval → routed to LeagueSelection

### Logo
Always use /images/courtside-logo.png — file is at public/images/courtside-logo.png

---

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 1 — Core pages | ✅ Complete |
| Phase 2 — League management | ✅ Complete |
| Phase 3A — Live game components | ✅ Complete |
| Phase 3B — LiveStatTracker + ScoreHeader | ✅ Complete |
| Phase 4 — Standings, Statistics, LiveBoxScore, End Game | ✅ Complete |
| Phase 5 — Auth/Roles, Registration, Approval flow | 🔄 In Progress |
| Phase 6 — Production deployment | 🔲 Pending |

---

## Phase 5 — Remaining Work

### Still To Do

1. **PlayerProfile page** — requires user_league_identities table (user_id, league_id, team_id, matched_player_id)
2. **LeagueAwardSettings** — requires award_settings table migration, then rebuild page
3. **AwardLeaders** — rebuild once award_settings table exists
4. **Production hardening:**
   - Remove debug console.log statements from Home.jsx
   - Lineup repair lock UI (DB columns exist, UI logic incomplete)
   - Atomic DB increments via Postgres RPC (race condition with concurrent writes)
   - Base44 console errors cleanup: NavigationTracker.jsx still calls base44.appLogs
5. **Admin tools** — ApplicationReview needs to be added to sidebar nav for app_admin

### New Tables Needed

| Table | Columns | Purpose |
|-------|---------|---------|
| user_league_identities | user_id, league_id, team_id, matched_player_id | Links auth user to player record per league |
| award_settings | league_id + all mvp_*/dpoy_*/pog_* weight columns | Per-league award configuration |

---

## Known Issues / Parked Items

| Issue | Impact | Status |
|-------|--------|--------|
| NavigationTracker.jsx Base44 calls | Console 404 errors, harmless | Not yet fixed |
| Home.jsx debug logs | Console noise | Remove next session |
| Lineup repair lock UI | Both admins see EmergencyLineupRepair simultaneously | Parked |
| Atomic increments | Race condition with concurrent writes | Pre-production |
| Statistics shows 0s for seed data | Seed games have no player_stats | Expected |

---

## Database Schema — Changes This Session

**profiles:**
- `user_type` text NOT NULL DEFAULT 'viewer' CHECK (league_admin/coach/player/viewer/app_admin)

**New tables:**
- `league_applications` — full schema in migration 000015
- `user_league_memberships` — unchanged, now populated via approval flow

**New RLS policies:**
- leagues: anyone can read active leagues
- league_applications: user can insert/read own, app_admin full access, league_admin can read/update their league

---

## Test Accounts

| Email | Role | League | Notes |
|-------|------|--------|-------|
| adwin.imperial@gmail.com | league_admin (via user_league_memberships) | Korisliiga Pro | Main account |
| adwin.imperial@outlook.com | viewer (approved via ApplicationReview) | Korisliiga Pro | Test account |

---

## Git Status

**Branch:** feature/initial-schema
**Last commit:** Session 10 — Auth flow, Layout rebuild, registration & approval flow

---

## How Claude Should Behave (All Future Sessions)

- All code changes go via Claude Code — never paste code directly in chat
- All Claude Code prompts in a single copyable code block
- All DB query results saved to docs/temp/ before sharing
- Skip filler phrases, never repeat back what Win said
- Direct and concise, one step at a time
- Always wait for Win to confirm before moving to next feature
- File-heavy work → Claude Code
- Flag new requirements mid-task: "That's a new requirement. Should I finish current task first?"
- Proactively suggest checkpoint when session gets long

## Role Context
Think simultaneously as:
1. Basketball player — game flow, clock, fouls, ejections, substitutions
2. League organiser — scorer's table workflow, stat entry, audit trail
3. Senior software engineer — production code, atomic transactions, error handling

---

*Generated: 2026-04-16*
*Next session: Phase 5 remaining — PlayerProfile, LeagueAwardSettings, AwardLeaders, production hardening*
