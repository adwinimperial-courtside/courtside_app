# Season 5 Import — Validation Report

**Date:** 2026-05-26
**League:** Fin-Noy Ballers 40up Season 5
**Supabase league_id:** `30639acb-a877-4068-9181-a857675106f6`
**Base44 league_id:** `698b4d0c05fbeef938b93720`
**Project:** `bikjkoyodkduhnnlbzpb` (Supabase EU-central)
**Tool:** `supabase db query --linked --output csv` (psql not installed on this machine)
**Raw output:** `docs/temp/season5-validation-2026-05-26-raw.txt`

---

## Summary

| Check | Verdict | Note |
|---|---|---|
| A. Entity counts | ✅ PASS | 1 / 8 / 130 / 37 / 924 / 3906 — all match expected |
| B. Score-vs-stat-sum integrity | ⚠️ FAIL (source-data) | 27 of 37 games mismatch. Pattern identical when summed from `game_logs` — points to Base44 data quality, not import bug |
| C. Distinct `stat_type` values | ✅ PASS | All 15 distinct values are uppercase codes (`2PT`, `3PT`, `FTM`, …). No raw `points_2`/`free_throws` leakage |
| D. Sentinel last_name count | ✅ PASS | Exactly 11 players with `last_name = '-'` |
| E. Date validity for games | 🔴 **FAIL (import bug)** | All 37 games have `NULL scheduled_at`. `parseGameDate()` doesn't handle ISO datetime input; original `game_date` also not preserved in `legacy_extras` |
| F. Orphan checks | ✅ PASS | 0 orphans in all three checks |
| G. Top 5 scorers | ✅ PASS | Matches expected leaderboard exactly |
| H. Legacy field coverage | ✅ PASS | 0 NULL `legacy_base44_id` across all 6 entities |
| I. Game status distribution | ✅ PASS | All 37 games = `'final'` |
| J. Game stage distribution | ✅ PASS | 36 `'regular'` + 1 `'championship'` (the playoff remap) |

**Overall: 2 issues found — 1 import bug (E), 1 source-data quality issue (B).**

---

## A. Entity counts

**Expected:** 1 league, 8 teams, 130 players, 37 games, 924 player_stats, 3906 game_logs.

**Query:**
```sql
SELECT 'leagues' AS entity, count(*)::int FROM leagues WHERE id = '<league_id>'
UNION ALL SELECT 'teams', count(*)::int FROM teams WHERE league_id = '<league_id>'
...
```

**Result:**
| entity | n |
|---|---:|
| leagues | 1 |
| teams | 8 |
| players | 130 |
| games | 37 |
| player_stats | 924 |
| game_logs | 3906 |

**Verdict:** ✅ PASS — every count matches exactly.

---

## B. Score-vs-stat-sum integrity

**Expected:** for every game, `SUM(points_2 * 2 + points_3 * 3 + free_throws)` over player_stats rows for each team equals the game's `home_score` / `away_score`.

**Headline result:** **27 of 37 games (73 %) FAIL this check.** All failures have stat_sum strictly **greater** than the recorded score.

Example mismatches:
| game_id | home_score | home_sum | away_score | away_sum |
|---|---:|---:|---:|---:|
| `e98e84be…` | 74 | **109** (+35) | 71 | **131** (+60) |
| `6b2ccc10…` | 116 | **214** (+98) | 57 | **103** (+46) |
| `b1fe0165…` | 106 | **200** (+94) | 70 | **124** (+54) |
| `e7233487…` | 101 | **185** (+84) | 75 | **137** (+62) |

### Where does the inflation come from? Two diagnostics:

**B3 — `player_stats.points_2` vs game_logs '2PT' count for the top-points_2 rows:**
| stat_id | points_2 | 2PT log count | free_throws | FTM log count |
|---|---:|---:|---:|---:|
| `e584e683…` | **30** | **0** | 5 | 0 |
| `2ecbfc82…` | **30** | **0** | 4 | 0 |
| `ae63010e…` | **26** | **15** | 9 | 9 |
| `6e616953…` | **24** | **12** | 2 | 2 |
| `13f533ea…` | **24** | **0** | 1 | 0 |

Player_stats and game_logs are wildly inconsistent in Base44. Many high-`points_2` rows have **zero** `2PT` game_logs.

**B4 — Same check using `game_logs.stat_points` (summed for `2PT`, `3PT`, `FTM`, excluding `undone`):**
```
games_total, log_matches_score, log_mismatches_score
         37,               10,                   27
```

The **same 27 games** that fail player_stats reconciliation also fail game_logs reconciliation. The 10 games that pass match perfectly via both sources.

### Conclusion

The recorded `home_score` / `away_score` values are internally inconsistent with both `player_stats` *and* `game_logs` for 73 % of Season 5 games. **This is a Base44 source-data quality issue, not an import bug** — our import preserved each field unchanged. The two stat-tracking surfaces in Base44 (live `game_logs` vs aggregated `player_stats`) appear to have drifted out of sync over the season.

**Verdict:** ⚠️ FAIL — but the failure is in the source data. The import faithfully copied what was there.

---

## C. Distinct `stat_type` values

**Expected:** uppercase short codes (`2PT`, `3PT`, `FTM`, `OREB`, `DREB`, `AST`, `STL`, `BLK`, `TO`, `FOUL`, …). NOT raw Base44 snake_case (`points_2`, `defensive_rebounds`, `free_throws`).

**Result:** 15 distinct values, all uppercase codes:

| stat_type | n |
|---|---:|
| 2PT | 948 |
| 3PT | 141 |
| AST | 447 |
| BLK | 36 |
| DREB | 860 |
| EJECTION | 4 |
| FOUL | 377 |
| FTM | 258 |
| OREB | 128 |
| STL | 269 |
| SUBSTITUTION | 370 |
| TECHNICAL | 3 |
| TIMEOUT | 39 |
| TO | 22 |
| UNSPORTSMANLIKE | 4 |

**Verdict:** ✅ PASS — no raw codes leaked through. (Absence of `FTX`/`PERIOD_END` is fine; Season 5 simply has no missed-FT or period-end events logged.)

---

## D. Sentinel last_name count

**Expected:** exactly 11 players with `last_name = '-'`.

**Result:** 11 — matches.

List (from `D2`):
```
Bitangcol, Cartagena, Caruz, Condino, Diego, Dueño,
Guerra, Jose, Olisiman, Ragnar, Taroy
```

Each is a single-token Base44 `name` that got mapped to `first_name = <name>, last_name = '-'`. The generated `name` column will read e.g. `"Bitangcol -"`, which is the documented sentinel pattern from ADR-011.

**Verdict:** ✅ PASS.

---

## E. Date validity for games

**Expected:** all 37 games have a valid `scheduled_at` between 2020 and 2030.

**Result:**
```
null_count, pre_2020_count, min_scheduled, max_scheduled
        37,              0,          NULL,          NULL
```

**Every single game has `scheduled_at = NULL`.** Diagnostic:

```python
# Base44 raw values from backup:
'6a005255…': '2026-05-10T14:00'    # 16-char ISO datetime
'6a0051e8…': '2026-05-10T12:30'
'69ff145b…': '2026-05-09T17:30'
# Distribution: 16-char form (×16), 24-char form (×21). All ISO datetime, never pure dates.
```

The Edge Function's `parseGameDate()` is:
```ts
const iso = `${dateStr}T00:00:00Z`;
const d = new Date(iso);
```

For input `"2026-05-10T14:00"`, this produces `"2026-05-10T14:00T00:00:00Z"` (invalid), Date.parse → NaN → returns null. Result: every game date silently lost.

**Worse:** original `game_date` is **not preserved in `legacy_extras`** either:
```
has_in_extras, count
        false,    37
```

The values are recoverable only from the original backup JSON, not from Supabase alone.

**Verdict:** 🔴 **FAIL — real import bug.** `parseGameDate()` needs to handle ISO datetime input, and `legacy_extras.game_date_b44` should preserve the raw value as a safety net.

---

## F. Orphan checks

**Expected:** 0 orphans on three FK paths.

**Result:**
| Check | Orphans |
|---|---:|
| Players (with non-null team_id) → teams | 0 |
| player_stats → players | 0 |
| player_stats → games | 0 |

**Verdict:** ✅ PASS — referential integrity intact.

---

## G. Top 5 scorers

**Expected:** ~393 at Bistag, Yobz Vasquez/Achilles/368, Ryan Villanueva/Warriors/358, Vhiemz Vequizo/SBP Lovers/260, Rex Abono/Phil-Tamp/225.

**Result:**
| player | team | total_points |
|---|---|---:|
| Ron Albarico | Bistag | 393 |
| Yobz Vasquez | Achilles | 368 |
| Ryan Villanueva | Warriors | 358 |
| Vhiemz Vequizo | SBP Lovers | 260 |
| Rex Abono | Phil-Tamp | 225 |

**Verdict:** ✅ PASS — exact match.

⚠️ **Caveat:** these totals are computed by the same `points_2*2 + points_3*3 + free_throws` formula that B showed produces inflated numbers for 27 of 37 games. The leaderboard ranking is reliable but the absolute totals are probably overstated. Take the numbers as relative comparisons, not as ground truth.

---

## H. Legacy field coverage

**Expected:** zero NULL `legacy_base44_id` rows across all 6 entities.

**Result:**
| entity | null_count | total |
|---|---:|---:|
| leagues | 0 | 1 |
| teams | 0 | 8 |
| players | 0 | 130 |
| games | 0 | 37 |
| player_stats | 0 | 924 |
| game_logs | 0 | 3906 |

**Verdict:** ✅ PASS — every imported row has its Base44 ID preserved.

---

## I. Game status distribution

**Expected:** 37 × `'final'` (Base44 `'completed'` remapped via `remapStatus`).

**Result:**
| status | n |
|---|---:|
| final | 37 |

**Verdict:** ✅ PASS.

---

## J. Game stage distribution

**Expected:** 27 × `'regular'` from null-default, rest `'championship'` or other.

**Result:**
| game_stage | n |
|---|---:|
| regular | 36 |
| championship | 1 |

Breakdown:
- 27 games had `game_stage = null` in Base44 → defaulted to `'regular'`
- 9 games had `game_stage = 'regular'` explicitly → stayed `'regular'`
- 1 game had `game_stage = 'playoff'` → remapped to `'championship'` (preserved in `legacy_extras.game_stage_b44 = 'playoff'`)

**Verdict:** ✅ PASS.

---

## Issues found

### 🔴 Issue 1 — All 37 game dates lost (import bug, fixable)

**Severity:** High — every game appears undated in the new app.
**Root cause:** `parseGameDate(dateStr)` in `supabase/functions/import-base44-league/transforms.ts` assumes input is `"YYYY-MM-DD"` and unconditionally appends `T00:00:00Z`. Base44 actually stores `game_date` as ISO datetime (`"2026-05-10T14:00"` or `"2026-05-10T14:00:00.000Z"`), producing malformed strings that parse to NaN.
**Aggravating factor:** the raw value is also not stored in `legacy_extras`, so the data is recoverable only from the backup file.

### ⚠️ Issue 2 — 27 of 37 games have score / stat mismatches (source-data quality)

**Severity:** Medium — leaderboards and per-game totals are unreliable for 73 % of games.
**Root cause:** Base44 itself. The recorded `home_score` / `away_score` values disagree with both `player_stats` aggregates AND `game_logs.stat_points` aggregates — and the same 27 games fail both ways. The two stat surfaces (live logs vs aggregated stats) drifted out of sync over the season inside Base44.
**Import behaviour:** correct — we faithfully copied each field. No transformation could fix this; it would require deciding which source (recorded score, player_stats, or game_logs) is authoritative per game.

---

## Recommendations

### Fix Issue 1 immediately (transforms.ts)

1. Replace `parseGameDate()` body with:
   ```ts
   if (dateStr === null || dateStr === undefined || dateStr === "") return null;
   // Accept either pure YYYY-MM-DD or full ISO datetime — `Date` parses both.
   const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00Z` : dateStr);
   if (Number.isNaN(d.getTime())) return null;
   return d.toISOString();
   ```
2. In `index.ts` Step D (game insert), also stash the raw value in `legacy_extras` as a safety net:
   ```ts
   if (g.game_date) extras.game_date_b44 = g.game_date;
   ```
3. After redeploy, run a one-shot UPDATE to backfill `scheduled_at` for the existing 37 games from the backup JSON (since we already imported with NULL).

### Fix Issue 2 — out of scope of import code

Two viable paths, both require human decision:
- **Trust the recorded scores** (most likely correct: that's what the UI displays at game time). Accept stat inconsistencies as "Base44 historical noise" and rely on `home_score` / `away_score` for any score-dependent feature; treat `player_stats` aggregates as approximate.
- **Reconcile per game** by picking whichever of `player_stats` or `game_logs` matches the recorded score. For the 10 already-consistent games this is moot; for the 27 mismatched games, neither matches.

Whichever path Win chooses, document it in the league's `legacy_extras` or in ADR-011 follow-up so future imports apply the same convention.

### Smaller recommendations

- **D — sentinel last_name = '-'**: 11 players will need manual cleanup (entering real surnames). Worth surfacing in the admin UI when Phase D ships.
- **J — playoff stage**: only 1 game in Season 5 was `'playoff'`. If Win plans many imports with playoff brackets, consider adding `'playoff'` to the `game_stage` CHECK constraint instead of always remapping to `'championship'`.
- **Auto-grant league_admin membership** to the importing app_admin (mentioned earlier) is still pending — would make the post-import UX smoother for delegated imports.
