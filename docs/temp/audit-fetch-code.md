# ChangeHistory fetch function — current (fixed)

```js
const load = useCallback(async () => {
  if (!leagueId) return;
  setLoading(true);
  let q = supabase
    .from("league_award_settings_audit")
    .select("*, profiles!league_award_settings_audit_changed_by_profiles_fkey(display_name)")
    .eq("league_id", leagueId)
    .order("changed_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (filter !== "all") q = q.eq("award_type", filter);
  const { data, error } = await q;
  if (error) console.error("[ChangeHistory] select error:", error);
  setRows(prev => page === 0 ? (data || []) : [...prev, ...(data || [])]);
  setLoading(false);
}, [leagueId, filter, page]);
```

## What was wrong

| Issue | Detail |
|---|---|
| Wrong column | `profiles(full_name)` — column doesn't exist, should be `display_name` |
| No error check | `const { data }` — error was silently swallowed, data was null |

## Fix applied

- Select changed to `profiles!...(display_name)`
- Render changed to `r.profiles?.display_name`
- `{ data, error }` destructured with `console.error` on failure
