# supabase/config.toml — full contents
**Date:** 2026-04-16

```toml
project_id = "courtside-by-ai"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[api.tls]
enabled = false

[db]
port = 54322
shadow_port = 54320
health_timeout = "2m"
major_version = 17

[db.pooler]
enabled = false
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100

[db.migrations]
enabled = true
schema_paths = []

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]

[db.network_restrictions]
enabled = false
allowed_cidrs = ["0.0.0.0/0"]
allowed_cidrs_v6 = ["::/0"]

[realtime]
enabled = true

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"
openai_api_key = "env(OPENAI_API_KEY)"

[inbucket]
enabled = true
port = 54324

[storage]
enabled = true
file_size_limit = "50MiB"

[storage.s3_protocol]
enabled = true

[storage.analytics]
enabled = false

[storage.vector]
enabled = false

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true
enable_anonymous_sign_ins = false
enable_manual_linking = false
minimum_password_length = 6
password_requirements = ""

[auth.rate_limit]
email_sent = 2
sms_sent = 30
anonymous_users = 30
token_refresh = 150
sign_in_sign_ups = 30
token_verifications = 30
web3 = 30

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false   # ← email confirmation NOT required on local
secure_password_change = false
max_frequency = "1s"
otp_length = 6
otp_expiry = 3600

[auth.sms]
enable_signup = false
enable_confirmations = false

[auth.mfa]
max_enrolled_factors = 10

[auth.mfa.totp]
enroll_enabled = false
verify_enabled = false

[auth.mfa.phone]
enroll_enabled = false
verify_enabled = false

# All OAuth providers disabled
[auth.external.apple]
enabled = false
# ... (google, github, etc all disabled)

[edge_runtime]
enabled = true
policy = "per_worker"
inspector_port = 8083
deno_version = 2

[analytics]
enabled = true
port = 54327
backend = "postgres"
```

---

## Key findings for auth flow

| Setting | Value | Implication |
|---------|-------|-------------|
| `site_url` | `http://127.0.0.1:3000` | Local dev only — production URL must be set in Supabase Dashboard |
| `additional_redirect_urls` | `["https://127.0.0.1:3000"]` | Only localhost allowed — needs production URL added before deploy |
| `enable_confirmations` | `false` | Email confirmation **not required** locally — users can sign in immediately after registration |
| `enable_signup` | `true` | New registrations allowed |
| `minimum_password_length` | `6` | Minimum 6 chars |
| `jwt_expiry` | `3600` | Sessions expire after 1 hour (refresh token rotation enabled) |

## ⚠️ Before production deployment
1. Set `site_url` to `https://courtside-by-ai.com` (or production URL) in Supabase Dashboard → Auth → URL Configuration
2. Add production URL to `additional_redirect_urls`
3. Consider enabling `enable_confirmations = true` for production to prevent spam accounts
4. The email confirmation message in `LoginPage.jsx` says "Check your email to confirm" — but locally this is not enforced (`enable_confirmations = false`), so users can sign in immediately
