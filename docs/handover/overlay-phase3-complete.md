# Live Game Overlay — Phase 3 Complete

Date: 2026-05-26

## What was built

Phase 3 adds a broadcast control panel at `/overlay/:gameId/control`, an `avatars` Supabase
Storage bucket for crew logos, and wires up all visibility toggle logic in the overlay.

---

## Files created / modified

| File | Action |
|---|---|
| `supabase/migrations/20260526000003_avatars_bucket.sql` | New — avatars bucket + RLS policies |
| `src/pages/OverlayControl.jsx` | New — broadcast control panel page |
| `src/App.jsx` | Added `/overlay/:gameId/control` route |
| `src/components/broadcast/Scorebug.jsx` | Added `crewLogoUrl` prop; extracted `CrewStripContent`; added named export `CrewStripOverlay` |
| `src/components/broadcast/BroadcastActionsMenu.jsx` | Added "Open control panel" menu item |
| `src/pages/LiveGameOverlay.jsx` | Replaced null-return with three-state visibility logic |

---

## Migration: 20260526000003_avatars_bucket.sql

Creates the `avatars` storage bucket (public = true, meaning any URL is readable without a
signed token — required for OBS anon browser sources to load crew logos).

RLS policies on `storage.objects`:
- **Public read** — `to public using (bucket_id = 'avatars')`
- **App admin write** — unrestricted insert/update/delete within the bucket
- **League admin write** — restricted to `crew/<gameId>/` paths; resolves league via the
  game's `league_id`, then checks `get_my_league_role()`.

Path convention: `crew/{gameId}/logo.{ext}` — always `upsert: true`, so re-uploading
replaces the previous logo.

---

## Route: /overlay/:gameId/control

Registered in the **outer** `<Routes>` in `App.jsx` (same level as `/overlay/:gameId`),
so it has no `LayoutWrapper` — full-screen, no sidebar or header.

`AuthProvider` still wraps everything, so `useAuth()` works inside `OverlayControl`.

---

## OverlayControl.jsx

### Auth/access gate

1. If `isLoadingAuth` → spinner
2. If `!isAuthenticated` → `<Navigate to="/Login" replace />`
3. If game loaded but user is neither `isAppAdmin` nor `isLeagueAdmin` → access denied screen
4. Otherwise → control panel

League-admin check mirrors `BroadcastActionsMenu`: `useQuery` on `user_league_memberships`
with key `['my-league-role', leagueId, userId]`, skipped for app admins.

### Visibility section

Two toggles backed by direct `supabase.update()` calls — no save button needed, changes
fire immediately (Realtime in `useBroadcastState` propagates to the live overlay).

**Master/sub visual hierarchy:**
- `overlay_visible` toggle — always interactive
- `scorebug_visible` toggle — indented with a left-border accent line; when
  `overlay_visible = false`, rendered at `opacity: 0.38` with `pointer-events: none`
  and description text changes to "No effect — overlay is off."
- The accent border switches from `var(--ct-accent)` to `var(--ct-border)` when overlay is off

### Crew identity section

- **Crew name**: text input, `maxLength: 60`. Saved on "Save crew identity" button click.
- **Crew logo**: file input (JPG/PNG/GIF/WebP/SVG). On select → upload to
  `avatars/crew/{gameId}/logo.{ext}` with `upsert: true` → get public URL (with `?t=` cache
  bust) → stored in local state. Logo and name are both written together on save.
- Local form state is seeded from `broadcastState` on first load (via `initializedRef`
  so it only seeds once and doesn't fight the user's edits).

---

## Visibility logic in LiveGameOverlay.jsx

The previous `if (!broadcastState.overlay_visible) return null` was removed.

New three-state logic:

| `overlay_visible` | `scorebug_visible` | What renders |
|---|---|---|
| false | any | LIVE badge only |
| true | true | LIVE badge + full Scorebug (incl. crew strip) |
| true | false | LIVE badge + standalone `CrewStripOverlay` (if crew name set) |

LIVE badge is unconditionally rendered — it is always visible.

---

## Scorebug.jsx changes

### `CrewStripContent` (private sub-component)
Extracted from old Strip 5. Accepts `{ crewInitial, crewDisplay, crewLogoUrl }`.
When `crewLogoUrl` is truthy → renders 14×14 `<img>` with `objectFit: cover`.
When falsy → renders amber initial square (existing behaviour).

### `CrewStripOverlay` (named export)
Standalone positioned element (`position: absolute, bottom: 14, right: 14`).
Returns `null` if no crew name. Used by `LiveGameOverlay` when scorebug is hidden but
overlay is on.

### `Scorebug` (default export)
Now accepts `crewLogoUrl` prop. Strip 5 uses `<CrewStripContent>` (same visual output as before).

---

## BroadcastActionsMenu.jsx

Added "Open control panel" as the **first** item in the dropdown (above "Copy overlay link").
Opens `/overlay/${gameId}/control` in a new tab (`_blank`, `noopener`).

---

## What's NOT in Phase 3

- League name / logo on the scorebug header — still shows fallback "LG" chip. Fix requires
  adding `league:leagues!league_id(...)` join to `useGameOverlayData`. Documented in
  `docs/temp/scorebug-redesign-data-gaps.md`.
- Real team logo images — spec says colored squares only. Phase 4+ when avatars bucket
  is used for team logos.
- `current_graphic` — lower-thirds, custom graphics. Reserved for Phase 4+.
- Phase 4 and Phase 5 features.
