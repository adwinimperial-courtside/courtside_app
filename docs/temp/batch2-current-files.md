# Batch 2 — Current File Inventory

## Files that will be touched

| Path | Lines | Role |
|---|---:|---|
| `src/pages/Schedule.jsx` | 313 | Page shell, filters, mapping over games |
| `src/components/schedule/GameCard.jsx` | 495 | Heavy per-game card (badges, score, actions, expand box score) |
| `src/pages/AwardLeaders.jsx` | 136 | Thin wrapper: league picker + passes data to component |
| `src/components/stats/AwardLeaders.jsx` | 762 | MVP/DPOY/POG tabs + tables + breakdowns + HowCalculated |
| `src/pages/Home.jsx` | 123 | **Routing-only** — redirects user; only visible UI is a spinner |

## Files imported by the above but NOT touched in this batch

| Path | Reason |
|---|---|
| `src/components/schedule/CreateGameDialog.jsx` | Modal; not in scope for this visual pass |
| `src/components/schedule/DefaultWinnerDialog.jsx` | Modal used by GameCard only |
| `src/components/schedule/EditGameSettingsDialog.jsx` | Modal used by GameCard only |
| `src/components/schedule/POGSpotlightModal.jsx` | Not imported by Schedule or GameCard at top-level |
| `@/components/ui/*` (shadcn) | Already themed via dark shadcn vars from prior theme pass |

---

## Schedule.jsx — key data + structure

**Imports:** `Button`, `Select`, `Plus/Calendar/Filter` icons, `useTranslation`, `useNavigate`, `CreateGameDialog`, `GameCard`.

**Data (all preserved):**
- `session` → `supabase.auth.getSession()`
- `memberships` → `user_league_memberships` joined with `leagues` (user's accessible leagues only)
- `profile` → `profiles.default_league_id`
- `teams` → `teams.league_id = selectedLeague`
- `games` → `games.league_id = selectedLeague` (ordered by `scheduled_at DESC`)
- `createGameMutation` → inserts into `games`

**State:** `showCreateDialog`, `selectedLeague`, `selectedTeam`, `statusFilter` (`all|scheduled|live|final|default`).

**Renders:** header + 3 Select filters + grid of GameCard components.

---

## GameCard.jsx — key structure

**Data (preserved):**
- `playerStats` fetch on expand (final games only)
- POG backfill effect (writes to `games.player_of_game`)
- POG player name fetch
- `mergeStatsByPlayer` helper aggregates multiple rows per player

**Renders:**
- Badges row (Pill component) — league, stage, status, manual/edited/default/excluded
- Teams + scores row (home circle, name, score, center divider, away circle, name, score)
- Meta row — scheduled_at date + time + venue
- POG + action buttons row (Start, Default winner, Edit settings, Continue Live, View Stats)
- Expanded box score — two teams in a table, with TEAM TOTALS row

**Light colors to swap:** `bg-white`, `border-slate-200`, `shadow-sm`, `hover:shadow-md`, slate text variants, Pill colors (gray-100/amber-100/green-100/orange-100/blue-100/yellow-100/red-100), emerald/blue/orange button gradients.

---

## AwardLeaders.jsx (page) — structure

- 1 Select for league
- Passes `leagues, teams, players, games, stats, awardSettings` down to `AwardLeadersComponent`

## AwardLeaders component (stats/) — structure

**Scoring helpers (preserved):** `calcGis`, `calcDefGis`, `accumulateMvp`, `accumulateDpoy`, `computeMvpScore`, `computeDpoyScore`, `resolveSettings`.

**Sub-components:** `AwardBadge` (MVP gold/Mythical 1-4 purple/DPOY blue/POG green), `TrendIcon` (up/down/neutral), `MvpBreakdown`, `DpoyBreakdown`, `BreakdownTable`, `HowCalculated` collapsible.

**Tabs:** shadcn `Tabs` with `mvp` / `dpoy` / `pog`. Each tab currently renders a large table with expandable detail rows (React.Fragment + AnimatePresence motion.div).

**Mobile redesign per spec:**
- Tab labels become `MVP` / `DPOY` / `POG` on narrow
- MVP/DPOY rank 1 → big hero card (gold border)
- Ranks 2–10 → compact rows (tap to expand breakdown in `#0F0F1A` sub-panel)
- Ineligible rows → `text-[#6B6B80]` with "Needs X more games"
- POG tab → stacked game-log cards

Desktop keeps tables but dark-themed.

---

## Home.jsx — structure

**Pure routing page.** Uses:
- `useAuth()` → `isAuthenticated`, `isLoadingAuth`, `currentUser`
- Effect: resolves pending invite tokens, then navigates to `/Landing`, `/LeagueSelection`, `/PendingApproval`, or `/RoleSelection` based on state.
- UI: only a loading spinner (`border-slate-200 border-t-slate-800`) while routing.

**No dashboard content — just spinner theming is needed.**

---

## Open questions before Step 2

Nothing blocking — all data + computation logic is clear and will be preserved. Ready to proceed once you confirm.

## Scope warning

This batch includes two large files that will change substantially:
- `GameCard.jsx` (495 lines) — full dark-theme + mobile-first layout per Schedule spec
- `stats/AwardLeaders.jsx` (762 lines) — tab labels, hero card for rank 1, compact rows 2–10 with tap-to-expand, POG list cards

Both are heavy rewrites, even though the data logic stays. Ready to proceed — awaiting your confirmation.
