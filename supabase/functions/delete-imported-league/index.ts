// =============================================================================
// delete-imported-league — Edge Function (ADR-011)
// =============================================================================
// Companion to import-base44-league. Removes all rows belonging to a previously
// imported Base44 league and clears the matching id_mapping entries.
//
// Auth: caller must be authenticated AND have user_metadata.app_admin === true.
//
// Note on broadcast_state: broadcast_state.game_id has ON DELETE CASCADE
// (see 20260526000001_broadcast_state.sql line 12), so deleting games
// automatically removes the corresponding broadcast_state rows. No explicit
// cleanup needed.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "npm:postgres";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, error: "method_not_allowed" });
  }

  let sql: ReturnType<typeof postgres> | null = null;

  try {
    // ─── Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(401, { success: false, error: "missing_authorization" });
    }
    const callerToken = authHeader.slice(7).trim();
    const claims = decodeJwtPayload(callerToken);
    const callerUid = claims?.sub as string | undefined;
    if (!callerUid) {
      return jsonResponse(401, { success: false, error: "invalid_authorization" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerLookup, error: callerErr } = await admin.auth.admin.getUserById(callerUid);
    if (callerErr || !callerLookup?.user) {
      return jsonResponse(403, { success: false, error: "caller_not_found" });
    }
    const isAppAdmin = callerLookup.user.user_metadata?.app_admin === true;
    if (!isAppAdmin) {
      return jsonResponse(403, { success: false, error: "not_app_admin" });
    }

    // ─── Parse body ──────────────────────────────────────────────────────
    let body: { league_legacy_base44_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { success: false, error: "invalid_json_body" });
    }
    const legacyId = body?.league_legacy_base44_id;
    if (!legacyId || typeof legacyId !== "string") {
      return jsonResponse(400, {
        success: false,
        error: "missing_league_legacy_base44_id",
      });
    }

    // ─── Connect ─────────────────────────────────────────────────────────
    sql = postgres(SUPABASE_DB_URL, { prepare: false });

    // ─── Resolve league supabase_id ──────────────────────────────────────
    const mappingRows = await sql<{ supabase_id: string }[]>`
      SELECT supabase_id FROM id_mapping
      WHERE entity_type = 'league' AND base44_id = ${legacyId}
      LIMIT 1
    `;
    if (mappingRows.length === 0) {
      return jsonResponse(404, {
        success: false,
        error: `no_imported_league_for_base44_id: ${legacyId}`,
      });
    }
    const leagueSupabaseId = mappingRows[0].supabase_id;

    // Sanity check — confirm a league row actually exists.
    const leagueExists = await sql`
      SELECT 1 FROM leagues WHERE id = ${leagueSupabaseId} LIMIT 1
    `;
    if (leagueExists.length === 0) {
      // id_mapping is stale; clean it up to avoid blocking future re-imports.
      await sql`
        DELETE FROM id_mapping
        WHERE entity_type = 'league' AND base44_id = ${legacyId}
      `;
      return jsonResponse(404, {
        success: false,
        error: `id_mapping_orphan: league row missing for ${legacyId}, mapping cleared`,
      });
    }

    // ─── Transactional delete ────────────────────────────────────────────
    const deleted = await sql.begin(async (tx) => {
      // Collect IDs that need id_mapping cleanup BEFORE the cascading deletes.
      const teamIds = (await tx<{ id: string }[]>`
        SELECT id FROM teams WHERE league_id = ${leagueSupabaseId}
      `).map((r) => r.id);
      const playerIds = (await tx<{ id: string }[]>`
        SELECT id FROM players WHERE league_id = ${leagueSupabaseId}
      `).map((r) => r.id);
      const gameIds = (await tx<{ id: string }[]>`
        SELECT id FROM games WHERE league_id = ${leagueSupabaseId}
      `).map((r) => r.id);
      const playerStatIds = (await tx<{ id: string }[]>`
        SELECT id FROM player_stats WHERE league_id = ${leagueSupabaseId}
      `).map((r) => r.id);
      const gameLogIds = (await tx<{ id: string }[]>`
        SELECT id FROM game_logs WHERE league_id = ${leagueSupabaseId}
      `).map((r) => r.id);

      // Delete in reverse dependency order. broadcast_state cascades via FK.
      const gameLogDel = await tx`DELETE FROM game_logs WHERE league_id = ${leagueSupabaseId}`;
      const playerStatDel = await tx`DELETE FROM player_stats WHERE league_id = ${leagueSupabaseId}`;
      const gameDel = await tx`DELETE FROM games WHERE league_id = ${leagueSupabaseId}`;
      const playerDel = await tx`DELETE FROM players WHERE league_id = ${leagueSupabaseId}`;
      const teamDel = await tx`DELETE FROM teams WHERE league_id = ${leagueSupabaseId}`;
      const leagueDel = await tx`DELETE FROM leagues WHERE id = ${leagueSupabaseId}`;

      // Clear id_mapping rows. We delete by (entity_type, supabase_id) tuples,
      // which is more precise than entity_type IN (...) AND supabase_id = ANY(...)
      // because it avoids matching unrelated entries that happen to share a UUID.
      if (gameLogIds.length > 0) {
        await tx`
          DELETE FROM id_mapping
          WHERE entity_type = 'game_log' AND supabase_id = ANY(${gameLogIds}::uuid[])
        `;
      }
      if (playerStatIds.length > 0) {
        await tx`
          DELETE FROM id_mapping
          WHERE entity_type = 'player_stats' AND supabase_id = ANY(${playerStatIds}::uuid[])
        `;
      }
      if (gameIds.length > 0) {
        await tx`
          DELETE FROM id_mapping
          WHERE entity_type = 'game' AND supabase_id = ANY(${gameIds}::uuid[])
        `;
      }
      if (playerIds.length > 0) {
        await tx`
          DELETE FROM id_mapping
          WHERE entity_type = 'player' AND supabase_id = ANY(${playerIds}::uuid[])
        `;
      }
      if (teamIds.length > 0) {
        await tx`
          DELETE FROM id_mapping
          WHERE entity_type = 'team' AND supabase_id = ANY(${teamIds}::uuid[])
        `;
      }
      await tx`
        DELETE FROM id_mapping
        WHERE entity_type = 'league' AND supabase_id = ${leagueSupabaseId}
      `;

      return {
        game_logs: Number(gameLogDel.count ?? 0),
        player_stats: Number(playerStatDel.count ?? 0),
        games: Number(gameDel.count ?? 0),
        players: Number(playerDel.count ?? 0),
        teams: Number(teamDel.count ?? 0),
        leagues: Number(leagueDel.count ?? 0),
        id_mapping_cleared:
          gameLogIds.length + playerStatIds.length + gameIds.length +
          playerIds.length + teamIds.length + 1,
      };
    });

    return jsonResponse(200, {
      success: true,
      league_legacy_base44_id: legacyId,
      league_id: leagueSupabaseId,
      deleted,
    });
  } catch (err) {
    console.error("delete-imported-league error:", err);
    return jsonResponse(500, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      rolled_back: true,
    });
  } finally {
    if (sql) {
      try { await sql.end({ timeout: 5 }); } catch { /* ignore */ }
    }
  }
});
