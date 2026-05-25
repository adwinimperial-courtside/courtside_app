# Schedule Card Fix — Build

## Output
```
✓ 2598 modules transformed.
dist/assets/index-vpeNtln5.css    113.03 kB │ gzip:  18.09 kB
dist/assets/index-DL1bG4uF.js   1,355.86 kB │ gzip: 367.35 kB
✓ built in 1.93s
```
Zero errors. ✅

---

## What changed

### `src/components/schedule/GameCard.jsx`
- Imported `useIsNarrowLayout`
- Added a **mobile-only branch** (early return) that renders the new ESPN-ticker-style layout:

**Line 1** — status indicator + secondary badges + league name (right-aligned, truncated)
  - `LIVE` (red pulsing dot + red text) / `FINAL` (muted caps) / `HH:mm` scheduled time / `Upcoming` / `Cancelled` / `Postponed`
  - Badges: stage (Quarterfinal etc.), Default, Manual, Edited

**Lines 2–3** — **stacked team rows** via a local `TeamRow` helper:
  - 32px team color circle with initial
  - Full team name on left with `wordBreak: break-word` — **never truncates**, wraps to next line if needed
  - Score on right: `text-2xl font-bold` `tabular-nums`
  - Winner name+score in `var(--ct-text-primary)` and `fontWeight: 700`
  - Loser in `var(--ct-text-muted)`
  - Live scores in `var(--ct-success)` regardless of which team is ahead
  - Upcoming shows `vs` in muted text instead of score

**Line 4** — compact meta `26 Apr 2026 · 19:00 · Helsinki Ice Hall` (one line, `·` separators, no icons)

**Line 5** — POG (final games with POG) — trophy icon + "POG:" + player name in accent gold

**Line 6** — action buttons (full-width, `h-40`, `rounded-lg`):
  - **Final:** "View Stats" (bg-elevated, secondary text) — toggles expanded box score
  - **Live:** "Live Box Score" (outlined accent) + "Continue" (bg-danger) — side-by-side, `flex-1` each
  - **Scheduled + canManage:** "Start Game" (bg-success) + two square `44px` icon buttons (default winner, edit settings)

**Expanded box score** (final games only, when "View Stats" tapped): reuses the same `renderBoxScore` function as desktop — all 13 stat columns, horizontally scrollable table.

**Dialogs** — `EditGameSettingsDialog` and `DefaultWinnerDialog` mounted in both mobile and desktop branches.

Desktop branch: **unchanged** (everything below the mobile `if (isNarrow)` block is the original JSX).

### `src/pages/Schedule.jsx`
`DatePill` refined:
- **Selected** — `var(--ct-accent)` bg, white text, white dot below (always shows dot on selected now)
- **Today but not selected** — default bg + **1.5px accent ring** to signal "today"
- **Neither** — default bg, transparent ring (reserves layout width so all pills stay same size)
- Date pill order unchanged per your choice (A — newest-first in both list and pills)

---

## What was preserved

- All 4 `useQuery` hooks + `useMutation` in Schedule.jsx
- `useQuery` for player_stats (box score) + 2 `useEffect` hooks (POG fetch, POG backfill) in GameCard.jsx
- `mergeStatsByPlayer`, `totalPoints`, `findPlayerOfGame` helpers
- `renderBoxScore` inline helper (shared between mobile-expanded and desktop-expanded)
- `gamesByDate` grouping, `scrollToDate` behaviour, auto-scroll-to-today effect
- All existing filters, date keys, DropdownPill, mutations

---

## Test checklist

### Mobile (Chrome DevTools, iPhone 14, 390px — or admin "phone" device preview)

**Final game:**
- [ ] `FINAL` muted badge + league name on top line
- [ ] Away and home each have their own row with circle + FULL name (no truncation) + score
- [ ] Winner: name + score both in primary text
- [ ] Loser: name + score both in muted text
- [ ] Date/time/venue line below with `·` separators, no icons
- [ ] POG line if POG exists: trophy + "POG: Player Name"
- [ ] "View Stats" button full-width
- [ ] Tapping it expands box score — tables scroll horizontally

**Live game:**
- [ ] Pulsing red dot + `LIVE` text on top line
- [ ] Scores in green (both teams)
- [ ] "Live Box Score" + "Continue" buttons side-by-side
- [ ] Continue button is red (urgency)

**Scheduled game:**
- [ ] Scheduled `HH:mm` time on top line
- [ ] No scores, `vs` shown on each team row
- [ ] If `canManage`: "Start Game" (green) + two square icon buttons
- [ ] If not `canManage`: no action buttons

**Team name wrapping:**
- [ ] Very long team names wrap to a second line inside the row without being cut off
- [ ] Row stays readable — circle left, score right, name in the middle

### Date pills
- [ ] Today (when present): accent ring around the pill
- [ ] Selected: accent bg + white + white dot below
- [ ] Tapping a pill smooth-scrolls to that section
- [ ] Order: newest on the left (matches game list order)

### Desktop
- [ ] Game card looks unchanged — same two-teams-on-one-row layout
- [ ] All existing buttons (Start / Default / Settings / Continue / Live Box Score / View Stats) still render and work
- [ ] Expanded box score shows 13 columns

### Data integrity
- [ ] All queries still fire (session, memberships, profile, teams, games, player_stats on expand)
- [ ] POG backfill effect still writes to DB for old completed games
- [ ] `createGameMutation`, `EditGameSettingsDialog`, `DefaultWinnerDialog` still work
- [ ] League / team / status filter dropdowns still filter
