# GameLog.jsx — fetch logic (before fix)

## League fetch (useEffect, runs on mount)
```js
// app_admin: all active leagues
supabase.from("leagues").select("id, name").eq("is_active", true).order("name")

// league_admin: own memberships
supabase.from("user_league_memberships")
  .select("leagues(id, name)")
  .eq("user_id", currentUser.id)
  .eq("role", "league_admin")
  .eq("is_active", true)
```
✅ Correct — no issues here.

## Games fetch (useEffect, triggers on selectedLeagueId change)
```js
supabase
  .from("games")
  .select("id, game_date, status, home_score, away_score, home_team_id, away_team_id,
           home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name)")
  .eq("league_id", selectedLeagueId)
  .order("game_date", { ascending: false })   // ❌ column doesn't exist
```

**Bug:** `game_date` doesn't exist. Actual column: `scheduled_at`.
Supabase silently returns `data: null` when the query errors → `setGames([])` → empty dropdown.
No error is logged.

## Status filters applied
- None on fetch (all statuses returned) ✅
- Status badge display: `"completed"` → should be `"final"`, `"in_progress"` → should be `"live"` ❌

## Game label in dropdown
```jsx
{g.game_date ? format(new Date(g.game_date), "MMM d, yyyy") : "—"}  // ❌
```
Should be `g.scheduled_at`.

## Game header date
```jsx
{selectedGame.game_date ? format(new Date(selectedGame.game_date), "MMM d, yyyy · h:mm a") : "—"}  // ❌
```
Should be `selectedGame.scheduled_at`.
