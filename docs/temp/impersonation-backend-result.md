# Impersonation Backend — Result

## Step 1: Migration

**File created:** `supabase/migrations/20260420000001_create_impersonation_log.sql`

> **Naming deviation from spec.** The prompt said `000028_create_impersonation_log.sql`, but the repo already uses the long-form `YYYYMMDDNNNNNN_name.sql` convention and the suffix `000028` is already taken by **two** existing migrations (`20260416000028_league_invitations.sql` and `20260419000028_whiteboard_plays.sql`). Using today's date (2026-04-20) preserves sort order and avoids collision. SQL body is identical to the spec.

**Apply result:**
```
Connecting to remote database...
Applying migration 20260420000001_create_impersonation_log.sql...
Finished supabase db push.
```

Table `impersonation_log` created on project `bikjkoyodkduhnnlbzpb` with RLS policies for insert/select/update restricted to app_admin (via `raw_user_meta_data->>'app_admin' = 'true'`).

## Step 2: Edge Function

**Files created:**
- `supabase/functions/mint-impersonation-token/config.toml` → `verify_jwt = true`
- `supabase/functions/mint-impersonation-token/index.ts`

**Implementation notes:**
- Uses `jose@v5.2.4` from `deno.land/x` for HS256 JWT signing with the `JWT_SECRET` env var (auto-injected by Supabase).
- Admin client built from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- Caller's UID decoded from the Authorization header (signature already validated by Supabase since `verify_jwt = true`). Logic then calls `auth.admin.getUserById` to read `user_metadata.app_admin`.
- Target user validated via `auth.admin.getUserById`; 404 if not found.
- Minted JWT claims: `sub`, `email`, `role: "authenticated"`, `aud: "authenticated"`, `iss: {SUPABASE_URL}/auth/v1`, `iat`, `exp = iat + 900`, plus copied `user_metadata` and `app_metadata` so downstream RLS policies that read metadata work correctly.
- Impersonation logged with `ip_address` (from `x-forwarded-for` first entry, falling back to `x-real-ip`) and `user_agent`.
- Response shape: `{ access_token, target_user: { id, email, user_metadata }, expires_at (ISO), log_id }`.
- CORS: preflight + `Access-Control-Allow-Origin: *` on every JSON response (tighter than the send-invite-email pattern, which only sets CORS on preflight — the invite function works because POST responses aren't read from the browser JS; this one will be, so CORS on all responses is required).
- Error codes:
  - 400 `missing_target_user_id` / `invalid_json_body`
  - 401 `missing_authorization` / `invalid_authorization`
  - 403 `caller_not_found` / `not_app_admin`
  - 404 `target_not_found`
  - 405 `method_not_allowed`
  - 500 `log_insert_failed` / `internal_error`

**Deploy result:**
```
WARNING: Docker is not running
Uploading asset (mint-impersonation-token): supabase/functions/mint-impersonation-token/index.ts
Deployed Functions on project bikjkoyodkduhnnlbzpb: mint-impersonation-token
```

Docker warning is safe — Supabase CLI deploys successfully without local Docker; it's only needed for `supabase start` / `supabase functions serve` (local emulation).

Dashboard: https://supabase.com/dashboard/project/bikjkoyodkduhnnlbzpb/functions

## Issues encountered
- **Migration filename collision** — resolved by following the repo's existing timestamp convention (see note above).
- **No Docker running** — non-blocking warning; cloud deploy succeeded without it.

## Ready for next step
Backend is live. A React client can now `supabase.functions.invoke("mint-impersonation-token", { body: { target_user_id } })` with an admin JWT and use the returned `access_token` to switch sessions.
