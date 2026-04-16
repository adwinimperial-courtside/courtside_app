# Auth debug — users and applications
**Date:** 2026-04-16

---

## Query 1: auth.users

```sql
SELECT id, email, confirmed_at, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;
```

| id | email | confirmed_at | created_at |
|----|-------|-------------|------------|
| 425cb41e-6d1f-405f-b871-9b306b9f3c1a | adwin.imperial@gmail.com | 2026-04-15 12:48:01 UTC | 2026-04-15 12:48:01 UTC |

**1 user total.** Email confirmed.

---

## Query 2: league_applications

```sql
SELECT id, user_id, requested_role, status, created_at FROM league_applications ORDER BY created_at DESC LIMIT 5;
```

**(0 rows — table is empty)**

---

## Summary

- Only one registered user: `adwin.imperial@gmail.com` — confirmed, has an active `league_admin` membership
- No league applications submitted yet — the new application flow hasn't been used yet
- Registration flow (`LoginPage` → `handle_new_user` trigger → `profiles`) will fire for any new users who sign up going forward
