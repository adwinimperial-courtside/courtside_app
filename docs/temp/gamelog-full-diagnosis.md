# Game Log Full Diagnosis

## Query 1: Game statuses
| status | count |
|---|---|
| final | 14 |
| live | 2 |
| scheduled | 6 |

## Query 2: Sample games
Date column is `scheduled_at` (NOT `game_date`).
All games have `league_id` set. No NULLs.

## Query 3: Active leagues
One league: **Korisliiga Pro** (id: a1000000-...)

## Query 4: Null league_id games
0 — no nulls.

## Query 5: Games per league by status
| league | status | count |
|---|---|---|
| Korisliiga Pro | final | 14 |
| Korisliiga Pro | live | 2 |
| Korisliiga Pro | scheduled | 6 |

## Query 6–7: game_logs
Data exists. game_logs table has rows tied to game IDs.

## Query 8–9: RLS policies
- `games: members can read` — SELECT via `get_my_league_role(league_id) IS NOT NULL` ✅ covers league_admin
- `game_logs: members can read` — same pattern ✅
- No migration needed.

## Root Causes (all in GameLog.jsx)

| # | Problem | Detail |
|---|---|---|
| A | Wrong date column | `game_date` used everywhere — actual column is `scheduled_at` |
| B | Query fails entirely | `.select("..., game_date, ...")` — Supabase returns error, `data` is null → empty games array |
| C | Wrong order column | `.order("game_date", ...)` — would also fail |
| D | Status badge wrong | `"completed"` should be `"final"`, `"in_progress"` should be `"live"` |
| E | No console.log | Silent failure — no way to see the error without devtools |

## No migration needed — RLS is fine.
