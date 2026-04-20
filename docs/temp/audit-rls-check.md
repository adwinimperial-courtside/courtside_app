# RLS Policies — `league_award_settings_audit`

Query: `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'league_award_settings_audit';`

| policyname | cmd | qual (USING) | with_check |
|---|---|---|---|
| award_settings_audit: app_admin full access | ALL | `is_app_admin()` | null (inherits USING) |
| award_settings_audit: league_admin insert own | INSERT | null | `league_id IN (SELECT league_id FROM user_league_memberships WHERE user_id = auth.uid() AND role = 'league_admin' AND is_active = true)` |
| award_settings_audit: league_admin select own | SELECT | `league_id IN (...)` | null |

## Conclusion

All three required policies exist and are correctly applied:
- ✅ Migration 20260416000019 was pushed and applied
- ✅ INSERT policy for league_admin has the correct WITH CHECK clause
- ✅ SELECT policy for league_admin exists
- ✅ app_admin FOR ALL covers INSERT (WITH CHECK inherits from USING when not specified)

## Real Remaining Issue

The ChangeHistory SELECT likely fails silently due to the `profiles(full_name)` PostgREST join.

`league_award_settings_audit.changed_by` has a FK to `auth.users(id)` — NOT to `profiles(id)`.
PostgREST cannot auto-resolve `profiles(full_name)` without a direct FK path from `changed_by` to `profiles`.

This would cause the SELECT to return an error, `data` would be null, and ChangeHistory renders empty
(the error is not checked in the component).

Fix: Add FK from `changed_by` to `profiles(id)` (valid since profiles.id = auth.uid()).
