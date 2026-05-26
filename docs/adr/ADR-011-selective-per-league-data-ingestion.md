# ADR-011 — Selective Per-League Data Ingestion

**Date:** 2026-05-26
**Status:** Decided
**Decider:** Win
**Relationship to ADR-009:** ADR-009 documented a full platform migration with cutover. That remains a valid future option but is not the current direction. ADR-011 covers the immediate need: an in-app feature to copy selected leagues from a Base44 backup into the Supabase app, run on demand by Win, while Base44 continues to operate normally.

---

## Context

A 31 MB JSON backup of Base44 data exists, containing 39,329 records across 16 entities. Schema audit and field-level mapping are complete (docs/temp/supabase-schema-dump.md and docs/temp/base44-to-supabase-mapping.md).

Rather than execute the full platform cutover described in ADR-009, Win wants to copy individual leagues into the new Supabase app as they become useful — starting with Fin-Noy Ballers 40up Season 5. Base44 stays live and unchanged. The ingestion mechanism becomes a permanent feature of the new app so future Base44 exports can be imported the same way.

---

## Decision

### 1. Scope — six entities

Per-league import covers exactly these Base44 entities: League, Team, Player, Game, PlayerStats, GameLog.

All other entities are explicitly excluded:

| Excluded | Reason |
|---|---|
| User, UserApplication, UserLeagueIdentity, PendingUserAssignment, LeagueAccessRequest, LeagueSetupRequest | Auth re-bootstrap deferred to a separate decision |
| TacticalBriefing, AIUsageCounter | Features not yet rebuilt in new app |
| LoginEvent, DeletionLog | Operational audit trails, no value in the new app |

### 2. Implementation as in-app admin feature

Not a one-time CLI script. A permanent admin page in the new app:

- Route gated by `app_admin` metadata
- File upload step parses the backup in the browser (no Supabase Storage involvement)
- League picker shows each league's team count, game count, stat count, and whether already imported
- "Import selected league" triggers the Edge Function
- Companion "Delete imported league" action for the test-fix-reimport cycle

### 3. ID strategy

Generate fresh UUIDs for every record. Preserve original Base44 24-character hex IDs in a new `legacy_base44_id TEXT` column (indexed) on every target table.

The `id_mapping` table designed in ADR-009 is created in the Phase A migration and populated by the Edge Function during import. It provides permanent cross-reference between Base44 and Supabase IDs.

### 4. created_by handling

Every imported record's `created_by` FK points at the importing app_admin's `auth.users.id`. The original Base44 email is preserved in a new `legacy_created_by_email TEXT` column for traceability.

### 5. Unmapped fields — legacy_extras JSONB

Every target table gets a new `legacy_extras JSONB NOT NULL DEFAULT '{}'::jsonb` column. Any Base44 field with no native column home is stored under its original field name. No data is lost. 26 fields across 6 entities currently land here — see docs/temp/base44-to-supabase-mapping.md section C1 for the full list and promotion recommendations.

### 6. Field-level transforms (locked in)

The complete transform map is in docs/temp/base44-to-supabase-mapping.md. The decisions this ADR locks in beyond what's already in the mapping doc:

- `game_stage = null` defaults to `'regular'` (was unhandled in the audit; needed for Season 5's 27 null games)
- `game_stage = 'playoff'` maps to `'championship'` with original preserved in `legacy_extras.game_stage_b44`
- Player name split: multi-word names split on the last space; single-word names use `last_name = '-'` as a sentinel for later manual cleanup
- `home_timeouts`/`away_timeouts` int values are stored in `legacy_extras` and the JSONB column receives `'{}'` because of the data model mismatch
- GameLog `stat_type` is translated via the 16-entry map documented in mapping doc section C3
- PlayerStats `points` is computed as `points_2*2 + points_3*3 + free_throws` (Base44 doesn't store the total)
- All other field transforms are as documented in the mapping doc

### 7. Transactional integrity

Every per-league import runs inside a single Postgres transaction. If any row fails, the whole import rolls back. No partial-state results in the database. This is non-negotiable.

### 8. Re-import behavior

The Edge Function rejects re-import of a league already in `id_mapping`. The companion `delete-imported-league` function removes all rows tagged with that league's chain of `legacy_base44_id` values and clears the matching `id_mapping` entries. Together these support the test-fix-reimport workflow.

### 9. File-size architecture

Parse the 31 MB JSON in the browser. Filter to the selected league only (~3-10 MB per typical league). Send to the Edge Function. If the filtered payload exceeds Edge Function body limits, the browser chunks by entity (League+Teams+Players, Games, PlayerStats, GameLog in N-row chunks). Each chunk uses the same server-side import session ID and joins the same transaction.

### 10. Validation per import

Before marking an import complete, the Edge Function verifies:
- Row counts match input (per entity)
- No NULL foreign keys on NOT NULL FK columns
- Sample integrity check: PlayerStats sum points = home_score + away_score for at least one game in the league

The UI displays per-entity count summary, total time, and any warnings.

### 11. First import target

Fin-Noy Ballers 40up Season 5 — 8 teams, 130 players, 37 games, 934 PlayerStats, 3,906 GameLog rows, ~3.14 MB filtered payload. All games status=completed. One game has `exclude_from_awards=true` (maps to dedicated column). Zero games use the other exclusion flags. 27 games have null game_stage (defaulted to `regular`). 11 of 130 players have single-word names (will receive `last_name = '-'` sentinel).

---

## Alternatives Considered

### Full ADR-009 platform migration with cutover

Rejected for now. Win prefers to migrate organically. Base44 continues to serve users; new app gains leagues one at a time. ADR-009 remains valid if Win later decides to execute a hard cutover.

### One-time CLI import script

Rejected. A reusable in-app feature handles future Base44 backups without code changes and gives Win the same workflow every time.

### Convert 24-char hex IDs to UUIDs everywhere with no preservation

Rejected. `legacy_base44_id` provides traceability for support, debugging, and any delta imports. Storage cost is negligible.

### Add schema columns now for every unmapped Base44 field

Rejected. 26 fields across 6 entities is too many to commit to without evidence the new app needs them. `legacy_extras` JSONB provides the safety net; we promote specific fields to real columns as features need them.

---

## Consequences

### Positive
- Zero Base44 risk during ingestion — backup file is the source, Base44 untouched
- Selective per-league imports keep blast radius small per operation
- Reusable feature handles future Base44 backups without code changes
- Atomic transactions eliminate partial-state debugging
- Full traceability via `legacy_base44_id` and `legacy_created_by_email`
- Delete + reimport workflow supports test cycles

### Negative / risks
- 11 of 130 Season 5 players will need manual `last_name` correction post-import
- `legacy_extras` JSONB accumulates fields that are hard to query without indexes; promoting any field later requires a follow-up migration
- The 16-entry `stat_type` translation map is encoded in the Edge Function; if app stat codes change, both sides must update in lockstep
- Subsequent Base44 backups contain re-import attempts of already-imported leagues; users must explicitly delete + reimport
- Win's app_admin user becomes the `created_by` for thousands of imported rows, which may complicate any future audit work that relies on `created_by`

---

## Next artifact

Phase A migration spec — creates the `id_mapping` table per ADR-009's schema, plus the three legacy columns (`legacy_base44_id`, `legacy_created_by_email`, `legacy_extras`) on each of the 6 target tables, with indexes on `legacy_base44_id`.
