# Dark Court Theme — Build Result

## Build command
```
cd /Users/macm5pro/Projects/courtside && npm run build
```

## Output
```
vite v6.3.6 building for production...
✓ 2597 modules transformed.
dist/assets/index-xra8SEcl.css    113.06 kB │ gzip:  17.88 kB
dist/assets/index-BVZY7Alp.js   1,299.22 kB │ gzip: 358.23 kB
✓ built in 1.91s
```

Zero errors. ✅
Module count: 2597 (up from 2594 — the 3 new layout components).
Chunk size warning is pre-existing, not caused by this change.

---

## Test instructions

### Start dev server
```
cd /Users/macm5pro/Projects/courtside
npm run dev
```

### What to verify

| Check | How |
|---|---|
| Page background is dark (#0F0F1A) | Open any page — background should be near-black navy |
| Bottom tab bar visible on mobile | Chrome DevTools → Toggle device toolbar → iPhone 14 (390×844) |
| Bottom tab bar hidden on desktop | Standard desktop viewport — only sidebar should show |
| Sidebar visible on desktop | Desktop viewport — left sidebar with dark background |
| Tab navigation works | Tap Home / Schedule / Standings / Stats — URL changes, active tab turns blue |
| "More" tab opens drawer | Tap More — slide-up panel appears |
| Drawer shows role-appropriate items | Log in as player/coach, admin, app_admin — verify section visibility |
| Drawer closes on overlay tap | Tap the dark overlay behind the drawer |
| LiveStatTracker NOT affected | Navigate to `/livegame` path — should show light gradient background, NOT dark |
| Sidebar menu items use blue accent | Active item in desktop sidebar should be electric blue, not orange |

### LiveGame isolation check
The `live-game-isolate` CSS class is applied to the LiveGame early-return wrapper in Layout.jsx.
`theme.css` defines `.live-game-isolate { ... }` which resets all shadcn CSS vars back to light defaults.
LiveGame uses `bg-gradient-to-br from-slate-50 to-slate-100` which overrides the dark body background.

---

## Files changed

| File | Action |
|---|---|
| `src/styles/theme.css` | Created — CSS custom properties + live-game-isolate reset + scrollbars + selection |
| `src/components/layout/BottomTabBar.jsx` | Created — 5-tab fixed bottom nav, mobile-only |
| `src/components/layout/MobileMoreDrawer.jsx` | Created — slide-up drawer with role-based nav |
| `src/Layout.jsx` | Updated — dark theme, imports, bottom nav integration, LiveGame isolation |
| `src/index.css` | Updated — shadcn vars mapped to Dark Court palette, theme.css imported |
| `src/components/layout/SidebarMenuContent.jsx` | Updated — active/hover colors changed from orange → electric blue |
