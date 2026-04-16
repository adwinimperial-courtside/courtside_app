# Game status debug

## Query 1 — Test game status

```
SELECT id, status, home_score, away_score FROM games WHERE id = 'c1000000-0000-0000-0000-000000000021';
```

| id | status | home_score | away_score |
|----|--------|-----------|-----------|
| c1000000-0000-0000-0000-000000000021 | **live** | 18 | 14 |

⚠️ Test game is `status = 'live'`, not `'final'`. Statistics.jsx and Standings.jsx both filter on `status = 'final'`, so this game's stats will NOT appear in those pages.

---

## Query 2 — Game status counts for league a1000000-0000-0000-0000-000000000001

```
SELECT status, COUNT(*) FROM games WHERE league_id = 'a1000000-0000-0000-0000-000000000001' GROUP BY status;
```

| status | count |
|--------|-------|
| final | 12 |
| scheduled | 8 |
| live | 2 |

✅ 12 final games exist — Statistics and Standings will have data to display once a completed game is selected.

---

## Notes

- The test data game (`c1000000-...0021`) is permanently `live` — it exists for LiveStatTracker testing only.
- Statistics/Standings pages use `status = 'final'` which matches the 12 completed games.
- To verify Statistics is working correctly, check against the 12 final games, not the live test game.
