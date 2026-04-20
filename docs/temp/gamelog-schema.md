# game_logs table schema + sample data

## Columns

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| game_id | uuid | NO | — |
| league_id | uuid | NO | — |
| player_id | uuid | YES | — |
| team_id | uuid | YES | — |
| player_stat_id | uuid | YES | — |
| stat_type | text | NO | — |
| stat_label | text | YES | — |
| stat_points | integer | NO | 0 |
| stat_color | text | YES | — |
| old_value | integer | YES | — |
| new_value | integer | YES | — |
| old_home_score | integer | YES | — |
| old_away_score | integer | YES | — |
| undone | boolean | NO | false |
| clock_time | numeric | YES | — |
| period | integer | YES | — |
| logged_by | text | YES | — |
| device_name | text | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

## Key observations
- `undone = true` means the action was reversed/undone — show strikethrough
- `period` is an integer (1=Q1, 2=Q2, 3=Q3, 4=Q4, 5=OT)
- `clock_time` is seconds remaining in period (numeric)
- `stat_label` is the display label (e.g. "2PT", "TECH", "FOUL") — use this for display
- `stat_type` is the internal key (e.g. "points_2", "technical_fouls", "fouls")
- `logged_by` is email string (not a UUID FK to profiles)
- No `player_name` or `team_name` — must join players and teams tables

## Sample data (5 rows)

```json
[
  { "stat_label": "2PT", "stat_type": "points_2", "old_value": 0, "new_value": 1, "period": 1, "clock_time": 589, "undone": false, "logged_by": "adwin.imperial@gmail.com" },
  { "stat_label": "TECH", "stat_type": "technical_fouls", "old_value": 0, "new_value": 1, "period": 1, "clock_time": 585, "undone": false, "logged_by": "adwin.imperial@gmail.com" },
  { "stat_label": "3PT", "stat_type": "points_3", "old_value": 0, "new_value": 1, "period": 1, "clock_time": 566, "undone": false, "logged_by": "adwin.imperial@gmail.com" },
  { "stat_label": "FOUL", "stat_type": "fouls", "old_value": 0, "new_value": 1, "period": 1, "clock_time": 563, "undone": true, "logged_by": "adwin.imperial@gmail.com" },
  { "stat_label": "FOUL", "stat_type": "fouls", "old_value": 0, "new_value": 1, "period": 1, "clock_time": 542, "undone": true, "logged_by": "adwin.imperial@gmail.com" }
]
```

## RLS status
- RLS: ✅ enabled
- Policies:
  - `game_logs: app_admin full access` — FOR ALL, USING is_app_admin()
  - `game_logs: league_admin and coach can insert` — FOR INSERT
  - `game_logs: league_admin and coach can update` — FOR UPDATE, get_my_league_role = league_admin or coach
  - `game_logs: members can read` — FOR SELECT, get_my_league_role IS NOT NULL

**No new migration needed** — league_admin can already SELECT via the members can read policy.
