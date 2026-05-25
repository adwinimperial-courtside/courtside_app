# Standings Redesign — Build Result

## Build command
```
cd /Users/macm5pro/Projects/courtside && npm run build
```

## Output
```
vite v6.3.6 building for production...
✓ 2597 modules transformed.
dist/assets/index-BLy8rJ_J.css    113.00 kB │ gzip:  17.87 kB
dist/assets/index-BMhr1MGk.js   1,301.97 kB │ gzip: 359.17 kB
✓ built in 1.85s
```
Zero errors. ✅

---

## Test instructions

### Start dev server
```
cd /Users/macm5pro/Projects/courtside
npm run dev
```

### Desktop tests (md+ viewport)

| Check | Expected |
|---|---|
| Page background | Near-black #0F0F1A |
| League filter bar | Dark card (#1A1A2E) with Filter icon + Select dropdown |
| Table header row | Dark elevated (#2A2A42), text #A0A0B8, uppercase small |
| Table rows | Dark (#1A1A2E) with #2A2A42 bottom borders |
| Row hover | Lightens to #2A2A42 (via onMouseEnter/Leave) |
| Rank #1 | Gold text (#F59E0B) |
| Rank #2+ | Secondary grey text (#6B6B80) |
| Team name | White (#F0F0F5), uppercase |
| W column | Green (#22C55E) |
| L column | Red (#EF4444) |
| Win% | Primary white text |
| Streak W-type | Green; L-type red |
| +/- positive | Green; negative red; zero grey |
| Trend arrows | Green up, red down, grey dash |

### Mobile tests (Chrome DevTools → iPhone 14, 390×844)

| Check | Expected |
|---|---|
| Page background | #0F0F1A |
| League pill bar | Sticky below Layout mobile header; active pill blue (#3B82F6), inactive dark grey |
| League pill bar scroll | Horizontal scroll if pills overflow; no visible scrollbar |
| Team cards | Rounded dark cards (#1A1A2E), stacked with gap-2 |
| Card — rank | Large bold number; #1 gold, others grey |
| Card — team logo | Colored circle with first letter |
| Card — team name | White uppercase |
| Card — trend arrow | Same green/red/grey behavior |
| Card — W-L | Large, green-dash-red |
| Card — Win% | Small grey below W-L |
| Card — chevron | Rotates 180° on expand |
| Tap card | Expands detail row with smooth max-height transition |
| Expanded — Streak | Green (W streak) or red (L streak) |
| Expanded — +/- | Correct color sign prefix |
| Expanded — Last 5 | Colored W/L dots (green/red), most recent first |
| Tap again | Collapses card (only one open at a time) |

### Data integrity checks
- All standings data still loads from Supabase (same useQuery hooks)
- Tiebreaker logic unchanged (h2h for 2-team ties, points diff for 3+)
- Streak still reflects consecutive same-result from most recent game
- Trend still compares current rank vs rank without last game

### What was NOT changed
- All helper functions: `getGameResult`, `getTeamStreak`, `getMiniStats`, `sortTiedGroup`, `computeStandings`
- All three `useQuery` hooks and their keys/queries
- The `useEffect` that defaults to first league
- The `standings` useMemo logic (only added `last5` field using new `getLast5Results` helper)
