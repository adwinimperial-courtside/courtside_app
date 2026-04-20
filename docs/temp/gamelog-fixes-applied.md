# GameLog Fixes Applied

## Root cause
Games dropdown was empty because the Supabase query selected and ordered by `game_date` — a column that doesn't exist. Supabase returned an error, `data` was null, `setGames([])` was called, dropdown stayed empty. No error was logged.

## Fixes (all in src/pages/GameLog.jsx)

| Fix | Before | After |
|---|---|---|
| Select column | `game_date` | `scheduled_at` |
| Order column | `.order("game_date", ...)` | `.order("scheduled_at", ...)` |
| Dropdown label date | `g.game_date` | `g.scheduled_at` |
| Game header date | `selectedGame.game_date` | `selectedGame.scheduled_at` |
| Status badge (green) | `=== "completed"` | `=== "final"` |
| Status badge (orange) | `=== "in_progress"` | `=== "live"` |
| Error visibility | No error logging | `console.log("[GameLog] games fetch:", { data, error })` |

## No migration needed
- RLS on `games`: `games: members can read` covers league_admin via `get_my_league_role(league_id) IS NOT NULL` ✅
- RLS on `game_logs`: same pattern ✅

## Actual status values in DB
- `"final"` — 14 games (previously played)
- `"live"` — 2 games (in progress)
- `"scheduled"` — 6 games (upcoming)

All three are now shown in the dropdown (no status filter applied on fetch).
