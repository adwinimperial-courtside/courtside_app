// =============================================================================
// transforms.ts — Pure transform functions for the Base44 importer
// =============================================================================
// No DB calls, no side effects. Easy to read, easy to test.
//
// Authoritative spec: docs/temp/base44-to-supabase-mapping.md
// =============================================================================

import type { Base44PlayerStats } from "./types.ts";

// ─── slugify ────────────────────────────────────────────────────────────────
// Lowercase, strip non-alphanumerics except hyphens, collapse runs of spaces
// to single hyphens, collapse runs of hyphens, trim leading/trailing hyphens.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")     // drop non-alphanumerics (keep spaces & hyphens)
    .replace(/\s+/g, "-")              // spaces → hyphens
    .replace(/-+/g, "-")               // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");          // trim leading/trailing hyphens
}

// ─── splitName ──────────────────────────────────────────────────────────────
// Multi-word: last token = last_name, everything before = first_name.
// Single-word (or empty after trim): first_name = name, last_name = "-" sentinel.
export function splitName(name: string): { first_name: string; last_name: string } {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return { first_name: "-", last_name: "-" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first_name: trimmed, last_name: "-" };
  }
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return { first_name: first, last_name: last };
}

// ─── remapStatus ────────────────────────────────────────────────────────────
// Base44 → Supabase status CHECK values
//   in_progress → live
//   completed   → final
//   others pass through (scheduled, cancelled, etc.)
export function remapStatus(b44: string): string {
  if (b44 === "in_progress") return "live";
  if (b44 === "completed") return "final";
  return b44;
}

// ─── remapGameStage ─────────────────────────────────────────────────────────
// Base44 → Supabase game_stage CHECK values
//   null/undefined → 'regular'    (default — no extras preservation)
//   playoff        → 'championship' (preserve original in legacy_extras)
//   other          → pass through
export function remapGameStage(
  b44: string | null | undefined,
): { stage: string; originalForExtras: string | null } {
  if (b44 === null || b44 === undefined) {
    return { stage: "regular", originalForExtras: null };
  }
  if (b44 === "playoff") {
    return { stage: "championship", originalForExtras: "playoff" };
  }
  return { stage: b44, originalForExtras: null };
}

// ─── STAT_TYPE_MAP ──────────────────────────────────────────────────────────
// Base44 snake_case → Supabase app uppercase short codes.
// 16 entries per docs/temp/base44-to-supabase-mapping.md section C3 row 10.
export const STAT_TYPE_MAP: Record<string, string> = {
  points_2:               "2PT",
  points_3:               "3PT",
  free_throws:            "FTM",
  free_throws_missed:     "FTX",
  offensive_rebounds:     "OREB",
  defensive_rebounds:     "DREB",
  assists:                "AST",
  steals:                 "STL",
  blocks:                 "BLK",
  turnovers:              "TO",
  fouls:                  "FOUL",
  technical_fouls:        "TECHNICAL",
  unsportsmanlike_fouls:  "UNSPORTSMANLIKE",
  ejection:               "EJECTION",
  substitution:           "SUBSTITUTION",
  timeout:                "TIMEOUT",
};

export function mapStatType(b44: string): string {
  return STAT_TYPE_MAP[b44] ?? (b44 ?? "").toUpperCase();
}

// ─── parseTimestamp ─────────────────────────────────────────────────────────
// Base44 ISO timestamp strings are passed through unchanged when they parse
// cleanly; null/empty input returns null. We use Date constructor to validate
// then return the ISO 8601 form (which is what Postgres timestamptz accepts).
export function parseTimestamp(iso: string | null | undefined): string | null {
  if (iso === null || iso === undefined || iso === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ─── parseGameDate ──────────────────────────────────────────────────────────
// Base44 game_date is YYYY-MM-DD (date-only). Parse as midnight UTC.
// Empty / null returns null (the column is nullable since 20260525000001).
export function parseGameDate(dateStr: string | null | undefined): string | null {
  if (dateStr === null || dateStr === undefined || dateStr === "") return null;
  const iso = `${dateStr}T00:00:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ─── computePoints ──────────────────────────────────────────────────────────
// Base44 doesn't store total points; compute from components.
export function computePoints(p2: number, p3: number, ft: number): number {
  return (p2 || 0) * 2 + (p3 || 0) * 3 + (ft || 0);
}

// ─── coerceIntValue ─────────────────────────────────────────────────────────
// GameLog old_value / new_value are typed `any` in Base44. For substitutions
// they are objects, for stats they are ints. We coerce to int where possible;
// non-coercible values are returned in `raw` for legacy_extras storage.
export function coerceIntValue(
  v: unknown,
): { value: number | null; raw: unknown | null } {
  if (v === null || v === undefined) return { value: null, raw: null };
  if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v)) {
    return { value: v, raw: null };
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return { value: null, raw: null };
    if (/^-?\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10);
      return { value: parsed, raw: null };
    }
  }
  // Non-coercible (object, boolean, non-integer string) → preserve raw
  return { value: null, raw: v };
}

// ─── dedupePlayerStats ──────────────────────────────────────────────────────
/**
 * Deduplicate PlayerStats rows by (game_id, player_id).
 * Base44 sometimes has duplicate stat rows from roster-add workflows where
 * an empty shell is created before the real stats row. We keep the row with
 * the higher computed stat sum (points_2*2 + points_3*3 + free_throws);
 * ties broken by most recent updated_date.
 *
 * GameLog rows referencing dropped PlayerStat IDs naturally fall through
 * to player_stat_id = null via the existing statsIdMapByBase44 lookup, since
 * dropped IDs are not added to the map. The column is nullable so this is safe.
 */
export function dedupePlayerStats(
  stats: Base44PlayerStats[],
): { deduped: Base44PlayerStats[]; droppedIds: string[] } {
  const byKey = new Map<string, Base44PlayerStats>();
  const droppedIds: string[] = [];

  const statSum = (ps: Base44PlayerStats): number =>
    (ps.points_2 ?? 0) * 2 + (ps.points_3 ?? 0) * 3 + (ps.free_throws ?? 0);

  for (const ps of stats) {
    if (!ps.game_id || !ps.player_id) continue; // safety; should already be filtered
    const key = `${ps.game_id}|${ps.player_id}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, ps);
      continue;
    }

    const sumNew = statSum(ps);
    const sumExisting = statSum(existing);
    const newUpdated = ps.updated_date ?? "";
    const existingUpdated = existing.updated_date ?? "";

    const newWins =
      sumNew > sumExisting ||
      (sumNew === sumExisting && newUpdated > existingUpdated);

    if (newWins) {
      droppedIds.push(existing.id);
      byKey.set(key, ps);
    } else {
      droppedIds.push(ps.id);
    }
  }

  return { deduped: Array.from(byKey.values()), droppedIds };
}
