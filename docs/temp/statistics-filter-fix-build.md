# Statistics Filter Fix — Build Result

## Build command
```
cd /Users/macm5pro/Projects/courtside && npm run build
```

## Output
```
vite v6.3.6 building for production...
✓ 2598 modules transformed.
dist/assets/index-C__9FRod.css    112.96 kB │ gzip:  17.90 kB
dist/assets/index-DF2W6Cn3.js   1,311.76 kB │ gzip: 361.11 kB
✓ built in 1.81s
```
Zero errors. ✅

---

## What changed in `src/pages/Statistics.jsx`

### Problem 1 — Tab labels overflow on mobile
- Added `short` + `long` labels in `TABS` array:
  - `"Teams"` / `"Team Stats"`
  - `"Players"` / `"Player Stats"`
  - `"Leaders"` / `"League Leaders"`
- Tab button renders `isNarrow ? tab.short : tab.long`
- Tab container wrapped in `overflow-x-auto` with hidden scrollbar (inline `scrollbarWidth: none`) — fallback if they still overflow

### Problem 2 — Team filter as dropdown, not individual pills
- Added a reusable **`DropdownPill`** component:
  - Pill trigger with chevron-down icon (truncates labels at max-width 180px)
  - Click to open a dark-styled dropdown menu (`#1A1A2E` bg, `#2A2A42` border, `rounded-xl`, `shadow-lg`)
  - Each option: `px-3 py-2 rounded-lg`, `#A0A0B8` text → hover to `#F0F0F5` with `#2A2A42` bg
  - Selected option: `#3B82F6` text, `font-semibold`
  - Closes on outside click (document `mousedown` listener on ref)
  - Closes on option select
  - Max-height `60vh` with scroll if many teams

- **League filter:** now a single `DropdownPill active` (blue pill, white text) showing current league name. Tapping opens dropdown with all leagues.
- **Team filter:** single `DropdownPill` (grey pill) showing `"All Teams"` or selected team name. Tapping opens dropdown with "All Teams" + each team.
- Removed the old per-league and per-team `PillBar` rows.

### Search behavior (Player tab only)
- Added **`CollapsibleSearch`** component for mobile:
  - Collapsed: small `#2A2A42` circle with Search icon (36×36)
  - Tap → expands to full rounded-full input, auto-focuses
  - Blurring while empty collapses back to the icon (keeps the input visible while there's a query)
- Desktop: unchanged — inline 220px search input next to team pill

### Single compact filter row
All three controls now live in one `flex gap-2 items-center overflow-x-auto` row:
```
[League pill] [Team dropdown pill] [Search icon or input if Player tab]
```

---

## Preserved exactly (no changes)
- All 5 `useQuery` hooks
- `useSort` hook, `fmt1`, `calcPts`
- All per-game computation logic
- TeamCard / PlayerCard / LeaderCategoryCard layouts
- Sort pill bars inside each tab
- Desktop tables
- `PillBar` component (still used for in-tab sort pills)

---

## Test instructions

### Tab bar
- [ ] **Mobile (phone preview or real mobile):** labels read `Teams`, `Players`, `Leaders` — all three fit on one line
- [ ] **Desktop:** labels read `Team Stats`, `Player Stats`, `League Leaders`
- [ ] Tab bar is horizontally scrollable if the container is narrower than the pill group

### League filter
- [ ] Single blue pill showing current league name with chevron
- [ ] Tap → dropdown menu lists all leagues
- [ ] Selected league in dropdown shows `#3B82F6` + bold
- [ ] Tapping another league switches league, resets team to "All Teams", clears player search
- [ ] Tapping outside dropdown closes it

### Team filter
- [ ] Grey pill showing `All Teams` by default, or selected team name
- [ ] Tap → dropdown menu lists `All Teams` + every team
- [ ] Selecting a team filters the stats
- [ ] Selecting `All Teams` resets filter
- [ ] Dropdown closes after selection or outside click

### Search (Player tab)
- [ ] **Mobile:** only a small search icon pill is visible initially
- [ ] Tapping expands to a search input (auto-focused)
- [ ] Typing filters the player list (debounced 300ms)
- [ ] Clearing + blurring collapses back to icon
- [ ] Input stays open while there's a query even on blur
- [ ] **Desktop:** inline 220px search input always visible next to team pill

### Compact layout
- [ ] Mobile filter row is **one line** (not stacked) — scrollable if controls overflow
- [ ] Sticky behavior works — scrolling the page keeps tabs + filter row pinned under the header

### Data integrity
- [ ] Changing league re-fetches teams/players/games/stats
- [ ] Changing team filters stats correctly (verify counts)
- [ ] All three tabs still load correct data after applying filters
- [ ] Sort pills within each tab still work after filtering
