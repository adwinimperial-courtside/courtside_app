# Schedule Option C — Preflight

## Environment
```
/Users/macm5pro/Projects/courtside   ·   feature/initial-schema
114 modified items from prior work (clean for this task)
```

## Current files in scope
| File | Lines / size | Notes |
|---|---|---|
| `src/pages/Schedule.jsx` | 506 | Tab bar + date pills + grouped game cards (current version) |
| `src/components/schedule/GameCard.jsx` | 36 KB | Heavy card (status, scores, POG, box-score expand). **Only imported by `Schedule.jsx`** — will become orphaned after rewrite. |
| `src/components/schedule/CreateGameDialog.jsx` | 12 KB | Preserve ✅ |
| `src/components/schedule/EditGameSettingsDialog.jsx` | 10 KB | Preserve ✅ (used by GameCard today — also by new card) |
| `src/components/schedule/DefaultWinnerDialog.jsx` | 7 KB | Preserve ✅ (used by GameCard today) |
| `src/components/schedule/POGSpotlightModal.jsx` | 2 KB | Preserve ✅ (not imported anywhere currently) |

## Infrastructure confirmed present
- `src/styles/theme.css` with the full `--ct-*` palette (Dark Court + Warm Sand)
- `useIsNarrowLayout()` hook already used by 7 pages
- `useAuth()` exposes `currentUser`, `userProfile`, `userType`, `isAppAdmin`

---

## ⚠️ Schema discrepancies — spec vs. actual DB

The spec references several column/relation names that don't exist. Flagging these now so the rewrite doesn't hit runtime errors:

| Spec wording | Actual schema | Fix in rewrite |
|---|---|---|
| `game.game_datetime` | Column is **`scheduled_at`** | Use `scheduled_at` throughout |
| `game.is_edited` | Column is **`edited`** (boolean) | Check `game.edited` |
| `status = 'completed'` | Status enum: `scheduled / live / final / cancelled / postponed` | Filter on `status === 'final'` |
| `player_of_game_profile:profiles!games_player_of_game_fkey(...)` | FK points to **`players(id)`**, not `profiles` | Join as `player_of_game_player:players!player_of_game(id, name, first_name, last_name)` |
| FK constraint names like `games_home_team_id_fkey` | Inline FKs in initial schema — Supabase generates names but they're not spelled out in migrations | Use column-disambiguation: `home_team:teams!home_team_id(...)`, `away_team:teams!away_team_id(...)`, `league:leagues!league_id(...)` — these are unambiguous and don't require FK names |

### Additional columns available on `games`
`game_stage` (regular/quarterfinal/semifinal/championship), `exclude_from_awards`, `is_default_result`, `default_winner_team_id`, `default_loser_team_id`, `entry_type` (digital/manual/import), `edited`, `last_edited_by`, `last_edited_at`, `player_of_game`, `started_at`, `ended_at`, `game_mode`, `period_type`, `period_count`, `period_minutes`, `overtime_minutes`.

**Period info for "LIVE · Q2"** — the `games` table doesn't store the current live period. `LiveStatTracker` tracks period in component state but doesn't persist it on the `games` row. If you want "LIVE · Q2" on the score strip, it either needs:
- a new column (e.g. `current_period`), or
- derivation from `game_logs` table (last log's `period` field)

I'll propose deriving from `game_logs` (separate query, cached per-game) — but that's additional scope. If it's too much for v1, I'll just show "LIVE" without the period suffix and note it as follow-up.

---

## ⚠️ "View stats" navigation target — needs decision

Spec says: *"View stats on completed games → navigate to game stats page (use existing routing)"*.

**There is no separate game-stats page in the codebase.** The existing pattern is inline expansion — GameCard.jsx fetches player_stats when "View Stats" is tapped and renders the box-score table inside the card.

Options for the new design:
- **(A)** Keep the inline-expand pattern — tap "View stats" → card expands to show box score (~same UX as today; less disruptive).
- **(B)** Navigate to `/LiveBoxScore?gameId=...` — it already renders a box score for any game, live or final. This is the least-work "separate page" option and is what the "Live stats" button points to today.
- **(C)** Create a brand-new `/GameStats` page. Out of scope for this rewrite.

**Recommend (B)** — both "Live stats" and "View stats" route to `/LiveBoxScore?gameId=...`. Clean, zero new code paths needed.

---

## Other callouts

1. **Admin role per league** — `useAuth()` gives you `isAppAdmin` globally, but `league_admin` is per-league. Current Schedule.jsx pulls `user_league_memberships` and checks `role === 'league_admin'` for the *selected* league. The new Schedule needs the same pattern — the "+ Schedule Game" / "Continue" / "Edit" buttons visible only when the viewer is admin for **that specific game's league**.

2. **Three dialogs are reused** — CreateGameDialog, EditGameSettingsDialog, DefaultWinnerDialog will be mounted in the new Schedule.jsx and invoked from the new card action buttons.

3. **GameCard.jsx orphans** — after the rewrite, nothing imports it. Two choices:
   - delete it (safe — only referenced by `Schedule.jsx`)
   - leave it in place as backup until you're satisfied with the new page

   I'll delete after you sign off — it's 36 KB of dead code otherwise.

4. **POGSpotlightModal** — already orphaned today (nothing imports it). I won't touch it; it stays for future use.

5. **Date-fns week boundaries** — I'll use `startOfWeek(date, { weekStartsOn: 1 })` so "Monday–Sunday" weeks land correctly (default is Sunday–Saturday).

6. **Score strip period indicator** — see note above.

---

## Questions before Step 4 (the rewrite)

Please confirm:

1. **`View stats` navigation** — go with option **(B)** (route to `/LiveBoxScore?gameId=...`)? Or keep inline expansion (option A)?
2. **Live period indicator ("LIVE · Q2")** — do it in this pass (requires a `game_logs` query per live game), or ship without period suffix and add as follow-up?
3. **Delete the orphaned `GameCard.jsx`** after the new page ships, or leave it in place?

Once you answer those, I'll continue with Steps 2–6 (read current files → build new page → extract components if needed → build verify).
