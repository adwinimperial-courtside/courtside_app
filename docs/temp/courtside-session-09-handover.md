# Courtside by AI — Session 09 Handover
**Date:** 2026-04-16
**Next action:** Begin Phase 5 — Auth/Roles, PlayerProfile, LeagueAwardSettings, production hardening

---

## What Was Accomplished This Session

### Phase 4 — Completed

| Component | Status | Notes |
|-----------|--------|-------|
| Standings.jsx | ✅ REBUILT | W/L/Win%/+/- computed from final games, tiebreaker logic (h2h for 2 teams, points diff for 3+) |
| Statistics.jsx | ✅ REBUILT | 3 tabs: Team Stats, Player Stats, League Leaders. Per-game averages, sortable columns, search |
| LiveBoxScore.jsx | ✅ REBUILT | Realtime spectator view, green active player highlights, 3-line activity feed, team totals |
| GameCard.jsx | ✅ REDESIGNED | Badges row, POG display, View Stats inline box score, POG backfill for null games, Reopen removed |
| LiveStatTracker.jsx | ✅ UPDATED | End Game writes status=final + ended_at + POG, redirects to Schedule |
| StartingLineup.jsx | ✅ FIXED | Now writes is_active: true alongside is_starter: true |

### Migrations Applied This Session

| Migration | Description |
|-----------|-------------|
| 20260416000011_player_stats_is_active.sql | Added is_active boolean to player_stats, backfilled from is_starter |
| 20260416000012_leagues_season.sql | CANCELLED — season column not needed, dropped from requirements |

### Key Decisions Made

| Decision | Outcome |
|----------|---------|
| season column on leagues | Dropped — not needed, adds complexity |
| is_active vs is_starter | Kept as separate columns: is_starter = started game, is_active = currently on court |
| Statistics Game Stats tab | Dropped — only 3 tabs: Team Stats, Player Stats, League Leaders |
| PlayerProfile | Deferred to Phase 5 — requires user_league_identities table and auth/roles |
| POG for null final games | Auto-backfilled on GameCard load using pogCalculator + default weights |
| Reopen game feature | Removed — once final, always final |

### Bugs Fixed This Session

| Bug | Fix |
|-----|-----|
| StartingLineup not setting is_active | Added is_active: true to all is_starter: true writes |
| EmergencyLineupRepair firing after lineup submit | Root cause was is_active not set by StartingLineup |
| End Game setting status='completed' | Fixed to status='final' |
| End Game not writing ended_at | Added ended_at: new Date().toISOString() |
| LiveBoxScore latest activity showing raw JSON | Fixed team name extraction + 3-line format |
| LiveBoxScore stat labels truncated | Added STAT_LABELS map with full readable names |
| GameCard "View Live Box Score" wrong URL case | Fixed to /LiveBoxScore?gameId= (capital letters) |

---

## Architecture Patterns (Must Follow)

### Realtime — Unique Channel Names Per Mount
```javascript
useEffect(() => {
  const uid = Math.random().toString(36).slice(2, 8)
  const channel = supabase
    .channel(`channel-name-${gameId}-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name', filter: `game_id=eq.${gameId}` }, handler)
    .subscribe()
  return () => {
    channel.unsubscribe()
    supabase.removeChannel(channel)
  }
}, [gameId])
```

### is_active vs is_starter
- `is_starter` = player began the game in the starting 5 (set once at tip-off, never changes)
- `is_active` = player is currently on the court (changes with every substitution)
- Both must always be written together when setting a player on/off court
- ALL components must use `is_active` for on-court filtering, `is_starter` for starting lineup display

### Points Calculation
Always compute points as: `points_2 * 2 + points_3 * 3 + free_throws`
Never use the `points` column — it is always 0.

### Player Stats Aggregation
Multiple player_stats rows exist per player per game (one per action).
Always aggregate by player_id: sum counting stats, take MAX for minutes_played, take most recent row for is_active/is_starter.

### POG Calculation
Use `findPlayerOfGame` from `@/utils/pogCalculator` with `(playerStats, game, null)`.
null = use default award settings from awardDefaults.js.
When LeagueAwardSettings is rebuilt in Phase 5, pass real settings instead of null.

### Supabase Realtime Publications
Tables enabled: player_stats, games, game_logs
When adding new tables with Realtime, enable in: Supabase Dashboard → Database → Publications → supabase_realtime

---

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 1 — Core pages | ✅ Complete |
| Phase 2 — League management | ✅ Complete |
| Phase 3A — Live game components | ✅ Complete |
| Phase 3B — LiveStatTracker + ScoreHeader | ✅ Complete |
| Phase 4 — Standings, Statistics, LiveBoxScore, End Game | ✅ Complete |
| Phase 5 — Auth/Roles, PlayerProfile, LeagueAwardSettings, AwardLeaders, production hardening | 🔲 Next |
| Phase 6 — Production deployment | 🔲 Pending |

---

## Phase 5 — First Actions

### What Phase 5 Must Cover

1. **Auth & Roles** — user_type (admin/player/coach), login flow, route protection
2. **PlayerProfile** — requires user_league_identities table (user_id, league_id, team_id, matched_player_id)
3. **LeagueAwardSettings** — requires award_settings table migration, then rebuild page
4. **AwardLeaders** — rebuild once award_settings table exists
5. **Production hardening** — lineup repair lock UI, atomic DB increments via Postgres RPC, Base44 errors cleanup (Layout.jsx, NavigationTracker.jsx, ApplyPendingAssignments.jsx)

### New Tables Needed in Phase 5

| Table | Columns | Purpose |
|-------|---------|---------|
| user_league_identities | user_id, league_id, team_id, matched_player_id | Links auth user to player record per league |
| award_settings | league_id + all mvp_*/dpoy_*/pog_* weight columns | Per-league award configuration |
| profiles | user_id, user_type, display_name, assigned_league_ids | Auth user profile data |

---

## Known Issues / Parked Items

| Issue | Impact | Status |
|-------|--------|--------|
| Lineup repair lock UI | Both admins see EmergencyLineupRepair simultaneously | Parked — DB columns exist, UI logic incomplete |
| Atomic increments | Race condition with high-frequency concurrent writes | Add Postgres RPC before production |
| Base44 errors in console | Layout.jsx, NavigationTracker.jsx, ApplyPendingAssignments.jsx | Not yet migrated |
| Statistics shows 0s for seed data | Seed games have no player_stats recorded | Expected — not a bug |
| MIN values in LiveBoxScore | Some players show high minutes from test sessions | Cosmetic — resets when game replayed |

---

## Database Schema — Columns Added This Session

**player_stats:**
- `is_active` boolean DEFAULT false

---

## Test Data

**Korisliiga Pro** league (ID: a1000000-0000-0000-0000-000000000001)
- Test game: Jyväskylä Jets vs Turku Lynx
- Game ID: c1000000-0000-0000-0000-000000000021
- Status: final (ended this session)

---

## Git Status

**Branch:** feature/initial-schema
**Status:** Commit all session 09 work before starting Phase 5

### Recommended commit message:
Session 09: Phase 4 complete — Standings, Statistics, LiveBoxScore, End Game, GameCard redesign, is_active migration

---

## How Claude Should Behave (All Future Sessions)

- Skip filler phrases, never repeat back what Win said
- Direct and concise, one step at a time
- All clarifying questions in one message
- Always wait for Win to confirm satisfaction before moving to next feature
- URLs in copy format e.g. http://localhost:5173/standings
- File-heavy work → Claude Code
- Multi-step UI testing → Claude in Chrome
- Flag new requirements mid-task: "That's a new requirement. Should I finish current task first?"
- Proactively suggest checkpoint when session gets long

## Role Context
Think simultaneously as:
1. Basketball player — game flow, clock, fouls, ejections, substitutions
2. League organiser — scorer's table workflow, stat entry, audit trail
3. Senior software engineer — production code, atomic transactions, error handling

---

*Generated: 2026-04-16*
*Next session: Phase 5 — Auth/Roles, PlayerProfile, LeagueAwardSettings, AwardLeaders, production hardening*
