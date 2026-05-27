# Edited-Game Investigation Report

**Date:** 2026-05-27
**Branch:** feature/base44-data-migration
**Backup file:** `/Users/macm5pro/Downloads/courtside-backup-2026-05-26.json`
**League:** Fin-Noy Ballers 40up Season 5 (`league_id = 698b4d0c05fbeef938b93720`)

---

## Dataset confirmed

| Entity | Count |
|---|---|
| Games (Season 5) | 37 |
| PlayerStats (raw) | 934 |
| GameLogs | 3906 |

These counts match the expected values before deduplication.

---

## Q1 — Edited flag distribution

| `edited` value | Game count |
|---|---|
| `True` | 26 |
| `False` | 11 |
| `null` / missing | 0 |

All 37 Season 5 games have an explicit boolean for `edited`. No nulls or missing values.

---

## Q2 — Confirm trigger

Standard formula: `points_2 * 2 + points_3 * 3 + free_throws`

| Set | Count | Game IDs |
|---|---|---|
| Mismatch games (stat sum ≠ recorded score) | 27 | — |
| `edited=True` games | 26 | — |
| In BOTH | 26 | — |
| In mismatch but NOT `edited=True` | 1 | `69c2b3b300fdcc16c577822b` |
| In `edited=True` but NOT mismatch | 0 | — |

**Verdict:** The sets are NOT a perfect match. All 26 `edited=True` games have mismatches. There is one additional mismatch game (`69c2b3b300fd...`) that has `edited=False`.

**Anomaly detail — game `69c2b3b300fdcc16c577822b`:**
- `edited=False`, `entry_type=manual`, `game_mode=timed`, `status=completed`
- Recorded score: home=69, away=65
- Standard formula sum: home=104, away=105 — inflated by roughly the same factor as edited games
- Alternative formula `points_2 + points_3*3 + free_throws`: home=69, away=65 — **exact match**
- This game was entered manually and behaves as an edited game despite `edited=False`. It is a data-entry anomaly: the scorer used the edited-game stat encoding but did not set the `edited` flag.
- **Practical impact:** The correct formula for this game is the alt2 formula, same as for edited games. The import used the standard formula, so this game's stats are overcounted in Supabase.

---

## Q3 — Stat shape comparison

### Non-edited games — 5 sample rows

All non-edited games use the standard formula. Each `points_2` value is a **count of 2-point field goals made** (not total 2PT points scored).

| game (prefix) | player (prefix) | p2 | p3 | ft | std formula | alt2 formula |
|---|---|---|---|---|---|---|
| `69db7ed1fb83` | `698b59c9` | 8 | 0 | 2 | **18** | 10 |
| `69db7ed1fb83` | `698b5749` | 4 | 2 | 1 | **15** | 11 |
| `69db7ed1fb83` | `698b7d3f` | 1 | 0 | 1 | **3** | 2 |
| `69db7ed1fb83` | `698b6391` | 7 | 1 | 2 | **19** | 12 |
| `69db7ed1fb83` | `698b5830` | 4 | 0 | 2 | **10** | 6 |

Team sums for this game: home_std=100 vs score=100 ✓, away_std=103 vs score=103 ✓

### Edited games — 5 sample rows

| game (prefix) | player (prefix) | p2 | p3 | ft | std formula | alt2 formula |
|---|---|---|---|---|---|---|
| `69b7ad26683c` | `698b5965` | 2 | 3 | 0 | 13 | **11** |
| `69b7ad26683c` | `698b6202` | 12 | 1 | 2 | 29 | **17** |
| `69b7ad26683c` | `698b6355` | 2 | 1 | 2 | 9 | **7** |
| `69b7ad26683c` | `698b58be` | 26 | 0 | 1 | 53 | **27** |
| `69b7ad26683c` | `698b6201` | 10 | 0 | 1 | 21 | **11** |

### Formula test across all 26 edited games

| Game (prefix) | Recorded score | STD sum | ALT2 sum |
|---|---|---|---|
| `69b7ad26683c` | 74/71 | 109/131 | **74/71** ✓ |
| `698b796cd725` | 70/71 | 114/119 | **70/71** ✓ |
| `69e1283f972c` | 68/66 | 122/108 | **68/66** ✓ |
| (all 26 games) | — | inflated | **26/26 exact match** |

**ALT2 formula is exact for all 26 edited games. STD formula is exact for all 10 of 11 non-edited games.**

### Interpretation of stat fields for edited games

Cross-referencing GameLog `stat_points` values with PlayerStats confirms:

- **`points_2`** in edited games = **total 2-point field-goal points** (i.e. basket count × 2). Each GameLog entry for `points_2` carries `stat_points=2`; the PlayerStats `points_2` accumulates this directly. This is the total 2PT contribution in points, not a basket count.
- **`points_3`** in edited games = **count of 3-point baskets made** (same as non-edited). Each log entry carries `stat_points=3`, but PlayerStats stores the basket count (`new_value` increments by 1 per basket).
- **`free_throws`** in edited games = **count of free throws made** (same as non-edited).

Therefore: `alt2 = points_2 + points_3 * 3 + free_throws` = (2PT pts) + (3PT pts) + (FT pts) = player total points. ✓

**Correct formula for edited games: `points_2 + points_3 * 3 + free_throws`**

---

## Q4 — Non-scoring stats in edited games

### 5 sample rows — non-edited games

| game | player | off_reb | def_reb | ast | stl | blk | to | fouls | min_played |
|---|---|---|---|---|---|---|---|---|---|
| `6a005255e3f0` | `698b63d9` | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| `6a005255e3f0` | `698b63dd` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| `6a005255e3f0` | `698b63db` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| `6a005255e3f0` | `698b574a` | 0 | 1 | 0 | 1 | 0 | 0 | 4 | 0 |
| `6a005255e3f0` | `698b63db` | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 0 |

### 5 sample rows — edited games

| game | player | off_reb | def_reb | ast | stl | blk | to | fouls | min_played |
|---|---|---|---|---|---|---|---|---|---|
| `69ff1439a777` | `698b63db` | 2 | 3 | 2 | 2 | 0 | 0 | 0 | 0 |
| `69ff1439a777` | `698b63dd` | 1 | 3 | 0 | 1 | 0 | 0 | 2 | 0 |
| `69ff1439a777` | `698b63db` | 2 | 0 | 1 | 3 | 0 | 1 | 0 | 0 |
| `69ff1439a777` | `698b63d9` | 1 | 3 | 3 | 1 | 0 | 0 | 1 | 0 |
| `69ff1439a777` | `698b63dc` | 0 | 1 | 1 | 0 | 0 | 0 | 3 | 0 |

### Population-level non-scoring stat presence

| Stat field | Non-edited (211 rows) | Edited (723 rows) |
|---|---|---|
| `offensive_rebounds` | 22% non-zero | 5% non-zero |
| `defensive_rebounds` | 73% non-zero | 53% non-zero |
| `assists` | 60% non-zero | 44% non-zero |
| `steals` | 51% non-zero | 36% non-zero |
| `blocks` | 11% non-zero | 8% non-zero |
| `turnovers` | 4% non-zero | 1% non-zero |
| `fouls` | 64% non-zero | 41% non-zero |
| `minutes_played` | 47% non-zero | 7% non-zero |
| `free_throws_missed` | 0% non-zero | 0% non-zero |

**Findings:** Non-scoring stats are NOT zeroed out or structurally absent in edited games. They are present at a lower density than in non-edited games, but the field structure is identical. The lower density in edited games reflects that most edited games were manually entered (stats added after the fact) and players with no contributions were added with zero-only rows. `minutes_played` is nearly absent in edited games (7% vs 47%), and `free_throws_missed` is always zero in both game types across the entire dataset. Non-scoring stat semantics are **unchanged** between edited and non-edited games.

---

## Q5 — GameLogs for edited games

### Log volume comparison

| Group | Games | Total logs | Avg logs/game |
|---|---|---|---|
| Edited (`edited=True`) | 26 | 1,254 | 48.2 |
| Non-edited (`edited=False`) | 11 | 2,652 | 241.1 |

### Per-game breakdown for edited games

| Game (prefix) | Date | Log count |
|---|---|---|
| `698b72e6f57b` | 2026-01-04 | 0 |
| `698b73c61a7e` | 2026-01-04 | 0 |
| `698b74a1b517` | 2026-01-05 | 0 |
| `698b754919bb` | 2026-01-04 | 0 |
| `698b7709ae93` | 2026-01-10 | 0 |
| `698b7780618e` | 2026-01-10 | 0 |
| `698b796cd725` | 2026-01-10 | 0 |
| `698b7a59d799` | 2026-01-18 | 0 |
| `698b7acb92dd` | 2026-01-18 | 0 |
| `698b7b3765a3` | 2026-02-01 | 0 |
| `698b7bc4b7f8` | 2026-02-01 | 0 |
| `698b7c47e30a` | 2026-02-07 | 0 |
| `698b7f9aa14a` | 2026-02-07 | 0 |
| `69a6fa119552` | 2026-03-01 | 0 |
| `69ae7a5059bc` | 2026-03-08 | 0 |
| `69ae81ead8c7` | 2026-03-08 | 0 |
| `69b7a0eb33d8` | 2026-03-14 | 0 |
| `69b7ad26683c` | 2026-03-14 | 0 |
| `69b7b1d6f9dc` | 2026-03-14 | 0 |
| `69c173cd9b10` | 2026-03-22 | 0 |
| `699c753aed82` | 2026-02-22 | 112 |
| `69a5ba980772` | 2026-03-01 | 92 |
| `6998c91f252b` | 2026-02-21 | 237 |
| `69b67421a415` | 2026-03-15 | 264 |
| `69e1283f972c` | 2026-04-18 | 213 |
| `69ff1439a777` | 2026-05-09 | 336 |

**20 of 26 edited games have zero game logs.** 6 edited games (all from 2026-02-21 onward) have a full log stream.

### Stat types present in edited games (1,254 logs)

| stat_type | Count |
|---|---|
| `points_2` | 349 |
| `defensive_rebounds` | 239 |
| `assists` | 136 |
| `substitution` | 126 |
| `fouls` | 112 |
| `steals` | 90 |
| `free_throws` | 86 |
| `points_3` | 50 |
| `offensive_rebounds` | 37 |
| `blocks` | 11 |
| `turnovers` | 10 |
| `timeout` | 6 |
| `unsportsmanlike_fouls` | 2 |

**`points_2`, `points_3`, and `free_throws` are all present in edited game logs.**

### Can per-player 2PT/3PT/FT breakdown be reconstructed from logs?

For the **6 edited games with logs**, reconstruction is possible and verified exact:
- Per-player `points_2` total = `SUM(stat_points)` for `stat_type='points_2'` logs (each basket adds `stat_points=2`).
- Per-player `points_3` count = count of `stat_type='points_3'` log entries (or `MAX(new_value)`) for that player.
- Per-player `free_throws` count = `SUM(stat_points)` for `stat_type='free_throws'` logs (each FT adds `stat_points=1`).

Cross-check for game `69e1283f972c144dd16c7311` confirmed that `log-reconstructed values == PlayerStats values` for all 12 players with scoring activity.

For the **20 edited games with zero logs**, per-player 2PT/3PT/FT breakdown is **permanently lost**. The PlayerStats record stores only total points (via the alt2 formula) and the aggregate non-scoring stats. There is no way to recover how many 2PT baskets vs 3PT baskets a player made for those games.

---

## Q6 — Dedup audit

All 10 duplicate `(game_id, player_id)` pairs belong to a **single non-edited game**: `69e1280fa7c732ee14ef6645` (date: 2026-04-18, edited=False, home=80, away=67).

In each case one row had real stats and the other row was a zero-row (all fields zero). The zero-row is the artifact duplicate.

| # | player (prefix) | Row kept (p2/p3/ft) | std | alt2 | Row dropped (p2/p3/ft) | std | alt2 |
|---|---|---|---|---|---|---|---|
| 1 | `698b63dd` | 3/0/0 | 6 | 3 | 0/0/0 | 0 | 0 |
| 2 | `698b63d9` | 1/0/0 | 2 | 1 | 0/0/0 | 0 | 0 |
| 3 | `698b63d8` | 19/0/3 | 41 | 22 | 0/0/0 | 0 | 0 |
| 4 | `698b6390` | 2/0/0 | 4 | 2 | 0/0/0 | 0 | 0 |
| 5 | `698b63db` | 1/0/0 | 2 | 1 | 0/0/0 | 0 | 0 |
| 6 | `698b5a43` | 2/1/0 | 7 | 5 | 0/0/0 | 0 | 0 |
| 7 | `698b6390` | 3/1/0 | 9 | 6 | 0/0/0 | 0 | 0 |
| 8 | `698b6391` | 6/0/0 | 12 | 6 | 0/0/0 | 0 | 0 |
| 9 | `698b638e` | 2/0/2 | 6 | 4 | 0/0/0 | 0 | 0 |
| 10 | `698b638d` | 10/1/3 | 26 | 16 | 0/0/0 | 0 | 0 |

**Key finding for dedup correction:**

- Game `69e1280fa7c7` has `edited=False`. The standard formula applies.
- In all 10 pairs the "kept" row (chosen by higher std score) has non-zero stats; the "dropped" row is all zeros. Under both the std formula and the alt2 formula the same row wins.
- After dedup with std formula: home=80 vs score=80 ✓, away=67 vs score=67 ✓.
- **No dedup correction is needed. The original dedup kept the correct row in all 10 cases.**

---

## Confirmed rules

Empirically validated Base44 edited-game semantics:

1. **`edited=True` changes the semantic of `points_2` only.** In an edited game, `points_2` stores the player's **total 2-point field-goal points** (i.e. basket count × 2), not the basket count itself. `points_3` and `free_throws` remain **counts** in both game types.

2. **Correct scoring formula for edited games:** `points_2 + points_3 * 3 + free_throws`. This formula is exact for all 26 edited games (26/26 match the recorded score). The standard formula `points_2 * 2 + points_3 * 3 + free_throws` overcounts by roughly the number of 2PT baskets scored.

3. **Correct scoring formula for non-edited games:** `points_2 * 2 + points_3 * 3 + free_throws`. This is exact for 10/11 non-edited games. The one exception (`69c2b3b300fd`) used edited-game encoding despite `edited=False`.

4. **Non-scoring stats are structurally identical** in both game types. Rebounds, assists, steals, blocks, turnovers, and fouls have the same field names and semantics. They are sparser in edited games (lower population density) but not zeroed out structurally.

5. **`edited=True` games are predominantly backfilled stats** (totals entered after the game, not live-tracked). This is evidenced by 20/26 edited games having zero game logs and very low `minutes_played` density (7%).

6. **The anomalous non-edited game `69c2b3b300fd`** was entered manually and uses the edited-game encoding (alt2 formula matches score exactly). Its `edited` flag is incorrect; it should be treated as an edited game for stat calculation purposes.

---

## Reconstruction feasibility

- **20 of 26 edited games** have no GameLog rows. For these games the per-player 2PT/3PT/FT breakdown is **permanently irrecoverable** from the Base44 backup. The only knowable per-player scoring fact is total points (`points_2 + points_3 * 3 + free_throws`).

- **6 of 26 edited games** have full GameLog streams. For these games the breakdown is fully recoverable: `points_2_pts = SUM(stat_points) for points_2 logs`, `points_3_count = count of points_3 log entries`, `free_throws_count = SUM(stat_points) for free_throws logs`.

- **10 of 11 non-edited games** have full logs and standard formula applies. All breakdown data is intact.

- **The 1 anomalous non-edited game** (`69c2b3b300fd`) has 0 logs. Same loss as edited-no-log games.

**Summary:** 21 of 37 Season 5 games cannot have per-player 2PT/3PT shooting split reconstructed. They can only provide total-points-per-player. Any statistic requiring 2PT vs 3PT differentiation (e.g. field-goal percentage by zone, 2PT attempts) will be unavailable for these games from the Base44 source.

---

## Schema implications

The Supabase `player_stats` table must support two shapes for `points_2`:

| Game type | `points_2` meaning | Scoring formula |
|---|---|---|
| Non-edited (`edited=False`) | count of 2PT field goals made | `points_2 * 2 + points_3 * 3 + free_throws` |
| Edited (`edited=True`) | total 2PT points scored (count × 2) | `points_2 + points_3 * 3 + free_throws` |

Options:
1. **Store raw (as-is) + add `edited` flag column to `player_stats`** and apply the correct formula at query time via a computed column or view. Requires changing every stat query to branch on `edited`.
2. **Normalise on import** — convert edited-game `points_2` to basket count (`points_2 / 2`) so all rows use the same schema. This loses the raw value but simplifies all downstream queries. Only safe because `points_2` in edited games is always even (each 2PT basket adds exactly 2).
3. **Add a separate column** `points_2_pts` for total 2PT points, keeping `points_2` as basket count always. Populate `points_2_pts = points_2 * 2` for non-edited and `points_2_pts = points_2` for edited during import. Then scoring formula is always `points_2_pts + points_3 * 3 + free_throws`.

The `game` table already has an `edited` flag (from Base44 legacy ingestion columns added in Phase A). That flag must be propagated to the `player_stats` table or retained in the `games` table and joined at query time.

---

## Dedup correction

No correction needed. All 10 duplicate pairs are from a single non-edited game (`69e1280fa7c7`). In every pair the dropped row was a zero-stats ghost row. The kept row (higher std score) is also the higher alt2 score. Post-dedup score reconciliation confirms perfect match against recorded score under the standard formula.
