# Migration 000014 — profiles_auto_create
**Date:** 2026-04-16
**File:** supabase/migrations/20260416000014_profiles_auto_create.sql

## Push output

```
Initialising login role...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20260416000014_profiles_auto_create.sql

 [Y/n]
Applying migration 20260416000014_profiles_auto_create.sql...
Finished supabase db push.
```

## Result
✅ Applied successfully.

Creates:
- `public.handle_new_user()` trigger function (SECURITY DEFINER) — inserts a profiles row on every new auth.users insert, defaulting user_type to 'viewer'
- `on_auth_user_created` trigger on `auth.users` AFTER INSERT
