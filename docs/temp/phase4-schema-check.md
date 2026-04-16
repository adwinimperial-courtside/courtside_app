# Phase 4 Schema Check

Queried via: `npx supabase db query --linked`
Date: 2026-04-16

---

## 1. leagues

| column_name | data_type |
|-------------|-----------|
| id | uuid |
| name | text |
| slug | text |
| country | text |
| timezone | text |
| sport | text |
| logo_url | text |
| is_active | boolean |
| is_sample | boolean |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |

**Missing:** `season` — referenced by Standings.jsx, Statistics.jsx, and PlayerProfile.jsx in league selector labels and standings display.

---

## 2. teams

| column_name | data_type |
|-------------|-----------|
| id | uuid |
| league_id | uuid |
| name | text |
| short_name | text |
| logo_url | text |
| color | text |
| is_active | boolean |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |
| head_coach | text |
| manager | text |

**All needed columns present.** `color` exists — LiveBoxScore.jsx jersey badge confirmed OK.

---

## 3. games

| column_name | data_type |
|-------------|-----------|
| id | uuid |
| league_id | uuid |
| home_team_id | uuid |
| away_team_id | uuid |
| scheduled_at | timestamp with time zone |
| started_at | timestamp with time zone |
| ended_at | timestamp with time zone |
| status | text |
| home_score | integer |
| away_score | integer |
| venue | text |
| notes | text |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |
| game_stage | text |
| exclude_from_awards | boolean |
| is_default_result | boolean |
| default_winner_team_id | uuid |
| default_loser_team_id | uuid |
| default_reason | text |
| game_mode | text |
| period_type | text |
| period_count | integer |
| period_minutes | integer |
| overtime_minutes | integer |
| player_of_game | uuid |
| clock_running | boolean |
| clock_started_at | timestamp with time zone |
| clock_time_left | numeric |
| clock_period | integer |
| period_status | text |
| possession | text |
| home_team_fouls | jsonb |
| away_team_fouls | jsonb |
| home_timeouts | jsonb |
| away_timeouts | jsonb |
| game_rules | jsonb |
| entry_type | text |
| edited | boolean |
| lineup_repair_locked_by | text |
| lineup_repair_locked_at | timestamp with time zone |

**All needed columns present.** `game_mode` exists — LiveBoxScore.jsx MIN column toggle confirmed OK. `lineup_repair_locked_by` / `lineup_repair_locked_at` from migration 010 confirmed present.

---

## 4. player_stats

| column_name | data_type |
|-------------|-----------|
| id | uuid |
| league_id | uuid |
| game_id | uuid |
| player_id | uuid |
| team_id | uuid |
| points | integer |
| field_goals_made | integer |
| field_goals_attempted | integer |
| three_pointers_made | integer |
| three_pointers_attempted | integer |
| free_throws_made | integer |
| free_throws_attempted | integer |
| offensive_rebounds | integer |
| defensive_rebounds | integer |
| assists | integer |
| steals | integer |
| blocks | integer |
| turnovers | integer |
| fouls | integer |
| minutes_played | numeric |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |
| is_starter | boolean |
| points_2 | integer |
| points_3 | integer |
| free_throws | integer |
| free_throws_missed | integer |
| technical_fouls | integer |
| unsportsmanlike_fouls | integer |

**Missing:** `is_active` — does NOT exist. Confirmed. Any component referencing `stat.is_active` (LiveBoxScore.jsx, Statistics.jsx child components) will read `undefined` and silently treat all players as inactive.

**Missing:** `did_play` — does NOT exist. PlayerProfile.jsx uses `stat.did_play` in `didPlayerParticipate()` as a shortcut flag. Falls back to stat counting, so not blocking, but column is absent.

---

## Summary of gaps

| Table | Missing column | Used by | Priority |
|-------|---------------|---------|---------|
| leagues | `season` | Standings, Statistics, PlayerProfile | High — needed for league selector labels |
| player_stats | `is_active` | LiveBoxScore, Statistics child components | High — silent display bug (all players show as inactive) |
| player_stats | `did_play` | PlayerProfile `didPlayerParticipate()` | Low — has fallback logic via stat counting |

**No gaps in:** teams, games — all referenced columns already exist.

## Recommended migrations before rebuild

1. `ALTER TABLE leagues ADD COLUMN season text;`
2. `ALTER TABLE player_stats ADD COLUMN is_active boolean DEFAULT false;` — then decide: keep as duplicate of `is_starter`, or consolidate. Given LiveStatTracker already uses `is_starter` for on-court state, `is_active` should either be an alias or LiveBoxScore/Statistics should be updated to use `is_starter` instead.
3. `ALTER TABLE player_stats ADD COLUMN did_play boolean DEFAULT false;` — optional, low priority.
