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

---

# Phase 3 Amendment — Broadcaster logo (top-right) + Streamer ticker (bottom)

Date: 2026-05-26

The crew logo and crew strip were redesigned mid-flight. The first pass put the logo
inside the small crew strip at the bottom of the scorebug. The amendment promotes the
logo to a large standalone brand mark in the **top-right corner** of the overlay, and
adds a new full-width **scrolling streamer/ticker** at the bottom for sponsor
messages and announcements. The crew strip stays under the scorebug but is now
**text-only** (no logo, no initial square).

## Files created / modified (since amendment started)

| File | Action |
|---|---|
| `supabase/migrations/20260526000004_broadcast_state_marketing.sql` | New — 3 columns |
| `src/components/broadcast/BroadcasterLogo.jsx` | New — top-right 112×112 brand mark |
| `src/components/broadcast/StreamerBar.jsx` | New — full-width scrolling marquee |
| `src/components/broadcast/Scorebug.jsx` | Crew strip is text-only; added `bottomOffset` prop |
| `src/hooks/useBroadcastState.js` | DEFAULT_STATE includes new columns |
| `src/pages/LiveGameOverlay.jsx` | Wires logo + streamer; reposition scorebug when ticker visible |
| `src/pages/OverlayControl.jsx` | Two new visibility toggles + new Streamer/Sponsor section |
| `docs/Handover/overlay-phase3-complete.md` | This amendment section |

## Schema additions (20260526000004)

| Column | Type | Default | Purpose |
|---|---|---|---|
| `streamer_text` | text | `''` | Sponsor / announcement message scrolled across the bottom |
| `streamer_visible` | bool | `false` | Sub-toggle for the streamer ticker (defaults off — opt-in feature) |
| `crew_logo_visible` | bool | `true` | Sub-toggle for the top-right broadcaster logo |

## BroadcasterLogo

- Fixed top-right at `top: 24, right: 24`
- 112×112 container with `border-radius: 12`, transparent background
- Drop shadow `0 4px 16px rgba(0,0,0,0.4)` for separation over busy gameplay
- Image uses `object-fit: contain` so non-square logos preserve aspect ratio
- z-index 30, pointer-events none
- Renders only when caller passes a truthy `src` (LiveGameOverlay handles the visibility gate)

## StreamerBar

- Fixed bottom-edge full-width, 56px tall, `rgba(15, 15, 26, 0.95)` background
- Top border: 2px solid `#3B82F6` (the brand accent)
- Text: 22px, weight 600, white, vertically centered via `line-height: 56px`
- Animation via framer-motion: inner track is two identical copies of `(message + 200px right-padding)` side-by-side; track animates `x: 0% → -50%` linearly over 30s on infinite repeat. Animating by exactly one item's width (= -50% of two items) means the reset snaps to a visually identical position — seamless loop.
- z-index 40, pointer-events none

## Visibility model (final)

| `overlay_visible` | sub-toggle | What renders |
|---|---|---|
| false | (any) | LIVE badge only |
| true | `crew_logo_visible` & logo URL set | BroadcasterLogo (top-right) |
| true | `scorebug_visible` | Scorebug (includes text-only crew strip) |
| true | NOT `scorebug_visible` & crew name set | standalone CrewStripOverlay |
| true | `streamer_visible` & non-empty text | StreamerBar |

When StreamerBar is visible, the scorebug (and standalone crew strip) get `bottomOffset = 64` (56px bar + 8px gap) so they sit above the ticker — no overlap. When the streamer is hidden, the scorebug returns to its base `bottom: 14`.

## Control panel changes

Visibility section now has 4 toggles in this order:

1. **Overlay active** (master)
2. **Scorebug** (sub)
3. **Show broadcaster logo (top-right)** (sub)
4. **Show streamer ticker (bottom)** (sub)

All three sub-toggles dim and lock when overlay is off (existing master/sub pattern).

New section: **Streamer / Sponsor** — textarea (max 240 chars) + character counter + Save button. Writes `streamer_text` to `broadcast_state`.

Logo upload helper text updated: now says "Displayed as the large broadcaster mark in the top-right of the overlay" (was: "instead of the initial square"). Crew-name helper text clarified: "Displayed as text on the scorebug crew strip when set."

## Known gaps / surprises

- **Marquee speed is text-length-relative, not screen-relative.** The 30-second cycle covers one item's width (text + 200px gap), not the full 1920px screen. Short messages scroll faster across the visible viewport; long messages scroll slower. This was a deliberate trade-off for the seamless-loop architecture mandated by the spec.
- **No client-side image dimension validation.** A wildly non-square logo will be letterboxed by `object-fit: contain` into the 112×112 box — visually correct but small. Operators may want to pre-crop logos for best results.
- **Streamer text edit is save-on-button**, not save-on-blur. Operators must click "Save streamer message" to apply changes. Visibility toggle is independent — toggling the streamer on/off does not save unsaved text edits.
