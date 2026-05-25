# Theme Toggle — Final Build

## Build output
```
vite v6.3.6 building for production...
✓ 2598 modules transformed.
dist/index.html                     1.02 kB │ gzip:   0.58 kB
dist/assets/index-DfylBmhm.css    112.93 kB │ gzip:  18.11 kB
dist/assets/index-B8PATbit.js   1,348.11 kB │ gzip: 366.31 kB
✓ built in 1.71s
```
Zero errors. ✅

## Sanity checks
- Dark-Court hex values remaining (outside live / ui dirs): **0**
- `index.html` includes `courtside-theme` (no-flash script): ✓
- `ThemeToggle.jsx` exists
- Both `SidebarMenuContent.jsx` and `MobileMoreDrawer.jsx` import ThemeToggle

---

## Files touched across the 7 steps

| Step | File | Change |
|---|---|---|
| 2 | `src/styles/theme.css` | Added `--ct-*` semantic vars (Dark Court on `:root`, Warm Sand on `html[data-theme="light"]`), `--ct-*-rgb` triplets for opacity variants, `--color-*` legacy aliases, `.live-game-isolate` overrides, theme-aware scrollbar + selection |
| 3 | 70 JSX files + `src/index.css` | **Automated sed sweep:** all hardcoded hex values replaced with `var(--ct-*)` or `rgb(var(--ct-*-rgb)/alpha)` references (1,191 individual hits). `body` now uses `var(--ct-bg-page)` / `var(--ct-text-primary)` directly |
| 3 manual | 4 accent gradients (Statistics / Schedule / Standings / AwardLeaders) | Flattened `linear-gradient(..., #HEX, #HEX-darker)` to solid `var(--ct-accent)` / `--ct-success` / `--ct-accent-gold` so they adapt to theme |
| 3 manual | `src/pages/LeagueUsers.jsx` avatar fallback, `src/pages/GameLog.jsx` timeline dot border | Final hex stragglers → `var(--ct-*)` |
| 4 | `src/components/layout/ThemeToggle.jsx` | **New** — 40×40 circular button, Sun/Moon icon, flips `data-theme` + writes `localStorage["courtside-theme"]` |
| 5 | `index.html` | Inline no-flash `<script>` at top of `<head>` — reads localStorage and applies `data-theme="light"` before stylesheets load |
| 5 | `src/components/layout/SidebarMenuContent.jsx` | Theme row at bottom of sidebar (`mt-auto`, top border) |
| 5 | `src/components/layout/MobileMoreDrawer.jsx` | Theme row as a pill at bottom of mobile drawer |
| 6 | `src/index.css` | `html[data-theme="light"]` block with Warm Sand HSL conversions for every shadcn token (background, foreground, card, primary, secondary, muted, accent, destructive, border, ring, sidebar-*) |

**Not touched (per spec):**
- `src/components/ui/*` (shadcn primitives — they consume the themed vars)
- `src/components/live/*` — LiveStatTracker, LatestActivity, ClockDisplay, StatButtons, PlayerSelector, StartingLineup, EmergencyLineupRepair, EndOfPeriodModal, ScoreHeader
- `src/pages/LiveGame.jsx`, `src/pages/LiveBoxScore.jsx`

---

## Test checklist

### Default state (fresh)
1. Clear localStorage → reload
2. ✅ **Dark Court loads** — `<html>` has no `data-theme` attribute
3. Sidebar shows "THEME" row with **Sun icon** (tap → light)

### Toggle to Warm Sand
4. Click ThemeToggle in sidebar (desktop) or More drawer (mobile)
5. ✅ `<html data-theme="light">` attribute added; `localStorage.courtside-theme = "light"`
6. ✅ Icon swaps to **Moon** (tap → dark)
7. ✅ Entire app switches:
   - Page background warm off-white (`#F4F3EE`)
   - Cards white (`#FFFFFF`)
   - Text dark brown (`#1A1410`)
   - Accent terracotta (`#C15F3C`)
   - Muted warm grey
   - Destructive red shifts to `#DC2626`
8. Walk pages: Standings / Statistics / Schedule / Award Leaders / League Users / Admin Tools — every page reads well
9. **shadcn components check**: open a Dialog, a Select, a Dropdown, a Popover, a Badge — all switch to light. Primary button is terracotta.

### Persistence
10. Toggle to light → reload → ✅ **stays light with no flash of dark** (inline script runs before CSS)
11. Navigate between pages → theme persists
12. Toggle to dark → reload → stays dark

### LiveStatTracker isolation
13. Navigate to `/LiveGame?gameId=...` or `/LiveBoxScore?gameId=...`
14. ✅ Live screen looks identical **regardless of theme** (white/slate neutral)
15. Toggle theme from the sidebar while on a live page — live content should stay visually unchanged; the `.live-game-isolate` class resets all vars (shadcn + `--ct-*`) to neutral-light inside its wrapper

### Mobile
16. In phone viewport, open "More" drawer → Theme pill at the bottom with the toggle
17. Tap → app switches theme; drawer itself updates to the new palette
18. Bottom tab bar updates colours automatically (uses `--ct-*` vars)

### Final verification
19. `grep -rn '#0F0F1A\|#1A1A2E\|#2A2A42\|#F0F0F5\|#A0A0B8\|#6B6B80\|#3B82F6\|#F59E0B\|#22C55E\|#EF4444' src/pages src/components --include='*.jsx' | grep -v live | grep -v ui/` → **zero results** (verified above)
20. No white-on-white or dark-on-dark text visible in either theme
21. Role badges readable in both themes (use the `--ct-*-rgb` opacity trick)

---

## Known ergonomics / follow-ups (none blocking)

- The `--color-*` legacy vars point to the new `--ct-*` vars. They can stay as-is indefinitely — or a future cleanup pass could remove them and update the ~30 inline-style refs that still use them (Layout.jsx, SidebarMenuContent.jsx, Statistics.jsx, a few others). Not urgent.
- Scrollbar thumb hover uses `--ct-accent` — in light mode that turns it terracotta. If you want it to stay neutral, change the line in `theme.css` to `var(--ct-text-muted)`.
- Rare fixed-colour uses that intentionally stay fixed:
  - `rgba(15, 15, 26, 0.6)` — MobileMoreDrawer overlay (always dark overlay regardless of theme; arguably fine since it's a backdrop)
  - `rgba(239, 68, 68, 0.1)` / `rgba(34, 197, 94, 0.1)` — `StatusMessage` in ApplicationReview (could switch to `rgb(var(--ct-danger-rgb)/0.1)` if you want them theme-aware)

If you want any of these switched to theme vars, flag it and I'll patch.
