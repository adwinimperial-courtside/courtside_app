# Courtside by AI — Session Handover
## Dark Court Theme + Mobile Redesign + Theme Toggle
**Date:** 2026-04-21
**Branch:** `feature/initial-schema`

---

## What Was Done This Session

### 1. Dark Court Theme — Foundation
- Created `src/styles/theme.css` with full CSS variable system (`--ct-*` semantic vars)
- Created `src/components/layout/BottomTabBar.jsx` — 5-tab mobile nav (Home, Schedule, Standings, Stats, More)
- Created `src/components/layout/MobileMoreDrawer.jsx` — slide-up drawer for non-core pages, role-based visibility
- Updated `src/Layout.jsx` — dark theme applied globally, bottom nav on mobile, sidebar hidden on mobile, LiveGame isolated via `.live-game-isolate` CSS class
- Updated `src/index.css` — shadcn CSS vars mapped to Dark Court palette
- Updated `src/components/layout/SidebarMenuContent.jsx` — active/hover colors changed to electric blue

### 2. Standings Page — Dark + Mobile Cards
- Replaced table with stacked team cards on mobile
- Each card shows: rank (gold for #1), team circle + full name, trend arrow, W-L record, Win%, +/- (all visible without expanding)
- Tap to expand: reveals Streak and Last 5 results
- League filter converted from dropdown to horizontal scrollable pill bar
- Desktop: dark table layout preserved

### 3. Statistics Page — Dark + Mobile Cards (all 3 tabs)
- **Team Stats**: team cards with 4-stat grid (PPG, RPG, APG, SPG), tap to expand full stats, sort pills
- **Player Stats**: player cards with jersey number, full name (normal case), 4-stat grid, leading stat highlighted in accent blue, tap to expand, sort pills, search input
- **League Leaders**: full-width stacked category cards (not 3-column grid), rank colors, category scroll pills
- Filter layout fixed: tabs shortened to "Teams/Players/Leaders" on mobile, team filter changed from individual pills to single dropdown pill
- Desktop: dark tables preserved

### 4. Schedule + Award Leaders + Home — Dark + Mobile Cards
- **Schedule**: game cards redesigned — each team gets its own row (circle + full name + score), no more truncated abbreviations, winner in primary text / loser muted, compact date·time·venue line, LIVE games with pulsing red dot + green scores
- **Award Leaders**: hero card for rank 1 (gold border, large score), compact rows for 2-10, tab pills shortened to MVP/DPOY/POG on mobile
- **Home**: spinner themed dark (Home.jsx is routing-only, no dashboard content)
- Date pills: newest-first order matching game list, today highlighted

### 5. Batch 3 — All Remaining Pages Dark Theme
- 85-file automated sed sweep converting all light Tailwind classes to dark equivalents
- Excluded: src/components/live/*, src/components/ui/*, LiveGame.jsx, LiveBoxScore.jsx
- Zero remaining bg-white/bg-gray/text-gray/shadow references in scope

### 6. Batch 3a — Mobile Structural Redesigns
- **League Users**: 2x2 stats grid, role filter pills, user cards (not table), tap to expand with Change Role
- **Game Log**: vertical timeline with colored dots by action type, filter dropdown pills, compact cards
- **Application Review**: application cards with approve/reject buttons, role badges
- **Bug fix**: removed LayoutWrapper double-wrap in App.jsx that caused isNarrow to always return false

### 7. Theme Toggle — Dark Court + Warm Sand (Claude-inspired Light Theme)
- Created dual palette in `theme.css`: Dark Court on `:root`, Warm Sand on `html[data-theme="light"]`
- Added `--ct-*-rgb` triplet companion vars for opacity variants (role badges)
- Added `--color-*` legacy aliases pointing to `--ct-*` vars (backward compat)
- 70-file sed sweep: all 1,191 hardcoded hex values replaced with `var(--ct-*)` references
- Created `src/components/layout/ThemeToggle.jsx` — Sun/Moon circular button, flips data-theme + writes localStorage
- Added no-flash inline script in `index.html` head (reads localStorage before CSS loads)
- Integrated toggle into SidebarMenuContent.jsx and MobileMoreDrawer.jsx
- Updated `src/index.css` with `html[data-theme="light"]` block for all shadcn HSL vars
- `.live-game-isolate` updated to reset both shadcn + `--ct-*` vars to neutral light regardless of active theme

### 8. Schedule Card Redesign (final fix)
- Mobile game cards fully redesigned: stacked team rows (away row + home row), full team names never truncated
- Winner row in primary text, loser in muted
- Compact meta line with dot separators (date · time · venue)
- LIVE cards: pulsing red dot, green scores, period indicator
- Date pills: newest-first, today ring indicator, auto-scroll

---

## Warm Sand (Light Theme) Palette
- Page background: #F4F3EE (Pampas)
- Card background: #FFFFFF
- Elevated/hover: #EDE9E3
- Accent: #C15F3C (Claude terracotta)
- Gold: #B8860B
- Primary text: #1A1410
- Secondary text: #6B5D4D
- Muted text: #B1ADA1
- Borders: #E8E0D6
- Success: #22C55E
- Danger: #DC2626

---

## Dark Court Palette
- Page background: #0F0F1A
- Card background: #1A1A2E
- Elevated/hover: #2A2A42
- Accent: #3B82F6 (electric blue)
- Gold: #F59E0B (amber)
- Primary text: #F0F0F5
- Secondary text: #A0A0B8
- Muted text: #6B6B80
- Borders: #2A2A42
- Success: #22C55E
- Danger: #EF4444

---

## Parked / Known Issues

1. **Impersonation Edge Function failing** — `mint-impersonation-token` returns non-2xx. Need to check Supabase Edge Function logs for the error. Parked.
2. **Resend domain verification** — still pending for courtsidebyai.com. Blocks invite email sending.
3. **Remaining mobile structural redesigns not yet done** (Batch 3b/3c):
   - PlayerProfile — hero + 3x2 stat grid + game log cards
   - AdminTools — pill section switcher + full-width sticky form
   - LeagueAwardSettings — accordion mobile layout
   - ApplyForLeague + RoleSelection — large tappable role cards
   - CoachInsights — insight panel cards + chart color updates
   - Whiteboard — toolbar button sizing for mobile
   - SimulateUser, FixManualStats, AcceptInvite, PendingApproval — misc
4. **Legacy `--color-*` vars** — still exist as aliases to `--ct-*` vars. ~30 inline-style refs use them (Layout.jsx, SidebarMenuContent.jsx, etc). Can be cleaned up later, not blocking.
5. **MobileMoreDrawer overlay** — uses fixed `rgba(15, 15, 26, 0.6)` instead of theme var. Works fine (always dark overlay) but could be theme-aware.
6. **Avatars storage bucket** — needs creation in Supabase Dashboard (Storage → New bucket → "avatars", public). Not urgent.
7. **Story Builder** — deleted from sidebar, needs full rebuild when ready.
8. **Atomic DB increments** — race condition with concurrent writes, pre-production fix needed.
9. **Debug console.logs in Home.jsx** — need removing before production.

---

## Architecture State

### Theme System
- CSS variables defined in `src/styles/theme.css`
- Dark Court = default (`:root`), Warm Sand = `html[data-theme="light"]`
- All page components use `var(--ct-*)` via Tailwind arbitrary values
- shadcn components themed via HSL vars in `src/index.css` with matching `html[data-theme="light"]` block
- Toggle component: `src/components/layout/ThemeToggle.jsx`
- Persistence: localStorage key `courtside-theme` ("dark" or "light")
- No-flash: inline script in `index.html` head sets `data-theme` before CSS loads
- LiveStatTracker isolated: `.live-game-isolate` class resets all vars to neutral light

### Mobile Navigation
- Bottom tab bar: Home, Schedule, Standings, Stats, More
- More drawer: slide-up panel with role-based menu items + theme toggle
- Sidebar: hidden on mobile, visible on desktop with theme toggle at bottom
- Mobile detection: `useIsNarrowLayout()` from DevicePreviewContext

### Auth Flow (unchanged)
- Supabase Auth (email/password + OAuth)
- Five roles: app_admin (user_metadata), league_admin, coach, player, viewer (profiles.user_type)
- Home.jsx is routing-only — redirects based on role/state

### Data Flow (unchanged)
- All pages use supabase.from('table').select() via TanStack Query
- Zero Base44 dependencies

### Key File Locations
- Theme config: src/styles/theme.css
- Theme toggle: src/components/layout/ThemeToggle.jsx
- Bottom nav: src/components/layout/BottomTabBar.jsx
- More drawer: src/components/layout/MobileMoreDrawer.jsx
- Auth: src/lib/AuthContext.jsx
- Layout: src/Layout.jsx
- Supabase client: src/lib/supabaseClient.js
- Sidebar: src/components/layout/SidebarMenuContent.jsx
- Pages config: src/pages.config.js
- Migrations: supabase/migrations/
- Edge Functions: supabase/functions/

---

## Git State
- Branch: feature/initial-schema
- All changes committed
- Build: zero errors, ~2600 modules

---

## What to Work On Next (suggested priority)

1. **Batch 3b mobile structural redesigns** — PlayerProfile (hero + stat grid), AdminTools (pill switcher + sticky form), LeagueAwardSettings (accordion)
2. **Batch 3c** — remaining simple pages (RoleSelection cards, CoachInsights charts, Whiteboard toolbar)
3. **Impersonation debugging** — check Edge Function logs, fix mint-impersonation-token
4. **Resend domain verification** — unblock invite emails
5. **Production hardening** — remove debug logs, atomic DB increments, lineup repair lock UI
