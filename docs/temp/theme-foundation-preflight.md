# Dark Court Theme — Preflight Check

## Commands run
```
cd /Users/macm5pro/Projects/courtside
pwd && git branch --show-current && git status --short && ls -la src/Layout.jsx ...
```

## Results

### Current directory
```
/Users/macm5pro/Projects/courtside
```

### Current branch
```
feature/initial-schema
```

### Git status
```
?? docs/Handover/courtside-session-handover-base44-removal.md
?? docs/temp/commit-result.md
```
Clean (only two untracked docs files).

### Key files exist
```
-rw-r--r--  src/Layout.jsx                              6145 bytes  Apr 20 23:46
-rw-r--r--  src/lib/AuthContext.jsx                     4952 bytes  Apr 20 23:53
-rw-r--r--  src/components/layout/SidebarMenuContent.jsx 5227 bytes  Apr 20 23:47
-rw-r--r--  src/pages.config.js                         3600 bytes  Apr 20 23:47
```
All four key files confirmed present. ✅

## Key observations from file reads

- **Navigation pattern**: `<Link to={createPageUrl(pageName)}>` using react-router-dom. `createPageUrl` returns `'/' + name.toLowerCase()`.
- **Active state**: `location.pathname === url` from `useLocation()`.
- **LiveGame isolation**: `Layout.jsx` has an early return for `isLiveGamePage` (pathname includes "livegame") — renders a completely separate wrapper div with light gradient (`bg-gradient-to-br from-slate-50 to-slate-100`). This wrapper will receive `live-game-isolate` class for CSS exclusion.
- **Sidebar on mobile**: Currently uses shadcn Sheet overlay triggered by `SidebarTrigger` in mobile header. Will be replaced by hiding sidebar on mobile and showing BottomTabBar.
- **CSS entry**: `src/index.css` — uses shadcn CSS var system. `src/App.css` exists but is empty.
- **Styles dir**: Does not exist — will be created as `src/styles/`.
- **Role logic**: `isAdmin = isAppAdmin || userType === "league_admin"`. Viewer items filtered to exclude Leagues/Teams/CoachInsights/Whiteboard.

## Confirmed ready to proceed ✅
