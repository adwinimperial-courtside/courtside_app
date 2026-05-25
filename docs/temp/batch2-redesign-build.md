# Batch 2 Redesign — Build Result

## Output
```
vite v6.3.6 building for production...
✓ 2596 modules transformed.
dist/assets/index-B7RlTWbI.css    110.22 kB │ gzip:  17.59 kB
dist/assets/index-DEEue4Ol.js   1,316.20 kB │ gzip: 362.17 kB
✓ built in 1.86s
```
Zero errors. ✅

---

## Files changed

| File | Summary |
|---|---|
| `src/pages/Schedule.jsx` | Dark theme + sticky filter row (league + team + status dropdown pills) + horizontal date pills that auto-scroll to today + games grouped by date with sticky date headers |
| `src/components/schedule/GameCard.jsx` | Dark card, status indicator row (time / FINAL / pulsing LIVE / postponed), away-score-home score layout with winner bolded + loser muted, dark badges, dark box score table, dark action buttons |
| `src/pages/AwardLeaders.jsx` | Dark page shell, single dropdown-pill league filter replacing the big card |
| `src/components/stats/AwardLeaders.jsx` | Dark tab pills (MVP/DPOY/POG, short labels on narrow); mobile hero card for rank 1 with gold (MVP) or blue (DPOY) border; compact rank rows 2–10 with tap-to-expand breakdown in `#0F0F1A` sub-panel; ineligible rows greyed; POG stacked game-log cards on mobile; dark tables on desktop |
| `src/pages/Home.jsx` | Spinner colors now `#2A2A42` / `#3B82F6`; wrapper background uses `--color-bg-page` |

**Preserved exactly:** all `useQuery` hooks, POG backfill effect, stats merge, `calcGis`/`calcDefGis`/accumulate/compute scoring math, eligibility thresholds, trend math, routing logic in Home.

---

## Test checklist

### Schedule
- [ ] Dark page background, calendar icon in green gradient, white title
- [ ] Filter row: League pill (blue), Team dropdown pill (grey), Status dropdown pill (grey)
- [ ] Date pills below filter row — `EEE d` format (e.g. `Mon 14`), today highlighted blue, selected date gets small dot
- [ ] Auto-scrolls to today (or nearest past date) on first load
- [ ] Tapping a date pill smooth-scrolls to that section
- [ ] Games grouped by date with `EEEE, MMMM d` sticky date headers
- [ ] GameCard — live games show a pulsing red dot + "LIVE" text
- [ ] GameCard — final games have winner in `#F0F0F5` bold, loser in `#6B6B80`
- [ ] GameCard — upcoming games show "vs" instead of score
- [ ] GameCard — expand box score button reveals dark-themed box-score table
- [ ] CreateGameDialog still opens from "Schedule Game" / "+ Game" button (admin only)

### Award Leaders
- [ ] Dark page, trophy in gold gradient, league dropdown pill
- [ ] Tab bar: `MVP` / `DPOY` / `POG` short labels on mobile; `MVP Race` / `DPOY Race` / `Player of the Game` on desktop
- [ ] MVP mobile: hero card with gold border, rank 2–10 compact rows with chevron
- [ ] DPOY mobile: hero card with blue border, same compact row pattern
- [ ] Tap row 2–10 → slide-down breakdown table in `#0F0F1A` sub-panel
- [ ] Ineligible players greyed out, show `Needs X more games`
- [ ] POG mobile: stacked cards with date / matchup / score / winner / POG player
- [ ] Desktop tables: dark header row `#2A2A42`, rows hover to `#2A2A42`, award badges (MVP gold, Mythical 1–4 purple shades, DPOY blue, POG green) preserved
- [ ] "How is this calculated?" still expands with dark-themed content

### Home
- [ ] Spinner on dark page background
- [ ] Redirects still work: authenticated + memberships → `/LeagueSelection`; pending app → `/PendingApproval`; no memberships/apps → `/RoleSelection`; not authenticated → `/Landing`

---

## Mobile/desktop switch

All three pages now use `useIsNarrowLayout()` from `src/lib/DevicePreviewContext.jsx`, so admin device preview (phone/tablet) switches to mobile layout correctly inside the preview frame.
