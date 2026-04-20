# GameLog.jsx — current state

**Status:** Broken — uses base44 for all data fetching. No Supabase queries at all.

## Problems
- `base44.auth.me()` — replaced by useAuth()
- `base44.entities.League.list()` — needs Supabase query
- `base44.entities.Game.filter()` — needs Supabase query
- `base44.entities.Team.list()` — needs Supabase query
- `base44.entities.Player.list()` — needs Supabase query
- `base44.entities.GameLog.filter()` — needs Supabase query on `game_logs` table
- `log.created_date` — actual column is `created_at`
- Player/team data resolved client-side by scanning full list — inefficient; join in query instead

## What's worth keeping
- stat type color map (`statTypeColors`)
- `getActionLabel` / `getActionColor` logic
- CSV and Excel export logic (buildRows, downloadCSV, downloadExcel)
- `getScoreAtTime` score display logic
- Overall layout structure (filters → game header → log list)
- `filterPoints` toggle UI

```jsx
// Full file: 341 lines, all base44 — see git history
```
