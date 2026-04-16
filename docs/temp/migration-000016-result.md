# Migration 000016 — leagues_public_read

**File:** `supabase/migrations/20260416000016_leagues_public_read.sql`

**Content:**
```sql
CREATE POLICY "leagues: anyone can read active leagues"
ON public.leagues
FOR SELECT
USING (is_active = true);
```

## Push output

```
Connecting to remote database...
Applying migration 20260416000016_leagues_public_read.sql...
Finished supabase db push.
```

## Result

✅ Applied successfully. Any authenticated or anonymous user can now SELECT rows from `leagues` where `is_active = true`. The existing `leagues: members can read` policy (which gates on `get_my_league_role(id) IS NOT NULL`) remains in place — these policies are additive (OR'd together by Postgres RLS).
