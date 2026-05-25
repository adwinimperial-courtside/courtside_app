# Statistics Redesign — Build Result

## Build command
```
cd /Users/macm5pro/Projects/courtside && npm run build
```

## Output
```
vite v6.3.6 building for production...
✓ 2598 modules transformed.
dist/assets/index-BuA3OpWk.css    112.93 kB │ gzip:  17.90 kB
dist/assets/index-DUb1hE2s.js   1,309.43 kB │ gzip: 360.56 kB
✓ built in 1.69s
```
Zero errors. ✅

---

## What changed in `src/pages/Statistics.jsx`

### Architecture
- **Mobile/desktop switch:** now driven by `useIsNarrowLayout()` from `DevicePreviewContext`, not Tailwind `md:*` classes — so phone/tablet device-preview correctly renders the mobile layout inside the 375px/768px frame.
- **All data logic preserved:** every `useQuery`, `useMemo` computation, `useSort`, `fmt1`, `calcPts` is untouched. Only presentation changed.
- **Deps added:** `framer-motion` (already installed) for slide-down expand animations.

### Header
- Dark page background (`#0F0F1A`)
- `BarChart3` icon in a blue gradient tile (matches accent)
- Title `#F0F0F5`, subtitle `#6B6B80`

### Filter bar (sticky under header, all viewports)
- **Removed:** the entire "Filters" card wrapper, heading, Select components
- **Tab pills:** segmented control in a `#1A1A2E` rounded-full container — active pill `#3B82F6`, inactive `#A0A0B8`
- **League pills:** replaces league dropdown — horizontal scroll if many leagues
- **Team pills:** replaces team dropdown — "All Teams" + per-team, horizontal scroll
- **Player search:** rounded-full dark input with search icon, only on Player tab

### Tab 1 — Team Stats
- **Narrow (mobile / phone-preview / tablet-preview):**
  - Sort pill bar: PPG, RPG, APG, SPG, BPG, TO, GP
  - Each team: dark card (`#1A1A2E` · 16px · `#2A2A42` border) with team circle + name + games-played, plus a 4-stat grid (PPG, RPG, APG, **SPG**)
  - Tap card → slides down `#0F0F1A` section with OREB, DREB, BPG, TO
  - Leading stat (current sort column) highlighted `#3B82F6`
- **Desktop:** dark table — header `#2A2A42` bg with `#A0A0B8` uppercase labels, rows hover to `#2A2A42`, PTS column in accent blue

### Tab 2 — Player Stats
- **Narrow:**
  - Sort pill bar: PPG, RPG, APG, SPG, BPG, 3PM, 2PM
  - Each player: card with jersey-number circle (36px, team color) + player name (normal case) + team abbreviation on right, plus a 4-stat grid (PPG, RPG, APG, **SPG**)
  - Tap card → slides down full-stat block (GP, 2PM, 3PM, FTM, OREB, DREB, BPG, TO, PF) in 4-col grid
  - Leading stat (current sort column) highlighted `#3B82F6`
- **Desktop:** dark table with all original columns intact (GP, PPG, 2PM, 3PM, FTM, OREB, DREB, RPG, APG, STL, BLK, TO, PF) + sortable headers

### Tab 3 — League Leaders
- **Narrow:**
  - Full-width stacked category cards (one per category) — no 3-col grid, no clipping
  - Category pills at top: PPG, 3PM, RPG, APG, SPG, BPG — tapping scrolls to that category via `scrollIntoView({ behavior: "smooth" })`
  - Inside each card: rank number (gold `#F59E0B` for #1, white for 2–3, grey for 4–5) + jersey circle + player name + stat value in accent `#3B82F6`
  - Row dividers `border-b #2A2A42` (except last)
- **Desktop:** same cards in a `grid-cols-2 lg:grid-cols-3 gap-4` layout, dark theme applied

---

## Deviations from spec (acknowledged in Step 1)
- **4th mobile stat is SPG, not FG%** — `player_stats` schema has no attempts columns (`field_goals_attempted` etc.), so FG% is not computable. Confirmed with user: use SPG.

## Deliberate choices
- The desktop tab bar style matches the mobile tab bar (pill-container) — no separate rendering; the single `inline-flex p-1 rounded-full` component works on both.
- Leader mobile category pills act as **smooth-scroll anchors** (not filters) — all categories remain stacked per spec ("Show ALL categories stacked vertically by default").
- Player name on mobile is normal-case (`font-semibold`, no `uppercase` class) — matches spec.
- Team name on mobile: normal-case; desktop table keeps `text-xs font-semibold` (no uppercase override, since the spec said "do not change the desktop table" for Standings — I applied the same principle here).

---

## Test instructions

### Tab switching
- [ ] Three tabs visible in pill container: Team Stats / Player Stats / League Leaders
- [ ] Active tab: `#3B82F6` bg, white text
- [ ] Inactive: grey `#A0A0B8` text
- [ ] Switching tabs preserves league + team filter selection

### Filter pills
- [ ] League pills render below tabs, one per active league
- [ ] Changing league resets team selection to "All Teams"
- [ ] Team pills render below league pills — "All Teams" + per-team
- [ ] Both pill rows scroll horizontally if overflowing

### Team Stats tab
- **Mobile / phone-preview (use the device preview FAB or real mobile viewport):**
  - [ ] Cards render (NOT the desktop table)
  - [ ] Sort pills above cards change card order
  - [ ] Highlighted stat (blue) matches current sort pill
  - [ ] Tap card → slide-down reveals OREB/DREB/BPG/TO
  - [ ] Chevron rotates 180° on expand
  - [ ] No right-side clipping
- **Desktop:**
  - [ ] Dark table with all 10 columns visible
  - [ ] Click column header to sort; active header text is `#3B82F6` with chevron icon
  - [ ] Row hover turns `#2A2A42`

### Player Stats tab
- **Mobile / phone-preview:**
  - [ ] Cards show actual stat values (was empty before — now shows PPG / RPG / APG / SPG)
  - [ ] Sort pills re-order correctly
  - [ ] Search input is rounded-full, dark, magnifying-glass icon inside
  - [ ] Typing filters players (debounced 300ms)
  - [ ] Tap card → expanded shows GP, 2PM, 3PM, FTM, OREB, DREB, BPG, TO, PF
  - [ ] Player names NOT uppercase
- **Desktop:**
  - [ ] Dark table with all 15 columns
  - [ ] Search input in filter row next to team pills
  - [ ] All sort headers work

### League Leaders tab
- **Mobile / phone-preview:**
  - [ ] Six category cards stacked vertically, full-width, NOT in a 3-col grid
  - [ ] All 5 rows per category visible, nothing cut off on the right
  - [ ] Rank 1 gold (`#F59E0B`), 2–3 white, 4–5 grey
  - [ ] Stat value (right side) in accent blue
  - [ ] Tapping a category pill smooth-scrolls to that card
- **Desktop:**
  - [ ] 3-col grid (lg) / 2-col (md) layout with dark cards
  - [ ] Same internal layout as mobile cards

### Data integrity
- [ ] All per-game averages compute correctly (group by game_id → sum → divide by gp)
- [ ] Changing league re-fetches teams, players, games, player_stats in sequence
- [ ] Changing team filter narrows team/player lists client-side
