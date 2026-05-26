# BroadcastActionsMenu — Investigation
Date: 2026-05-26

## A. Schedule page game card

**File:** `src/components/schedule/ScheduleGameCard.jsx`

No Option C redesign in progress — code is complete and clean, no TODOs or unmerged sections.

Card structure (top → bottom):
1. **Header row** (`flex justify-between`): status badges (Live/Final/time) on left, league name on right
2. **Team rows**: away then home, with score
3. **Meta line**: date, venue, countdown
4. **Player of the game** (finals only)
5. **Actions footer** (`flex justify-end gap-2`): context-dependent buttons (Start, Edit, View stats, Continue, AlertTriangle)

`game` prop contains `game.id` (uuid) and `game.league_id` (uuid) — query uses `select('*', ...)` so all native columns are present.

**Best placement for BroadcastActionsMenu:** header row right side, alongside the league name. Keeps it top-right, unobtrusive, not mixed into the action buttons.

## B. LiveBoxScore — read-only scoreboard

**File:** `src/pages/LiveBoxScore.jsx`

This IS the read-only scoreboard (coaches/players/viewers see during a live game). Confirmed: not LiveStatTracker.

Gets `gameId` from URL params. Has `game` object with `game.league_id` from `select('*')` on games table.

Page header section (line 467–480):
```jsx
<div className="flex items-center gap-3 mb-4">
  <BarChart3 ... />
  <h1>Live Box Score</h1>
  {/* Live / Final badge */}
</div>
```

**Best placement:** add `ml-auto` spacer + `<BroadcastActionsMenu>` at the end of this flex row. Clean, top-right equivalent.

## C. useAuth — app_admin status

```js
import { useAuth } from "@/lib/AuthContext";
const { isAppAdmin } = useAuth();
// isAppAdmin = currentUser?.user_metadata?.app_admin === true
```

## D. League role check (client-side)

No standalone hook exists. Schedule.jsx pattern: query `user_league_memberships` once for all user memberships, then filter by league.

For BroadcastActionsMenu (called per-card with a specific leagueId), the cleanest approach is a targeted single-row query inside the component:

```js
supabase
  .from('user_league_memberships')
  .select('role')
  .eq('user_id', currentUser.id)
  .eq('league_id', leagueId)
  .eq('is_active', true)
  .maybeSingle()
```

If result.role === 'league_admin' → isLeagueAdmin = true.
If isAppAdmin → skip the query entirely, always show.

Use `useQuery` with `queryKey: ['my-league-role', leagueId, userId]` — this will cache cleanly when the same card appears multiple times.

## E. Dropdown menu

```js
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
```

## F. Toast

Schedule.jsx pattern (to match project tone):
```js
import { toast } from "@/components/ui/use-toast";
toast({ title: "Overlay link copied" });
toast({ title: "Couldn't copy link", description: err.message, variant: "destructive" });
```

## G. Icons

```js
import { MoreVertical, Link } from "lucide-react";
```
`Link` preferred over `Copy` for a URL action — more semantically accurate.
