# Live Game Overlay — Phase 1 Complete

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/20260526000001_broadcast_state.sql` | DB table, RLS policies, backfill, auto-trigger, Realtime setup |
| `src/hooks/useBroadcastState.js` | React hook — initial fetch + Realtime subscription for overlay control state |
| `src/pages/LiveGameOverlay.jsx` | Public overlay page — LIVE badge, Courtside credit, transparent background |
| `src/App.jsx` (modified) | Added public `/overlay/:gameId` route outside auth/layout wrappers |

## Migration Applied

**Number:** `20260526000001_broadcast_state.sql`
(Project uses timestamp-based naming — spec's `000028_` prefix does not match convention)

**Verified:**
- 9-column table with correct types and nullability
- 4 RLS policies (public SELECT, authenticated INSERT/UPDATE/DELETE)
- 43 broadcast_state rows backfilled = 43 existing games
- `supabase_realtime` publication confirmed

## Key Decisions

### RLS: public SELECT
`broadcast_state` has `FOR SELECT TO public USING (true)`. This is intentional — the `/overlay/:gameId` URL is loaded by OBS as an anonymous browser source. No sensitive data lives in this table; it only contains visibility toggles and crew branding.

### RLS helper functions used
- `is_app_admin()` — JWT-based admin check, defined in earlier migrations
- `get_my_league_role(league_id uuid)` — returns role text for the calling user in a given league

### INSERT/UPDATE admin check
Uses a subquery to resolve the league from the game:
```sql
get_my_league_role((select league_id from games where id = game_id)) = 'league_admin'
```

### Auto-trigger for new games
`create_broadcast_state_for_game()` trigger fires `AFTER INSERT ON games` so every new game automatically gets a `broadcast_state` row. No manual setup needed.

### Routing approach
`/overlay/:gameId` is registered at the outermost `<Routes>` level in `App.jsx`, before `<AuthenticatedApp>`. This means:
- No auth check is performed
- No `LayoutWrapper` is applied (no sidebar, header, or bottom tabs)
- `AuthProvider` is still present (required by `useAuth` in other parts of the tree), but the overlay never calls `useAuth()`

### Hook: uid generation
Uses `const uid = Math.random().toString(36).slice(2, 9)` inside the `useEffect` body (not `useRef`) to generate a unique channel name per mount, avoiding Supabase's channel deduplication issue in React StrictMode.

## What's Next — Phase 2: Scorebug

Phase 2 will add the scorebug graphic to the overlay, reading live game data. It will build on top of this foundation:

- `useBroadcastState` already subscribes to `scorebug_visible` — Phase 2 just needs to check it before rendering the scorebug
- `current_graphic` (jsonb) is reserved for Phase 2+ lower-thirds and custom graphics
- Route and transparent container are already in place — the scorebug drops into the same fixed overlay div

**Live data needed for Phase 2:** home/away scores, team names, period, clock. These come from the `games` and `player_stats` tables (already used by `LiveBoxScore`/`ScoreHeader`).
