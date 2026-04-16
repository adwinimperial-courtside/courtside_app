# Migration 000017 — league_applications_rls

**File:** `supabase/migrations/20260416000017_league_applications_rls.sql`

## Push output

```
Connecting to remote database...
Applying migration 20260416000017_league_applications_rls.sql...
Finished supabase db push.
```

## Result

✅ Applied successfully. RLS enabled on `league_applications` with 5 policies:

| Policy | Cmd | Who |
|---|---|---|
| applications: user can insert own | INSERT | `user_id = auth.uid()` |
| applications: user can read own | SELECT | `user_id = auth.uid()` |
| applications: app_admin full access | ALL | `is_app_admin()` |
| applications: league_admin can read their league | SELECT | active league_admin membership for that league_id |
| applications: league_admin can update their league | UPDATE | active league_admin membership for that league_id |
