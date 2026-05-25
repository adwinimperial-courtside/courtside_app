# Schedule Card — Current State

## Files

| File | Lines | Role |
|---|---:|---|
| `src/pages/Schedule.jsx` | 505 | Page shell, filters, dropdown pills, date pills, game list grouping |
| `src/components/schedule/GameCard.jsx` | 553 | Per-game card (both mobile & desktop — no viewport branching) |

## Data flow (must preserve)

### Schedule.jsx
- `useQuery` × 4: session, memberships (user_league_memberships + leagues), profile (default_league_id), teams, games
- `useMutation`: createGameMutation (games insert)
- `useIsNarrowLayout()` already in use
- Filter state: `selectedLeague`, `selectedTeam`, `statusFilter`
- `gamesByDate` — Map grouped by `format(startOfDay(scheduled_at), 'yyyy-MM-dd')`, sorted **descending** (newest first)
- `uniqueDateKeys` derived from gamesByDate, "tbd" excluded
- Auto-scroll to today (or nearest past date) via `scrollToDate`

### GameCard.jsx
**Props:** `game`, `teams`, `leagueName`, `canManage`, `onStartGame`, `onGameUpdated`
- `useEffect` × 2: fetch POG player, backfill `player_of_game` if missing
- `useQuery`: player_stats for expanded box score
- `mergeStatsByPlayer` aggregator helper
- `totalPoints` helper (shared)
- Derived state: `homeTeam`, `awayTeam`, `pogPlayer`, `pogName`, `defaultWinnerTeam`, `homeWon`, `awayWon`, `showScore`, `isLive`

## Current mobile card layout (what users see & complain about)

Single row with two teams side-by-side:
```
[away color circle] [AWAY NAME] [away score] — [home score] [HOME NAME] [home circle]
```
- Each team gets `flex-1` ~50% of width
- `truncate` on team names → long names cut off (`Helsinki Seagulls` → `Helsinki Seagul`)
- Score + divider eats center space
- Date/venue on their own row below with calendar + map pin icons

## Date pill order (also complained about)

- `gamesByDate` sorts **descending** (`b[0].localeCompare(a[0])`) → game list shows newest at the top
- `uniqueDateKeys` derived in that same descending order → date pills render newest → oldest left to right

Spec wants chronological ordering (oldest → newest) OR reverse — but **consistent with the game list order**. Current order: newest first in list, newest first in pills — that IS consistent but the spec says it feels confusing. Will flip to oldest → newest in both after confirmation if desired, or keep consistent-reverse.

## Refactor plan for Step 2

**Mobile branch** (`isNarrow` is already threaded from Schedule.jsx — can pass it to GameCard as a prop OR import the hook directly in GameCard).

**Decision:** Import `useIsNarrowLayout` in GameCard directly — keeps Schedule.jsx unaware of this implementation detail and lets each call site render correctly regardless of how it's invoked.

**Mobile rendering:**
- Status + league + date line (compact meta)
- Away team row: 32px color circle + full name (no truncate, `break-words` / wrap allowed) + score
- Home team row: same shape
- Winner rows in `--ct-text-primary`, loser rows in `--ct-text-muted`
- Compact date/time/venue line with `·` separators (no icons)
- POG line (if exists) — small trophy + POG name
- Full-width action button (View Stats / Continue+Live Box Score / Start Game)
- Expanded box score stays the same behaviour

**Desktop rendering:** unchanged — keep the existing current layout.

**Date pills:** will auto-scroll to today on load (already happens) and use `var(--ct-accent)` ring for today-not-selected. Chronological order TBD — I'll leave matching the game list direction (newest first) unless you want me to reverse.

Ready for Step 2 confirmation.
