# COALESCE migration targets — 2026-05-27

**Goal:** Every aggregation site that computes a player's total points reads
`total_points` when set, falls back to `points_2*2 + points_3*3 + free_throws`.
This makes Season 5 non-digital rows (where `points_2 = 0` and `total_points`
holds the authoritative total) render correctly everywhere.

---

## Files needing change (13)

| # | File | Issue |
|---|------|-------|
| 1 | `src/lib/playerStats.js` | `totalPoints` checks `stat.points` but not `stat.total_points`; add `total_points` as first-priority check and export `getPlayerTotalPoints` |
| 2 | `src/pages/OverlayControl.jsx` | Local `computePts()` uses bare `points_2 * 2` arithmetic; replace with `totalPoints` |
| 3 | `src/components/player/PlayerQuickStats.jsx` | Inline `(s.points_2 || 0) * 2 + ...` inside `forEach`; replace with `totalPoints` |
| 4 | `src/components/player/PlayerRecognition.jsx` | Three inline instances (lines 19, 92, 98); replace with `totalPoints` |
| 5 | `src/components/stats/TeamStats.jsx` | Inline `(stat.points_2 || 0) * 2` in `.reduce`; replace with `totalPoints` |
| 6 | `src/components/stats/mobile/MobileTeamStats.jsx` | Same as TeamStats |
| 7 | `src/components/stats/GameStats.jsx` | Lines 35, 242, 329 — inline `points_2 * 2` for POG + per-row total; replace with `totalPoints`. Lines 275, 362 (PER-STAT-DISPLAY column sums of `points_2`) — **leave unchanged** |
| 8 | `src/components/stats/mobile/MobileGameStats.jsx` | Lines 24, 67 — inline formula for POG display + per-row total; replace with `totalPoints` |
| 9 | `src/components/stats/LeagueLeaders.jsx` | Local `calcPoints(stat)` that gates on `isDigital` and reads `points_2` directly; after fix `points_2 = 0` for non-digital rows so this returns wrong low value. Replace with `totalPoints` |
| 10 | `src/components/stats/PlayerStats.jsx` | Same local `calcPoints` pattern as LeagueLeaders |
| 11 | `src/components/stats/mobile/MobileLeagueLeaders.jsx` | Same local `calcPoints` pattern |
| 12 | `src/components/stats/mobile/MobilePlayerStats.jsx` | Same local `calcPoints` pattern |
| 13 | `src/components/live/PlayerSelector.jsx` | Inline `totalPoints = (points_2*2) + (points_3*3)` (local variable name collision); replace with imported helper |

---

## Files already using `totalPoints` helper — no call-site change needed

These 14 files import `totalPoints` from `src/lib/playerStats.js`. They benefit
automatically once the helper is updated in item 1 above.

`src/pages/Statistics.jsx` · `src/pages/AdminTools.jsx` · `src/pages/CoachInsights.jsx`
· `src/pages/LiveBoxScore.jsx`¹ · `src/components/utils/pogCalculator.jsx`
· `src/components/stats/AwardLeaders.jsx`² · `src/components/player/badgeCalculator.jsx`
· `src/components/player/milestoneCalculator.jsx` · `src/components/player/PlayerTrendCard.jsx`
· `src/components/player/PlayerDashboardCard.jsx` · `src/components/player/PlayerLastGame.jsx`
· `src/components/live/LiveStatTracker.jsx` · `src/components/live/ScoreHeader.jsx`
· `src/components/live/BenchDrawer.jsx` · `src/components/schedule/ScheduleGameCard.jsx`
· `src/components/schedule/GameCard.jsx`

¹ LiveBoxScore lines 131/371/372 use `s.points` but `s` is a merged-stat object
whose `points` field was computed by `calcPts` (= `totalPoints`) in `mergeStatsByPlayer`.
No direct change needed.

² AwardLeaders `statMap` merge at line 435 accumulates `s.points` directly. For
Season 5 data `s.points` is correctly set by the importer so this is already correct.
`calcGis` uses `totalPoints(stat)` — benefits from helper update automatically.

---

## Files intentionally excluded

| File | Reason |
|------|--------|
| `src/pages/FixManualStats.jsx` | Migration utility, not a display component. Its branching logic (`isEditedDigital`) is intentionally correct for its specific use case. |
| `src/components/stats/GameStats.jsx` lines 275, 362 | PER-STAT-DISPLAY: column totals for the `points_2` column itself (shows basket-count column footer). After import fix `points_2 = 0` for non-digital rows — showing 0 in the "2PM" column footer is correct. |

---

## SQL: no changes needed

No SQL views or RPCs use the `points_2 * 2` formula. The `20260527000001`
migration comment mentions the formula in descriptive text only. The Edge
Function (`supabase/functions/import-base44-league/index.ts`) already uses
`COALESCE(total_points, points_2*2 + points_3*3 + free_throws)` — correct,
out of scope.

---

## Detail per file

### 1. `src/lib/playerStats.js` — update + extend helper

```js
// Line 14–18 current:
export function totalPoints(stat) {
  if (!stat) return 0;
  if (stat.points != null && stat.points > 0) return stat.points;
  return (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
}
```

Add `total_points` as the new first check; preserve the `stat.points` fallback
for AdminTools manual-entry rows (where `points` is the authoritative total and
`total_points` is NULL).

---

### 2. `src/pages/OverlayControl.jsx` — local `computePts`

```js
// Lines 111–116
// Compute total pts from player_stats row (points_2 * 2 + points_3 * 3 + free_throws).
// Falls back to legacy `points` field if all new fields are zero.
function computePts(stat) {
  const derived = (stat.points_2 || 0) * 2 + (stat.points_3 || 0) * 3 + (stat.free_throws || 0);
  return derived > 0 ? derived : (stat.points || 0);
}
```

Classification: **AGGREGATION**. Replace body with `totalPoints(stat)` from
`@/lib/playerStats`. The file does not currently import `totalPoints`.

---

### 3. `src/components/player/PlayerQuickStats.jsx` — inline forEach

```js
// Line 22 (inside stats.forEach):
pts += (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
```

Classification: **AGGREGATION**. Replace with `pts += totalPoints(s)`.
File does not currently import `totalPoints`.

---

### 4. `src/components/player/PlayerRecognition.jsx` — three instances

```js
// Line 19:
const pts = (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
// Line 92:
const pts = (s.points_2||0)*2 + (s.points_3||0)*3 + (s.free_throws||0);
// Line 98:
return (s.points_2||0)*2 + (s.points_3||0)*3 + (s.free_throws||0) >= 20;
```

Classification: all three **AGGREGATION**. Replace with `totalPoints(s)`.
File does not currently import `totalPoints`.

---

### 5. `src/components/stats/TeamStats.jsx` — reduce inline

```js
// Line 18 inside teamStats.reduce:
points: acc.points + ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0),
```

Classification: **AGGREGATION**. Replace with `acc.points + totalPoints(stat)`.
File does not currently import `totalPoints`.

---

### 6. `src/components/stats/mobile/MobileTeamStats.jsx` — same pattern

```js
// Line 14:
points: acc.points + ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0),
```

Classification: **AGGREGATION**. Same fix. File does not currently import `totalPoints`.

---

### 7. `src/components/stats/GameStats.jsx` — 3 AGGREGATION, 2 PER-STAT-DISPLAY

```js
// Line 35 (POG display) — AGGREGATION:
const points = ((playerStat.points_2 || 0) * 2) + ((playerStat.points_3 || 0) * 3) + (playerStat.free_throws || 0);

// Line 242 (away player row) — AGGREGATION:
const points = ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);

// Line 329 (home player row) — AGGREGATION:
const points = ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);

// Line 275 (away TEAM TOTALS row — "2PM" column total) — PER-STAT-DISPLAY: skip
{awayPlayerStats.reduce((acc, s) => acc + (s.points_2 || 0), 0)}

// Line 362 (home TEAM TOTALS row — "2PM" column total) — PER-STAT-DISPLAY: skip
{homePlayerStats.reduce((acc, s) => acc + (s.points_2 || 0), 0)}
```

File does not currently import `totalPoints`.

---

### 8. `src/components/stats/mobile/MobileGameStats.jsx` — 2 AGGREGATION

```js
// Line 24 (getTopPerformer) — AGGREGATION:
const points = ((playerStat.points_2 || 0) * 2) + ((playerStat.points_3 || 0) * 3) + (playerStat.free_throws || 0);

// Line 67 (PlayerRow) — AGGREGATION:
const pts = ((stat.points_2 || 0) * 2) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
```

File does not currently import `totalPoints`.

---

### 9–12. LeagueLeaders / PlayerStats / MobileLeagueLeaders / MobilePlayerStats — local `calcPoints`

All four files share the same pattern:

```js
const calcPoints = (stat) => {
  const game = games.find(g => g.id === stat.game_id);
  const isDigital = game && game.entry_type === 'digital' && !game.edited;
  return (isDigital ? (stat.points_2 || 0) * 2 : (stat.points_2 || 0)) + ((stat.points_3 || 0) * 3) + (stat.free_throws || 0);
};
```

**Why this is now wrong:** After the import fix, non-digital rows have
`points_2 = 0` and `total_points = correct_total`. The non-digital branch
evaluates to `0 + points_3*3 + ft` — missing all 2PT points contribution.

Fix: delete local `calcPoints`; import and use `totalPoints` from `@/lib/playerStats`.
None of these four files currently import `totalPoints`.

---

### 13. `src/components/live/PlayerSelector.jsx` — local variable name collision

```js
// Line 9 (uses "totalPoints" as a local variable name, shadowing nothing since not imported):
const totalPoints = ((playerStats?.points_2 || 0) * 2) + ((playerStats?.points_3 || 0) * 3);
```

Classification: **AGGREGATION** (displays running in-game total on player card).
Rename the local variable to `playerPts`, import `totalPoints` from helper, replace
formula with `totalPoints(playerStats)`.

---

## Expected corrected totals (Season 5, Check M)

| Player | Team | Corrected total |
|--------|------|----------------:|
| Yobz Vasquez | Achilles | 276 |
| Ryan Villanueva | Warriors | 232 |
| Ron Albarico | Bistag | 225 |
| Vhiemz Vequizo | SBP Lovers | 180 |
| Sieg Valdez | Phil-Tamp | 161 |
