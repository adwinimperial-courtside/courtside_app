# League Users — Schema Findings

## profiles table columns
| column | type | notes |
|---|---|---|
| id | uuid PK | FK auth.users(id) |
| display_name | text | nullable |
| avatar_url | text | nullable |
| timezone | text | default 'UTC' |
| preferred_locale | text | default 'en' |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| user_type | text | added migration 000013, default 'viewer' |

**Missing:** `email`, `last_active` — need to add both

## user_league_memberships table columns
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | FK auth.users(id) |
| league_id | uuid | FK leagues(id) |
| role | text | 'league_admin', 'coach', 'player', 'viewer' |
| is_active | boolean | default true |
| is_billing_admin | boolean | default false |
| invited_by | uuid | nullable FK auth.users(id) |
| joined_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

unique(user_id, league_id)

## RLS on profiles
RLS is DISABLED on profiles — access controlled at application layer. Admins can read all profiles directly.

## Migration plan (000026)
- ADD COLUMN email TEXT to profiles
- ADD COLUMN last_active TIMESTAMPTZ to profiles
- Backfill email from auth.users
- Update handle_new_user() trigger to save email
