# Courtside by AI — Session 11 Handover
**Date:** 2026-04-17
**Next action:** Continue Phase 5 — Verify invite email flow, Story Builder, production hardening

---

## What Was Accomplished This Session

### League Award Settings (Complete)
- Full rebuild of LeagueAwardSettings.jsx
- Migration 000018: league_award_settings table with all MVP/DPOY/POG/Mythical Five weights
- Migration 000019: INSERT policy for audit table
- Migration 000020: FK fix for changed_by to profiles
- Change History section working with audit trail
- Per-section and full page "Reset to Default" buttons
- Formula display for each award type

### Game Log (Complete)
- Full rebuild of GameLog.jsx
- Filters: League, Game, Period, Player search, Points-only toggle
- Game header with score, status, action count
- CSV/Excel export
- List view with player actions, timestamps, who recorded
- Undone actions shown with strikethrough

### Admin Tools (Complete)
- Full rebuild of AdminTools.jsx
- Manual Game Entry: create games with full player stats
- Edit Game: edit completed games, pre-populate calculated PTS for digital games
- Delete Game: confirmation with typed "DELETE" requirement
- Migration 000023: game_edits_audit table, last_edited_by/at columns
- Schedule page shows "Manual Entry" and "Edited" badges
- Removed 2PT column — not needed
- Validation only on Save click, not inline
- Removed number input spinners

### League Users (Complete)
- Full rebuild of LeagueUsers.jsx
- Migration 000026: added email, last_active, full_name columns to profiles; FK from user_league_memberships to profiles
- Stats bar with role counts
- Search, filter by league/role, sort options
- User list with avatar, name, email, role badge, leagues, joined date, last active
- Expandable rows with details
- Change Role (league_admin and app_admin)
- Remove from League (app_admin only)
- Export CSV
- last_active updates on login

### User Invitations (Partially Complete)
- Migration 000027: league_invitations table
- Invite User modal on League Users page
- Pending Invites collapsible section with Resend/Revoke actions
- AcceptInvite.jsx page for /invite/:token route
- Auto-join flow for logged-in users
- Pending invite token in localStorage for post-login processing
- Edge function deployed: send-invite-email

**PARKED:** Email sending blocked by Resend domain verification. Currently only sends to adwin.imperial@gmail.com. Need to verify courtsidebyai.com domain at resend.com/domains to send to other recipients.

---

## Migrations Applied This Session

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

### Points Calculation (for Edit Game)
- Digital games store 2PT, 3PT, FT separately
- On Edit Game load, calculate: PTS = (2PT × 2) + (3PT × 3) + FT
- Display calculated PTS in the PTS column
- On save, just save PTS as-is (don't recalculate 2PT)

---

## Database Schema Notes

### games table
- entry_type: 'digital' (default) or 'manual'
- edited: boolean, true if game was edited after completion
- last_edited_by: UUID FK to auth.users
- last_edited_at: timestamptz
- player_of_game: UUID FK to players

### profiles table
- Now has: email, full_name, last_active columns
- last_active updated on each login

### user_league_memberships table
- Now has FK to profiles(id) via user_league_memberships_profiles_fk
- This allows PostgREST joins between memberships and profiles

### league_invitations table
- Tracks email invites with token, status, expiry
- Status: pending, accepted, expired, revoked

---

## Parked Items

| Item | Status | Notes |
|------|--------|-------|
| Invite email sending | PARKED | Resend requires domain verification. Verify courtsidebyai.com at resend.com/domains |
| Story Builder | NOT STARTED | In sidebar but not rebuilt |
| Lineup repair lock UI | PARKED | DB columns exist, UI logic incomplete |
| Atomic DB increments | PARKED | Race condition with concurrent writes — pre-production fix |
| NavigationTracker Base44 calls | NOT FIXED | Console 404 errors, harmless |

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
**Last commit:** Session 11 — Award Settings, Game Log, Admin Tools, League Users, Invitations

---

## How Claude Should Behave (All Future Sessions)

### Communication Rules
- Address Win by name occasionally but naturally
- Be direct — skip filler phrases like "Great question!", "Sure!", "I'd be happy to help!"
- Never repeat back what Win just said before responding
- Default to concise answers — offer to go deeper only if Win asks
- Ask all clarifying questions in a single message, never one at a time

### Coding Rules
1. All code changes go via Claude Code — never paste code directly in chat
2. All Claude Code prompts must be copyable in a single block — no nested code fences
3. All DB query results saved to docs/temp/ before sharing
4. One step at a time — complete one change, wait for confirmation
5. Complete code only — never partial snippets
6. Always state file path and whether new or replacing
7. Always include test steps
8. Never proceed without Win's confirmation

### Prompt Structure
When creating Claude Code prompts:
- Use plain text descriptions, not code blocks inside the prompt
- Save investigation results to docs/temp/ files
- Include anticipatory fixes for common problems
- Structure as numbered steps with clear completion criteria
- Always end with "Start with Step X, then proceed"

### Error Handling
When Win reports an error:
1. Explain what it means in one sentence
2. Provide exact fix
3. State where to apply it

### Quality Standards
- Think through downstream consequences before recommending
- Ask: "If Win acts on this, what happens 2 weeks from now?"
- Look for what is missing, not just what is there
- When uncertain, say so explicitly
- Never guess about Claude's own UI or features

### Role Context
Think simultaneously as:
1. Basketball player — game flow, clock, fouls, ejections, substitutions
2. League organiser — scorer's table workflow, stat entry, audit trail
3. Senior software engineer — production code, atomic transactions, error handling

---

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 1 — Core pages | ✅ Complete |
| Phase 2 — League management | ✅ Complete |
| Phase 3A — Live game components | ✅ Complete |
| Phase 3B — LiveStatTracker + ScoreHeader | ✅ Complete |
| Phase 4 — Standings, Statistics, LiveBoxScore, End Game | ✅ Complete |
| Phase 5 — Auth/Roles, Admin Pages | 🔄 In Progress |
| Phase 6 — Production deployment | 🔲 Pending |

---

## Phase 5 — Remaining Work

1. **Invite email domain verification** — verify courtsidebyai.com in Resend to enable sending to all recipients
2. **Story Builder** — rebuild page (currently in sidebar but not functional)
3. **Production hardening:**
   - Remove debug console.log statements
   - Lineup repair lock UI
   - Atomic DB increments via Postgres RPC
   - NavigationTracker Base44 cleanup

---

*Generated: 2026-04-17*
*Next session: Verify invite emails, Story Builder, production hardening*
