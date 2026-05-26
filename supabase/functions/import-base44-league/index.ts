// =============================================================================
// import-base44-league — Edge Function (ADR-011)
// =============================================================================
// Imports a single Base44 league (and its teams, players, games, player_stats,
// game_logs) into the Supabase app inside a single atomic transaction.
//
// Auth: caller must be authenticated (verify_jwt = true) AND have
//       user_metadata.app_admin === true.
//
// Re-import protection: if id_mapping already has the league's base44_id,
//       returns 409. Use delete-imported-league to clear before retry.
//
// All FK remapping uses in-memory Maps populated during this transaction.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "npm:postgres";

import {
  slugify,
  splitName,
  remapStatus,
  remapGameStage,
  mapStatType,
  parseTimestamp,
  parseGameDate,
  computePoints,
  coerceIntValue,
} from "./transforms.ts";

import type {
  ImportPayload,
  ImportResult,
  ImportError,
  SupabasePlayerStatsRow,
  SupabaseGameLogRow,
  IdMappingRow,
} from "./types.ts";

// ─── Config ──────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-encoding",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

const GAME_LOGS_CHUNK_SIZE = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - padded.length % 4) % 4));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Decompress gzipped body if Content-Encoding: gzip, else return text as-is.
async function readBodyText(req: Request): Promise<string> {
  const encoding = (req.headers.get("content-encoding") ?? "").toLowerCase();
  if (encoding === "gzip") {
    const stream = req.body?.pipeThrough(new DecompressionStream("gzip"));
    if (!stream) return "";
    return await new Response(stream).text();
  }
  return await req.text();
}

// Validate that the parsed payload has the expected shape.
function validatePayload(p: unknown): p is ImportPayload {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (!o.league || typeof o.league !== "object") return false;
  if (!Array.isArray(o.teams)) return false;
  if (!Array.isArray(o.players)) return false;
  if (!Array.isArray(o.games)) return false;
  if (!Array.isArray(o.player_stats)) return false;
  if (!Array.isArray(o.game_logs)) return false;
  return true;
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" } as ImportError & { error: string });
  }

  const startMs = Date.now();
  let sql: ReturnType<typeof postgres> | null = null;

  try {
    // ─── 1. Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(401, {
        success: false, error: "missing_authorization", rolled_back: false,
      } satisfies ImportError);
    }
    const callerToken = authHeader.slice(7).trim();
    const claims = decodeJwtPayload(callerToken);
    const callerUid = claims?.sub as string | undefined;
    if (!callerUid) {
      return jsonResponse(401, {
        success: false, error: "invalid_authorization", rolled_back: false,
      } satisfies ImportError);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerLookup, error: callerErr } = await admin.auth.admin.getUserById(callerUid);
    if (callerErr || !callerLookup?.user) {
      return jsonResponse(403, {
        success: false, error: "caller_not_found", rolled_back: false,
      } satisfies ImportError);
    }
    const callerUser = callerLookup.user;
    const isAppAdmin = callerUser.user_metadata?.app_admin === true;
    if (!isAppAdmin) {
      return jsonResponse(403, {
        success: false, error: "not_app_admin", rolled_back: false,
      } satisfies ImportError);
    }

    // ─── 2. Parse body ──────────────────────────────────────────────────────
    let payload: ImportPayload;
    try {
      const text = await readBodyText(req);
      const parsed = JSON.parse(text);
      if (!validatePayload(parsed)) {
        return jsonResponse(400, {
          success: false,
          error: "invalid_payload_shape: expected { league, teams[], players[], games[], player_stats[], game_logs[] }",
          rolled_back: false,
        } satisfies ImportError);
      }
      payload = parsed;
    } catch (err) {
      return jsonResponse(400, {
        success: false,
        error: `invalid_json_body: ${String(err)}`,
        rolled_back: false,
      } satisfies ImportError);
    }

    // ─── 3. Connect to Postgres ─────────────────────────────────────────────
    sql = postgres(SUPABASE_DB_URL, { prepare: false });

    // ─── 4. Pre-checks (no transaction yet) ─────────────────────────────────
    // 4a. Already imported?
    const existing = await sql<{ supabase_id: string }[]>`
      SELECT supabase_id FROM id_mapping
      WHERE entity_type = 'league' AND base44_id = ${payload.league.id}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return jsonResponse(409, {
        success: false,
        error: `league_already_imported: base44_id=${payload.league.id} → supabase_id=${existing[0].supabase_id}. Use delete-imported-league first to retry.`,
        rolled_back: false,
      } satisfies ImportError);
    }

    // 4b. Resolve a unique slug
    const baseSlug = slugify(payload.league.name) || "league";
    let candidate = baseSlug;
    let suffix = 2;
    while (true) {
      const hit = await sql`SELECT 1 FROM leagues WHERE slug = ${candidate} LIMIT 1`;
      if (hit.length === 0) break;
      candidate = `${baseSlug}-${suffix}`;
      suffix++;
    }
    const finalSlug = candidate;

    // ─── 5. Transaction ─────────────────────────────────────────────────────
    const adminEmail = callerUser.email ?? null;
    const warnings: string[] = [];

    const counts = await sql.begin(async (tx) => {
      // Local helper: postgres.js's JSONValue type is strictly recursive and
      // rejects Record<string, unknown> at compile time, even though the runtime
      // serializer accepts it. Cast through `never` to satisfy the checker.
      // deno-lint-ignore no-explicit-any
      const j = (v: unknown) => tx.json(v as any);

      // ── Step A: insert league ──────────────────────────────────────────
      const newLeagueId = crypto.randomUUID();
      const leagueExtras: Record<string, unknown> = {};
      if (payload.league.season !== null && payload.league.season !== undefined) {
        leagueExtras.season = payload.league.season;
      }
      if (payload.league.description !== null && payload.league.description !== undefined) {
        leagueExtras.description = payload.league.description;
      }
      if (payload.league.created_by_id) {
        leagueExtras.created_by_id = payload.league.created_by_id;
      }

      const leagueCreatedAt = parseTimestamp(payload.league.created_date) ?? new Date().toISOString();
      const leagueUpdatedAt = parseTimestamp(payload.league.updated_date) ?? leagueCreatedAt;

      await tx`
        INSERT INTO leagues (
          id, name, slug, timezone, sport, is_active, is_sample,
          created_at, updated_at,
          legacy_base44_id, legacy_created_by_email, legacy_extras
        ) VALUES (
          ${newLeagueId},
          ${payload.league.name},
          ${finalSlug},
          'UTC',
          'basketball',
          true,
          ${payload.league.is_sample ?? false},
          ${leagueCreatedAt},
          ${leagueUpdatedAt},
          ${payload.league.id},
          ${payload.league.created_by ?? adminEmail},
          ${j(leagueExtras)}
        )
      `;

      await tx`
        INSERT INTO id_mapping (entity_type, base44_id, supabase_id)
        VALUES ('league', ${payload.league.id}, ${newLeagueId})
      `;

      // ── Step B: insert teams ───────────────────────────────────────────
      const teamMap = new Map<string, string>();   // base44 → uuid
      for (const t of payload.teams) {
        const newId = crypto.randomUUID();
        const extras: Record<string, unknown> = {};
        if (t.wins !== null && t.wins !== undefined) extras.wins = t.wins;
        if (t.losses !== null && t.losses !== undefined) extras.losses = t.losses;
        if (t.team_captain) extras.team_captain = t.team_captain;
        if (t.bracket) extras.bracket = t.bracket;
        if (t.is_sample !== undefined) extras.is_sample = t.is_sample;
        if (t.created_by_id) extras.created_by_id = t.created_by_id;

        const createdAt = parseTimestamp(t.created_date) ?? leagueCreatedAt;
        const updatedAt = parseTimestamp(t.updated_date) ?? createdAt;

        await tx`
          INSERT INTO teams (
            id, league_id, name, color, logo_url, head_coach, manager, is_active,
            created_at, updated_at,
            legacy_base44_id, legacy_created_by_email, legacy_extras
          ) VALUES (
            ${newId},
            ${newLeagueId},
            ${t.name},
            ${t.color ?? null},
            ${t.logo_url ?? null},
            ${t.head_coach ?? null},
            ${t.manager ?? null},
            true,
            ${createdAt},
            ${updatedAt},
            ${t.id},
            ${t.created_by ?? adminEmail},
            ${j(extras)}
          )
        `;
        await tx`
          INSERT INTO id_mapping (entity_type, base44_id, supabase_id)
          VALUES ('team', ${t.id}, ${newId})
        `;
        teamMap.set(t.id, newId);
      }

      // ── Step C: insert players ─────────────────────────────────────────
      const playerMap = new Map<string, string>();
      let sentinelLastNameCount = 0;

      for (const p of payload.players) {
        if (p.team_id && !teamMap.has(p.team_id)) {
          throw new Error(
            `player_${p.id}: team_id ${p.team_id} not found in payload teams`,
          );
        }
        const newId = crypto.randomUUID();
        const { first_name, last_name } = splitName(p.name);
        if (last_name === "-") sentinelLastNameCount++;

        const extras: Record<string, unknown> = {};
        if (p.is_sample !== undefined) extras.is_sample = p.is_sample;
        if (p.created_by_id) extras.created_by_id = p.created_by_id;

        const createdAt = parseTimestamp(p.created_date) ?? leagueCreatedAt;
        const updatedAt = parseTimestamp(p.updated_date) ?? createdAt;
        const teamSupabaseId = p.team_id ? teamMap.get(p.team_id)! : null;

        await tx`
          INSERT INTO players (
            id, league_id, team_id, first_name, last_name,
            jersey_number, position, is_active, is_captain,
            created_at, updated_at,
            legacy_base44_id, legacy_created_by_email, legacy_extras
          ) VALUES (
            ${newId},
            ${newLeagueId},
            ${teamSupabaseId},
            ${first_name},
            ${last_name},
            ${p.jersey_number !== null && p.jersey_number !== undefined ? String(p.jersey_number) : null},
            ${p.position ?? null},
            true,
            false,
            ${createdAt},
            ${updatedAt},
            ${p.id},
            ${p.created_by ?? adminEmail},
            ${j(extras)}
          )
        `;
        await tx`
          INSERT INTO id_mapping (entity_type, base44_id, supabase_id)
          VALUES ('player', ${p.id}, ${newId})
        `;
        playerMap.set(p.id, newId);
      }

      if (sentinelLastNameCount > 0) {
        warnings.push(
          `${sentinelLastNameCount} player(s) had single-word names; last_name set to "-" sentinel for manual cleanup.`,
        );
      }

      // ── Step D: insert games ───────────────────────────────────────────
      const gameMap = new Map<string, string>();
      for (const g of payload.games) {
        const newId = crypto.randomUUID();
        const home = teamMap.get(g.home_team_id);
        const away = teamMap.get(g.away_team_id);
        if (!home || !away) {
          throw new Error(
            `game_${g.id}: home_team_id or away_team_id not found in payload teams`,
          );
        }

        const { stage, originalForExtras: gameStageOriginal } = remapGameStage(g.game_stage);
        const newPlayerOfGame = g.player_of_game ? (playerMap.get(g.player_of_game) ?? null) : null;
        const newDefaultWinner = g.default_winner_team_id ? (teamMap.get(g.default_winner_team_id) ?? null) : null;
        const newDefaultLoser = g.default_loser_team_id ? (teamMap.get(g.default_loser_team_id) ?? null) : null;

        const extras: Record<string, unknown> = {};
        if (g.exclude_from_player_stats !== null && g.exclude_from_player_stats !== undefined) {
          extras.exclude_from_player_stats = g.exclude_from_player_stats;
        }
        if (g.exclude_from_pog !== null && g.exclude_from_pog !== undefined) {
          extras.exclude_from_pog = g.exclude_from_pog;
        }
        if (g.result_type) extras.result_type = g.result_type;
        if (g.result_updated_at) extras.result_updated_at = g.result_updated_at;
        if (g.result_updated_by) extras.result_updated_by = g.result_updated_by;
        if (g.created_by_id) extras.created_by_id = g.created_by_id;
        if (g.is_sample !== undefined) extras.is_sample = g.is_sample;
        if (g.home_timeouts !== null && g.home_timeouts !== undefined) {
          extras.home_timeouts_b44 = g.home_timeouts;
        }
        if (g.away_timeouts !== null && g.away_timeouts !== undefined) {
          extras.away_timeouts_b44 = g.away_timeouts;
        }
        if (gameStageOriginal) extras.game_stage_b44 = gameStageOriginal;

        const createdAt = parseTimestamp(g.created_date) ?? leagueCreatedAt;
        const updatedAt = parseTimestamp(g.updated_date) ?? createdAt;
        const scheduledAt = parseGameDate(g.game_date);

        await tx`
          INSERT INTO games (
            id, league_id, home_team_id, away_team_id,
            scheduled_at, status, home_score, away_score, venue,
            game_stage, exclude_from_awards, is_default_result,
            default_winner_team_id, default_loser_team_id, default_reason,
            game_mode, period_type, period_count, period_minutes, overtime_minutes,
            player_of_game,
            clock_running, clock_started_at, clock_time_left, clock_period,
            period_status, possession,
            home_team_fouls, away_team_fouls, home_timeouts, away_timeouts,
            game_rules, entry_type, edited,
            created_at, updated_at,
            legacy_base44_id, legacy_created_by_email, legacy_extras
          ) VALUES (
            ${newId},
            ${newLeagueId},
            ${home},
            ${away},
            ${scheduledAt},
            ${remapStatus(g.status)},
            ${g.home_score ?? 0},
            ${g.away_score ?? 0},
            ${g.location ?? null},
            ${stage},
            ${g.exclude_from_awards ?? false},
            ${g.is_default_result ?? false},
            ${newDefaultWinner},
            ${newDefaultLoser},
            ${g.default_reason ?? null},
            ${g.game_mode ?? "timed"},
            ${g.period_type ?? null},
            ${g.period_count ?? null},
            ${g.period_minutes ?? null},
            ${g.overtime_minutes ?? null},
            ${newPlayerOfGame},
            ${g.clock_running ?? false},
            ${parseTimestamp(g.clock_started_at)},
            ${g.clock_time_left ?? null},
            ${g.clock_period ?? 1},
            ${g.period_status ?? null},
            ${g.possession ?? null},
            ${j(g.home_team_fouls ?? {})},
            ${j(g.away_team_fouls ?? {})},
            ${j({})},
            ${j({})},
            ${g.game_rules ? j(g.game_rules) : null},
            ${g.entry_type ?? "import"},
            ${g.edited ?? false},
            ${createdAt},
            ${updatedAt},
            ${g.id},
            ${g.created_by ?? adminEmail},
            ${j(extras)}
          )
        `;
        await tx`
          INSERT INTO id_mapping (entity_type, base44_id, supabase_id)
          VALUES ('game', ${g.id}, ${newId})
        `;
        gameMap.set(g.id, newId);
      }

      // ── Step E: bulk insert player_stats ───────────────────────────────
      const statsRows: SupabasePlayerStatsRow[] = [];
      const statsIdMapping: IdMappingRow[] = [];
      for (const s of payload.player_stats) {
        const newGameId = gameMap.get(s.game_id);
        const newPlayerId = playerMap.get(s.player_id);
        const newTeamId = teamMap.get(s.team_id);
        if (!newGameId || !newPlayerId || !newTeamId) {
          throw new Error(
            `player_stats_${s.id}: missing FK remap (game=${!!newGameId}, player=${!!newPlayerId}, team=${!!newTeamId})`,
          );
        }
        const newId = crypto.randomUUID();
        const p2 = s.points_2 ?? 0;
        const p3 = s.points_3 ?? 0;
        const ft = s.free_throws ?? 0;
        const extras: Record<string, unknown> = {};
        if (s.did_play !== null && s.did_play !== undefined) extras.did_play = s.did_play;
        if (s.created_by_id) extras.created_by_id = s.created_by_id;
        if (s.is_sample !== undefined) extras.is_sample = s.is_sample;

        const createdAt = parseTimestamp(s.created_date) ?? leagueCreatedAt;
        const updatedAt = parseTimestamp(s.updated_date) ?? createdAt;

        statsRows.push({
          id: newId,
          league_id: newLeagueId,
          game_id: newGameId,
          player_id: newPlayerId,
          team_id: newTeamId,
          points: computePoints(p2, p3, ft),
          field_goals_made: 0,
          field_goals_attempted: 0,
          three_pointers_made: 0,
          three_pointers_attempted: 0,
          free_throws_made: ft,
          free_throws_attempted: 0,
          offensive_rebounds: s.offensive_rebounds ?? 0,
          defensive_rebounds: s.defensive_rebounds ?? 0,
          assists: s.assists ?? 0,
          steals: s.steals ?? 0,
          blocks: s.blocks ?? 0,
          turnovers: s.turnovers ?? 0,
          fouls: s.fouls ?? 0,
          minutes_played: s.minutes_played ?? null,
          is_starter: s.is_starter ?? false,
          points_2: p2,
          points_3: p3,
          free_throws: ft,
          free_throws_missed: s.free_throws_missed ?? 0,
          technical_fouls: s.technical_fouls ?? 0,
          unsportsmanlike_fouls: s.unsportsmanlike_fouls ?? 0,
          is_active: s.is_active ?? false,
          created_at: createdAt,
          updated_at: updatedAt,
          legacy_base44_id: s.id,
          legacy_created_by_email: s.created_by ?? adminEmail,
          legacy_extras: extras,
        });
        statsIdMapping.push({
          entity_type: "player_stats",
          base44_id: s.id,
          supabase_id: newId,
        });
      }

      if (statsRows.length > 0) {
        const statsColumns = [
          "id", "league_id", "game_id", "player_id", "team_id",
          "points", "field_goals_made", "field_goals_attempted",
          "three_pointers_made", "three_pointers_attempted",
          "free_throws_made", "free_throws_attempted",
          "offensive_rebounds", "defensive_rebounds",
          "assists", "steals", "blocks", "turnovers", "fouls",
          "minutes_played", "is_starter",
          "points_2", "points_3", "free_throws", "free_throws_missed",
          "technical_fouls", "unsportsmanlike_fouls", "is_active",
          "created_at", "updated_at",
          "legacy_base44_id", "legacy_created_by_email", "legacy_extras",
        ] as const;
        // postgres.js handles JSONB columns automatically when value is an object
        // and the destination column is JSONB.
        // deno-lint-ignore no-explicit-any
        await tx`INSERT INTO player_stats ${tx(statsRows as any, ...statsColumns)}`;
        // deno-lint-ignore no-explicit-any
        await tx`INSERT INTO id_mapping ${tx(statsIdMapping as any, "entity_type", "base44_id", "supabase_id")}`;
      }

      // ── Step F: bulk insert game_logs (chunked) ────────────────────────
      const logRows: SupabaseGameLogRow[] = [];
      const logsIdMapping: IdMappingRow[] = [];
      for (const l of payload.game_logs) {
        const newGameId = gameMap.get(l.game_id);
        if (!newGameId) {
          throw new Error(`game_log_${l.id}: game_id ${l.game_id} not found`);
        }
        const newId = crypto.randomUUID();
        const newPlayerId = l.player_id ? (playerMap.get(l.player_id) ?? null) : null;
        const newTeamId = l.team_id ? (teamMap.get(l.team_id) ?? null) : null;
        // player_stat_id remap: only if the original referenced a stat that was actually imported
        let newPlayerStatId: string | null = null;
        if (l.player_stat_id) {
          const found = statsIdMapping.find((m) => m.base44_id === l.player_stat_id);
          newPlayerStatId = found ? found.supabase_id : null;
        }

        const { value: oldVal, raw: oldRaw } = coerceIntValue(l.old_value);
        const { value: newVal, raw: newRaw } = coerceIntValue(l.new_value);

        const extras: Record<string, unknown> = {};
        if (l.created_by_id) extras.created_by_id = l.created_by_id;
        if (l.is_sample !== undefined) extras.is_sample = l.is_sample;
        if (oldRaw !== null) extras.old_value_raw = oldRaw;
        if (newRaw !== null) extras.new_value_raw = newRaw;

        const createdAt = parseTimestamp(l.created_date) ?? leagueCreatedAt;
        const updatedAt = parseTimestamp(l.updated_date) ?? createdAt;

        logRows.push({
          id: newId,
          game_id: newGameId,
          league_id: newLeagueId,
          player_id: newPlayerId,
          team_id: newTeamId,
          player_stat_id: newPlayerStatId,
          stat_type: mapStatType(l.stat_type),
          stat_label: l.stat_label ?? null,
          stat_points: l.stat_points ?? 0,
          stat_color: l.stat_color ?? null,
          old_value: oldVal,
          new_value: newVal,
          old_home_score: l.old_home_score ?? null,
          old_away_score: l.old_away_score ?? null,
          undone: false,
          clock_time: null,
          period: null,
          logged_by: l.logged_by ?? null,
          device_name: l.device_name ?? null,
          created_at: createdAt,
          updated_at: updatedAt,
          legacy_base44_id: l.id,
          legacy_created_by_email: l.created_by ?? adminEmail,
          legacy_extras: extras,
        });
        logsIdMapping.push({
          entity_type: "game_log",
          base44_id: l.id,
          supabase_id: newId,
        });
      }

      const logColumns = [
        "id", "game_id", "league_id", "player_id", "team_id", "player_stat_id",
        "stat_type", "stat_label", "stat_points", "stat_color",
        "old_value", "new_value", "old_home_score", "old_away_score",
        "undone", "clock_time", "period", "logged_by", "device_name",
        "created_at", "updated_at",
        "legacy_base44_id", "legacy_created_by_email", "legacy_extras",
      ] as const;

      for (let i = 0; i < logRows.length; i += GAME_LOGS_CHUNK_SIZE) {
        const chunk = logRows.slice(i, i + GAME_LOGS_CHUNK_SIZE);
        const idChunk = logsIdMapping.slice(i, i + GAME_LOGS_CHUNK_SIZE);
        // deno-lint-ignore no-explicit-any
        await tx`INSERT INTO game_logs ${tx(chunk as any, ...logColumns)}`;
        // deno-lint-ignore no-explicit-any
        await tx`INSERT INTO id_mapping ${tx(idChunk as any, "entity_type", "base44_id", "supabase_id")}`;
      }

      // ── Step G: validation (still inside transaction) ─────────────────
      const [
        leagueCount,
        teamCount,
        playerCount,
        gameCount,
        statsCount,
        logCount,
      ] = await Promise.all([
        tx<{ c: number }[]>`SELECT count(*)::int AS c FROM leagues WHERE id = ${newLeagueId}`,
        tx<{ c: number }[]>`SELECT count(*)::int AS c FROM teams WHERE league_id = ${newLeagueId}`,
        tx<{ c: number }[]>`SELECT count(*)::int AS c FROM players WHERE league_id = ${newLeagueId}`,
        tx<{ c: number }[]>`SELECT count(*)::int AS c FROM games WHERE league_id = ${newLeagueId}`,
        tx<{ c: number }[]>`SELECT count(*)::int AS c FROM player_stats WHERE league_id = ${newLeagueId}`,
        tx<{ c: number }[]>`SELECT count(*)::int AS c FROM game_logs WHERE league_id = ${newLeagueId}`,
      ]);

      const finalCounts = {
        league: leagueCount[0].c,
        teams: teamCount[0].c,
        players: playerCount[0].c,
        games: gameCount[0].c,
        player_stats: statsCount[0].c,
        game_logs: logCount[0].c,
      };

      // Assertions — any mismatch throws to roll back
      if (finalCounts.league !== 1) {
        throw new Error(`validation_failed: league count ${finalCounts.league} ≠ 1`);
      }
      if (finalCounts.teams !== payload.teams.length) {
        throw new Error(
          `validation_failed: teams ${finalCounts.teams} ≠ input ${payload.teams.length}`,
        );
      }
      if (finalCounts.players !== payload.players.length) {
        throw new Error(
          `validation_failed: players ${finalCounts.players} ≠ input ${payload.players.length}`,
        );
      }
      if (finalCounts.games !== payload.games.length) {
        throw new Error(
          `validation_failed: games ${finalCounts.games} ≠ input ${payload.games.length}`,
        );
      }
      if (finalCounts.player_stats !== payload.player_stats.length) {
        throw new Error(
          `validation_failed: player_stats ${finalCounts.player_stats} ≠ input ${payload.player_stats.length}`,
        );
      }
      if (finalCounts.game_logs !== payload.game_logs.length) {
        throw new Error(
          `validation_failed: game_logs ${finalCounts.game_logs} ≠ input ${payload.game_logs.length}`,
        );
      }

      // Sample integrity check: pick first game and reconcile player_stats sums
      if (payload.games.length > 0 && payload.player_stats.length > 0) {
        const firstGame = payload.games[0];
        const firstGameSupabaseId = gameMap.get(firstGame.id)!;
        const sums = await tx<{ team_id: string; total: number }[]>`
          SELECT team_id, SUM(points_2*2 + points_3*3 + free_throws)::int AS total
          FROM player_stats
          WHERE game_id = ${firstGameSupabaseId}
          GROUP BY team_id
        `;
        const homeSupabaseId = teamMap.get(firstGame.home_team_id)!;
        const awaySupabaseId = teamMap.get(firstGame.away_team_id)!;
        const homeTotal = sums.find((r) => r.team_id === homeSupabaseId)?.total ?? 0;
        const awayTotal = sums.find((r) => r.team_id === awaySupabaseId)?.total ?? 0;
        if (homeTotal !== firstGame.home_score) {
          warnings.push(
            `integrity_check: first game home_score=${firstGame.home_score} but player_stats sum=${homeTotal}`,
          );
        }
        if (awayTotal !== firstGame.away_score) {
          warnings.push(
            `integrity_check: first game away_score=${firstGame.away_score} but player_stats sum=${awayTotal}`,
          );
        }
      }

      return { newLeagueId, finalSlug, finalCounts };
    });

    // ─── 6. Success response ────────────────────────────────────────────────
    const result: ImportResult = {
      success: true,
      league_id: counts.newLeagueId,
      legacy_base44_id: payload.league.id,
      slug: counts.finalSlug,
      counts: counts.finalCounts,
      warnings,
      duration_ms: Date.now() - startMs,
    };
    return jsonResponse(200, result);

  } catch (err) {
    console.error("import-base44-league error:", err);
    const message = err instanceof Error ? err.message : String(err);
    // Anything thrown after sql.begin() entered is rolled back automatically.
    const errBody: ImportError = {
      success: false,
      error: message,
      rolled_back: true,
    };
    // Treat shape/validation issues as 400, anything else as 500.
    const status = message.startsWith("validation_failed:") ||
                   message.startsWith("player_") ||
                   message.startsWith("game_") ||
                   message.startsWith("game_log_")
      ? 400
      : 500;
    return jsonResponse(status, errBody);
  } finally {
    if (sql) {
      try { await sql.end({ timeout: 5 }); } catch { /* ignore */ }
    }
  }
});
