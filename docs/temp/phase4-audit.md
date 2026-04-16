# Phase 4 Audit — Remaining Pages Base44 Dependency Map

Pages audited: Standings, Statistics, LiveBoxScore, PlayerProfile

---

## 1. Standings.jsx

### What it displays
Team standings for the user's assigned league(s). A league selector appears if the user has multiple leagues. Passes team + game data to a `TeamStandings` child component which computes W/L records and rankings.

### Base44 calls
| Call | Purpose |
|------|---------|
| `base44.auth.me()` | Get current user (for `default_league_id`, `assigned_league_ids`, `user_type`) |
| `base44.entities.League.list()` | All leagues, filtered client-side to `assigned_league_ids` |
| `base44.entities.Team.filter({ league_id })` | Teams in selected league |
| `base44.entities.Game.filter({ league_id })` | Games in selected league (for W/L computation) |

### User fields referenced
- `user.default_league_id`
- `user.assigned_league_ids`
- `user.user_type`

### League fields referenced
- `league.season` (displayed in league selector label)

### DB data needed
`leagues`, `teams`, `games`

### Migration complexity
**Medium** — all three tables exist. Need to verify `assigned_league_ids` user filtering is handled (currently a Supabase auth user field concern, not a schema gap). The `TeamStandings` child component computes standings from raw game data — no computed columns needed.

---

## 2. Statistics.jsx

### What it displays
Full statistics hub with four tabs: Team Stats, Player Stats, League Leaders, Game Stats. Each tab has both mobile and desktop layout variants. Totals and per-game averages are computed client-side.

### Base44 calls
| Call | Purpose |
|------|---------|
| `base44.auth.me()` | Current user + league filter |
| `base44.entities.League.list()` | All leagues |
| `base44.entities.Team.filter({ league_id })` | Teams in selected league |
| `base44.entities.Player.filter({ team_id: { $in: teamIds } })` | Players for those teams (multi-team filter) |
| `base44.entities.Game.filter({ league_id })` | Games in selected league |
| `base44.entities.PlayerStats.filter({ game_id: { $in: gameIds } })` | Stats for completed games (multi-game filter) |

### Nested query pattern
Two-step: teams → then players (filtering by `team_id IN [...]`); games → then player_stats (filtering by `game_id IN [...]`). Both use `$in` array filters.

### Key field references
- `player.name` — Supabase has `first_name` / `last_name` + computed `name` column (migration 008). **OK.**
- `league.season` — used in league selector label. **Needs `season` column on leagues.**
- `stat.is_active` — referenced in some stat display logic. **`player_stats` has no `is_active` column.** Only `is_starter` exists.

### Child components (8 total)
`TeamStats`, `PlayerStats`, `LeagueLeaders`, `GameStats` + mobile variants of each.

### DB data needed
`leagues`, `teams`, `players`, `games`, `player_stats`

### Migration complexity
**Complex** — multi-step nested queries, `$in` filter equivalents need Supabase `.in()` calls, `player.name` computed column already exists. Main risk: `is_active` references in child stat components need auditing and replacement with `is_starter`.

---

## 3. LiveBoxScore.jsx

### What it displays
Live box score for a single game (gameId from URL param). Shows score header, clock, latest activity, and two stat tables (one per team) with all player stats merged and summarised. Active players highlighted in green.

### Base44 calls
| Call | Purpose |
|------|---------|
| `base44.entities.Game.get(gameId)` | Game record (score, status, mode) |
| `base44.entities.PlayerStats.filter({ game_id })` | All player_stats rows for the game |
| `base44.entities.Team.get(home_team_id)` | Home team |
| `base44.entities.Team.get(away_team_id)` | Away team |
| `base44.entities.Player.filter({ id: { $in: playerIds } })` | Player name/jersey for display |
| `base44.entities.GameLog.filter({ game_id }, '-created_date', 1)` | Most recent game log entry |
| `base44.entities.PlayerStats.subscribe(cb)` | Realtime: invalidate stats query on change |
| `base44.entities.Game.subscribe(cb)` | Realtime: update score/status on change |
| `base44.entities.GameLog.subscribe(cb)` | Realtime: invalidate latest log on change |

### Key field references
- `stat.is_active` — used to highlight on-court players and cap active count to 5. **`player_stats` has no `is_active` column.** Only `is_starter`. This is the same bug fixed in LiveStatTracker.
- `player.name` — computed column from migration 008. **OK.**
- `player.jersey_number` — exists on players table. **OK.**
- `team.color` — used for jersey badge background. **Needs `color` column on teams.**
- `displayGame.game_mode` — used to conditionally show MIN column. **Needs `game_mode` column on games.**

### Notable logic
- `mergeStatsByPlayer()`: aggregates multiple `player_stats` rows per player (sums all counting stats, takes most recent `is_active`). This handles the one-row-per-action pattern from LiveStatTracker.
- `capActiveHighlights()`: if >5 active players detected for a team, caps to 5 most recent. Defensive guard for data inconsistency.
- Polling fallback: `refetchInterval: 3000` on game and stats queries (in addition to Realtime).

### DB data needed
`games`, `teams`, `players`, `player_stats`, `game_logs`

### Migration complexity
**Complex** — five entities, Realtime subscriptions need Supabase equivalents, `is_active` must be replaced with `is_starter` throughout (both in queries and in `mergeStatsByPlayer`/`capActiveHighlights`). `team.color` and `game.game_mode` columns must exist.

---

## 4. PlayerProfile.jsx

### What it displays
Personal player dashboard, accessible to `user_type = 'player'` or `'coach'` only. Shows a hero card, achievements, performance trend, last game summary, and next game. A league selector appears if the user is assigned to multiple leagues.

### Base44 calls
| Call | Purpose |
|------|---------|
| `base44.auth.me()` | Current user (type, display_name, assigned_league_ids) |
| `base44.entities.UserLeagueIdentity.filter({ user_id })` | Per-league player identity for the logged-in user |
| `base44.entities.League.list()` | All leagues (filtered to user's leagues client-side) |
| `base44.entities.Team.list()` | All teams (filtered to current team by identity) |
| `base44.entities.Player.filter({ team_id })` | Players on current team |
| `base44.entities.Game.filter({ league_id })` | All games in selected league |
| `base44.entities.PlayerStats.list()` | **All** player stats across all leagues — filtered client-side |

### UserLeagueIdentity — critical Base44-specific concept
This entity maps a user to a league and optionally a specific player record. Fields used:
- `identity.user_id`
- `identity.league_id`
- `identity.team_id`
- `identity.matched_player_id` (links user account → player row)

**This table does not exist in Supabase.** It needs to be created as a new migration. Without it, player-facing login has no way to know which player row belongs to which auth user.

### Player resolution logic
1. Prefer `matched_player_id` from identity (explicit link)
2. Fallback: match `currentUser.display_name` against `player.name` (case-insensitive)

### Key field references
- `currentUser.assigned_league_ids` — needs to exist on the auth user profile
- `currentUser.user_type` — needs to exist on the auth user profile
- `currentUser.display_name` — needs to exist on the auth user profile
- `league.season` — used in league selector label
- `player.name` — computed column from migration 008. **OK.**
- `stat.did_play` — field on `player_stats` used in `didPlayerParticipate()`. **Needs `did_play` column on player_stats.**
- `stat.minutes_played` — exists from migration 007. **OK.**

### Performance concern
`base44.entities.PlayerStats.list()` fetches ALL stats rows with no filter. With a large dataset this will be slow. On rebuild, should filter by `player_id` or by `game_id IN (leagueGameIds)` instead.

### DB data needed
`leagues`, `teams`, `players`, `games`, `player_stats`, `user_league_identities` (new table)

### Migration complexity
**Very complex** — requires a new `user_league_identities` table (`user_id`, `league_id`, `team_id`, `matched_player_id`). Also requires `did_play` column on `player_stats`, `season` on `leagues`, `user_type`/`display_name`/`assigned_league_ids` on user profiles (likely in a `profiles` table referencing `auth.users`). No Realtime needed.

---

## Summary Table

| Page | Entities | Realtime | New Migrations Needed | Complexity |
|------|----------|----------|-----------------------|------------|
| Standings | leagues, teams, games | No | `season` on leagues (if missing) | Medium |
| Statistics | leagues, teams, players, games, player_stats | No | `season` on leagues; audit `is_active` refs in child components | Complex |
| LiveBoxScore | games, teams, players, player_stats, game_logs | Yes (3 subs) | `color` on teams; `game_mode` on games; replace `is_active` with `is_starter` | Complex |
| PlayerProfile | leagues, teams, players, games, player_stats, user_league_identities | No | New `user_league_identities` table; `did_play` on player_stats; user profile fields | Very complex |

## Recommended rebuild order
1. **Standings** — least risk, all data already available
2. **Statistics** — builds on same data; child components need `is_active` audit
3. **LiveBoxScore** — needs Realtime wiring + `is_active` → `is_starter` fix
4. **PlayerProfile** — needs `user_league_identities` migration and design decision on user profile storage before rebuild can start
