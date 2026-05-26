# BroadcastActionsMenu — Handover

## What was added

A reusable admin-gated kebab menu for broadcast actions, wired into Schedule game cards.

## Files created / modified

| File | Change |
|---|---|
| `src/components/broadcast/BroadcastActionsMenu.jsx` | New component |
| `src/components/schedule/ScheduleGameCard.jsx` | Import + placement in header row |

## Component API

```jsx
<BroadcastActionsMenu gameId={game.id} leagueId={game.league_id} />
```

Returns `null` silently for non-admins — no DOM rendered, no role query for `app_admin` users.

## Role-check approach

- `isAppAdmin` from `useAuth()` — if true, skips the DB query entirely and shows the menu.
- Otherwise: queries `user_league_memberships` filtered by `user_id + league_id + is_active = true`. If `role === 'league_admin'` → show menu.
- `useQuery` with key `['my-league-role', leagueId, userId]`, 60s stale time — caches cleanly when the same league appears multiple times on the page.

## Placement in ScheduleGameCard

Header row right side — league name label + kebab button sit together in a `flex items-center gap-1.5` wrapper. Unobtrusive; does not mix with the action buttons at the card footer.

## Current menu item

**Copy overlay link** — copies `${window.location.origin}/overlay/${gameId}` to clipboard. Success toast: "Overlay link copied". Failure toast: "Couldn't copy link" (destructive variant).

## Phase 3 extension point

A comment inside `DropdownMenuContent` marks where additional items go:
```
// Phase 3 will add additional items here: Open broadcast control, Toggle overlay visibility.
```

Phase 3 just needs to import and add more `<DropdownMenuItem>` entries to the same component — no changes needed to ScheduleGameCard or any other call site.
