# Migration + Impersonation Result

Working directory: `/Users/macm5pro/Projects/courtside`
Branch: `feature/initial-schema`

## Files Created (3)

- `src/pages/SimulateUser.jsx` — admin page to pick a user and impersonate
- `src/components/layout/ImpersonationBanner.jsx` — fixed amber top banner with live countdown + exit
- `src/components/layout/DevicePreviewToggle.jsx` — floating FAB with Desktop/Tablet/Phone options (exports `DEVICE_WIDTHS`)

## Files Modified (12)

### Part A — AuthContext impersonation support
- `src/lib/AuthContext.jsx` — added `isImpersonating`, `impersonatedUser`, `impersonationExpiresAt`, `impersonationLogId`, `realIsAppAdmin`, `startImpersonation`, `stopImpersonation`. The `onAuthStateChange` listener fires naturally on `setSession()` and re-fetches the impersonated profile — no guarding needed. `realIsAppAdmin` is the only value preserved across the swap.

### Part B — Page migrations (base44 → Supabase)
- `src/pages/Whiteboard.jsx` — removed `base44.auth.me()` bootstrap, now uses `useAuth()` + existing `supabase` queries
- `src/pages/Coaches.jsx` — rewritten with `useAuth()`, no data fetching in page
- `src/pages/Viewers.jsx` — rewritten with `useAuth()`, no data fetching in page
- `src/pages/LeagueIDs.jsx` — `base44.entities.League.list()` → `supabase.from('leagues').select('*')`
- `src/pages/ApplyForLeague.jsx` — `base44.auth.me` → `useAuth()`, all entity calls → Supabase. `assigned_league_ids` now derived from `user_league_memberships`.
- `src/pages/CoachInsights.jsx` — `base44.auth.me` → `useAuth()`, 5 entity list calls → Supabase. `assigned_league_ids` derived from `user_league_memberships`.
- `src/pages/FixManualStats.jsx` — full rewrite of query logic: `base44.entities.Game.filter`/`update`, `PlayerStats.filter`/`update`, `League.list`, `Team.list` → Supabase equivalents.
- `src/pages/PlayerProfile.jsx` — `base44.auth.me` → `useAuth()`, all 6 entity calls → Supabase. `assigned_league_ids` derived from `user_league_memberships`.
- `src/components/admin/CoachesView.jsx` — `base44.entities.User.list` → `profiles`, `base44.entities.League.list` → `leagues`. Added `user_league_memberships` join for assigned-leagues display.
- `src/components/admin/ViewersView.jsx` — identical pattern to CoachesView.
- `src/components/player/PlayerDashboardCard.jsx` — `base44.integrations.Core.UploadFile` → Supabase Storage (bucket `avatars`); `base44.auth.updateMe` → `supabase.from('profiles').update`.

### Part C — Impersonation UI wiring
- `src/Layout.jsx` — imports `ImpersonationBanner`, `DevicePreviewToggle`, `DEVICE_WIDTHS`. Reads `isImpersonating`, `realIsAppAdmin` from `useAuth()`. Renders banner above content when impersonating (adds 48px padding-top). Wraps `{children}` in a device-frame container when deviceMode ≠ `desktop`. Passes `isAppAdmin || realIsAppAdmin` to Sidebar so OWNER menu stays visible during impersonation.
- `src/components/layout/SidebarMenuContent.jsx` — added `UserSearch` icon import, populated the previously empty `ownerItems` with `{ title: "Simulate User", url: createPageUrl("SimulateUser"), icon: UserSearch }`.
- `src/pages.config.js` — imported `SimulateUser`, added to `PAGES` map (picked up automatically by the `<Routes>` loop in `App.jsx`).

## Deviations From Spec

1. **`user_applications` schema mismatch** — The Supabase table has only `id, user_id, email, full_name, requested_role, league_id, message, status, reviewed_by, reviewed_at, created_at, updated_at`. The old base44 payload included `league_ids`, `league_team_pairs`, `is_additional_request`, `applied_at`, `team_id`, `current_user_type`, `user_email`, `user_name` — none of these exist. The new insert uses only the real columns; for role=`player`, the team selection is collected in the UI but not persisted (no `team_id` column exists). Consider adding the missing columns if the reviewer workflow needs them, or moving team selection into a separate flow.

2. **`last_active` ambiguity in AuthContext** — The existing code writes `last_active` on `SIGNED_IN`. When `startImpersonation` calls `supabase.auth.setSession()`, this fires `onAuthStateChange` with event `SIGNED_IN`, which would update `last_active` for the *impersonated* user. Left this behavior unchanged per spec (no special guarding). If needed, the SIGNED_IN handler could check `!isImpersonating` before updating.

3. **`PlayerDashboardCard` avatar upload** — Migrated from base44's `UploadFile` + `auth.updateMe` to Supabase Storage (`avatars` bucket) + `profiles.avatar_url` update. Uploads to path `{user_id}/{timestamp}.{ext}`. Also changed the stored column from `profile_photo_url` to `avatar_url` since that's the real `profiles` column.

4. **`DEVICE_WIDTHS` export** — The spec said "Exports: the selected device width (or null for desktop)". Implemented as a named export `DEVICE_WIDTHS` object (`{desktop: null, tablet: 768, phone: 375}`) consumed by `Layout.jsx`. The `DevicePreviewToggle` component itself is controlled via `activeDevice`/`onChange` props.

5. **`ApplyForLeague.jsx` previous-requests filter** — Removed the `is_additional_request: true` filter since that column doesn't exist. Now shows all applications for the current user.

6. **`Whiteboard.jsx` `supabaseUser` prop** — The `SavePlayDialog` and `LoadPlayDialog` children expect a `supabaseUser` prop. Preserved by passing through `authUser` (from `useAuth()`) under the same name.

## Remaining Base44 References

```
src/api/base44Client.js   (the stub file itself — as specified)
```

Every other file is clean.

## Build Result

```
✓ 2594 modules transformed.
✓ built in 1.67s
Zero errors.
```

Bundle grew slightly from 1,280 KB → 1,294 KB (+14 KB) due to the three new impersonation UI files.
