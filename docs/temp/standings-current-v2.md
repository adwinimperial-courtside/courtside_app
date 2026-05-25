# Standings Page — Current State (v2)

Full file: [src/pages/Standings.jsx](../../src/pages/Standings.jsx) (589 lines).

## Structure

**Helpers** (lines 9–121, unchanged):
- `getGameResult`, `getTeamStreak`, `getMiniStats`, `sortTiedGroup`, `computeStandings`, `getLast5Results`

**`TeamCard` component** (lines 125–248): mobile card — already defined, renders rank / logo / name / trend / W-L / Win% / chevron + expandable streak, +/-, last5 dots.

**`Standings` component** (lines 252–588):
- Data fetching: `useQuery` for `leagues`, `teams`, `games` (unchanged)
- Sets `expandedTeamId` state for mobile card expand
- **Mobile render** (line 450): `<div className="md:hidden space-y-2">` with `<TeamCard>` for each team
- **Desktop render** (line 462): `<div className="hidden md:block ...">` with `<table>`

## Observed issue

The user reports: "mobile layout is STILL a table … columns get cut off on the right side (Streak and +/- are invisible)."

**Likely root cause:** the `md:hidden` / `hidden md:block` Tailwind breakpoint utilities respond to the **browser viewport width**, not the container width. When the `DevicePreviewToggle` (admin-only) wraps the page in a 375px-wide frame, the outer viewport is still ≥768px, so the desktop `<table>` still renders inside the narrow frame — and the Streak / +/- columns get clipped.

On actual mobile devices (real viewport < 768px), the `md:hidden` card branch should render. The user may be testing either:
1. Via the device preview toggle (likely — this produces the described symptom), or
2. On a non-mobile breakpoint (e.g. 700–767px) where the table is still the target.

Awaiting user confirmation + the full card-structure spec (message was truncated at "The card structure must be EXACTLY like this:").
