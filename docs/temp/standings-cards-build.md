# Standings Cards Redesign — Build Result

## Build command
```
cd /Users/macm5pro/Projects/courtside && npm run build
```

## Output
```
vite v6.3.6 building for production...
✓ 2597 modules transformed.
dist/assets/index-DoBr0z54.css    112.93 kB │ gzip:  17.86 kB
dist/assets/index-CpGV18vW.js   1,300.92 kB │ gzip: 359.20 kB
✓ built in 1.84s
```

Zero errors. ✅

---

## What changed in src/pages/Standings.jsx

| Change | Details |
|---|---|
| Removed `Filter`, `Select*` imports | No longer used — dropdown is gone |
| Added `motion`, `AnimatePresence` | From `framer-motion` v12 (already in package.json) |
| Rewrote `TeamCard` | New structure per spec (see below) |
| Removed desktop "League" filter card | Replaced by pill bar shared with mobile |
| Single pill bar | Shown on all viewports; sticky only on mobile (`sticky top-0 md:static`) |
| Desktop table | Unchanged from prior dark-theme pass |
| Team name case | Mobile uses normal case (title case); desktop keeps `uppercase` per spec ("do not change the desktop view") |

## TeamCard structure (matches spec)

- **Container:** `#1A1A2E` bg, `#2A2A42` 1px border, `rounded-xl`, 16px padding, 8px margin-bottom
- **Top row:**
  - Rank: `text-lg font-bold`, gold `#F59E0B` (rank 1), white `#F0F0F5` (2–3), grey `#A0A0B8` (4+)
  - Circle: 44×44 rounded-full, `team.color` bg, white initial
  - Name: `text-base font-semibold #F0F0F5`, normal case
  - Trend arrow: green up / red down / grey dash
- **Second row** (indented under name):
  - `3 - 0 • 100% • +15` format
  - W green `#22C55E`, L red `#EF4444`, Win% grey `#A0A0B8`, +/- grey `#A0A0B8`
  - Dot separators
- **Expandable section** (Framer Motion `AnimatePresence` + height animation, 0.2s):
  - `#0F0F1A` bg, `rounded-lg`, 12px padding, 8px margin-top
  - Streak row: label + colored streak code
  - Last 5 row: label + small W/L colored dots
- **Chevron:** `ChevronDown` on right, rotates 180° when expanded

## Preserved unchanged
- All 3 `useQuery` hooks, all 6 helper functions (`getGameResult`, `getTeamStreak`, `getMiniStats`, `sortTiedGroup`, `computeStandings`, `getLast5Results`)
- Trend/streak calculation logic
- Tiebreaker sort logic
- `expandedTeamId` behavior (one open at a time)

---

## Test instructions

### Mobile (Chrome DevTools → iPhone 14, 390×844)
- [ ] Each team renders as its own dark card (no table row truncation)
- [ ] `W - L • Win% • +/-` all visible without expanding
- [ ] Rank #1 number is gold
- [ ] Rank #2–3 numbers are white
- [ ] Rank #4+ numbers are grey
- [ ] Team name is normal case, not uppercase
- [ ] Trend arrow appears next to team name (green/red/grey)
- [ ] Chevron rotates 180° smoothly when tapped
- [ ] Expanded section slides down with Framer Motion
- [ ] Expanded shows Streak + Last 5 dots on `#0F0F1A` bg
- [ ] Only one card can be expanded at a time
- [ ] League pill bar scrolls horizontally, sticks to top
- [ ] Active pill is blue `#3B82F6` white text; inactive `#2A2A42` grey text

### Desktop (full width)
- [ ] Dark table layout unchanged from prior pass
- [ ] Pill bar replaces old dropdown card (not sticky on desktop)
- [ ] Clicking a pill switches the standings
- [ ] Row hover turns `#2A2A42`
- [ ] Rank #1 gold in table
