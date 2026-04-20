# player_stats table schema

## Columns (from migrations)

| column | type | default | notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| league_id | uuid | — | FK leagues |
| game_id | uuid | — | FK games ON DELETE CASCADE |
| player_id | uuid | — | FK players ON DELETE CASCADE |
| team_id | uuid | — | FK teams |
| points | integer | 0 | **Total points — legacy/manual entry column** |
| field_goals_made | integer | 0 | legacy |
| field_goals_attempted | integer | 0 | legacy |
| three_pointers_made | integer | 0 | legacy |
| three_pointers_attempted | integer | 0 | legacy |
| free_throws_made | integer | 0 | legacy |
| free_throws_attempted | integer | 0 | legacy |
| offensive_rebounds | integer | 0 | |
| defensive_rebounds | integer | 0 | |
| assists | integer | 0 | |
| steals | integer | 0 | |
| blocks | integer | 0 | |
| turnovers | integer | 0 | |
| fouls | integer | 0 | |
| minutes_played | numeric(5,2) | — | nullable |
| is_starter | boolean | false | from migration 000007 |
| points_2 | integer | 0 | **2PT field goals made — live tracker** |
| points_3 | integer | 0 | **3PT field goals made — live tracker** |
| free_throws | integer | 0 | **FT made — live tracker** |
| free_throws_missed | integer | 0 | live tracker |
| technical_fouls | integer | 0 | live tracker |
| unsportsmanlike_fouls | integer | 0 | live tracker |
| is_active | boolean | false | from migration 000011 |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

## Key observations

- `points` = total points (manual/legacy). For **digital games**, live tracker writes `points_2`, `points_3`, `free_throws` but leaves `points = 0`.
- To get correct PTS for digital games: `points || (points_2 * 2 + points_3 * 3 + free_throws)`
- No migration needed — `points` column already exists.

## Fix applied (AdminTools.jsx Edit Game)

```js
pts: s.points || ((s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0)),
```

When saving edits, `rowToStats` writes back to `points` so the value persists correctly after the first edit.
