# Router check — /Login route
**Date:** 2026-04-16
**File checked:** src/App.jsx

## How routing works

App.jsx uses a custom `AuthenticatedApp` component that splits routing into two states:

### Unauthenticated (no session)
```jsx
<Routes>
  <Route path="/Landing" element={<LandingPage />} />
  <Route path="*" element={<LoginPage />} />   // catches ALL routes including /Login
</Routes>
```
- Every route except `/Landing` renders `LoginPage` directly (the component, not the page wrapper)
- This means `/Login` works — but it renders the component directly, not via `src/pages/Login.jsx`

### Authenticated (has session)
```jsx
<Route path="/login" element={<LoginPage />} />   // lowercase /login — likely a legacy stub
<Route path="/" element={<MainPage />} />
{Object.entries(Pages).map(...)}   // auto-registers all src/pages/ files
<Route path="/AllPlayersView" ... />
...
```
- `Pages` is populated from `pages.config` which auto-imports all `src/pages/` files
- `src/pages/Login.jsx` (just created) will be auto-registered at `/Login` by `pagesConfig`
- There's also a hardcoded `/login` (lowercase) route pointing to `LoginPage` component directly

## Current state

| Route | Unauthenticated | Authenticated |
|-------|----------------|---------------|
| `/Login` | Renders `LoginPage` component (via `*` catch-all) | Renders `src/pages/Login.jsx` via pagesConfig auto-import |
| `/login` | Renders `LoginPage` component (via `*` catch-all) | Renders `LoginPage` component directly (hardcoded) |
| `/Landing` | Renders `Landing.jsx` | Not explicitly handled (falls to Pages auto-routes) |

## What this means

- **No explicit `/Login` route needed** — the `*` catch-all handles unauthenticated users, and pagesConfig auto-registers `Login.jsx` for authenticated users
- **`src/pages/Login.jsx` redirect logic is redundant** — authenticated users are already blocked from seeing `LoginPage` by `AuthenticatedApp`; the redirect to `/LeagueSelection` in `Login.jsx` will still fire if an authenticated user somehow hits `/Login`
- **The hardcoded `/login` route** (lowercase) in the authenticated section should be removed or updated to point to the new `Login.jsx` page for consistency

## Recommended fix in App.jsx

Remove or update the hardcoded `/login` route in the authenticated `Routes` block — it's a legacy stub that renders `LoginPage` directly without the redirect logic. It won't cause breakage but is dead code for authenticated users.
