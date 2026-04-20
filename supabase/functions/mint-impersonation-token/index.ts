import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "https://deno.land/x/jose@v5.2.4/index.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const IMPERSONATION_TTL_SECONDS = 900; // 15 minutes

// Decode a JWT payload without verification (we trust Supabase verify_jwt=true
// already validated the signature before this handler runs).
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
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  try {
    // ─── Parse body ────────────────────────────────────────────────────────
    let body: { target_user_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "invalid_json_body" });
    }
    const targetUserId = body?.target_user_id;
    if (!targetUserId || typeof targetUserId !== "string") {
      return jsonResponse(400, { error: "missing_target_user_id" });
    }

    // ─── Extract caller UID from Authorization header ─────────────────────
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(401, { error: "missing_authorization" });
    }
    const callerToken = authHeader.slice(7).trim();
    const callerClaims = decodeJwtPayload(callerToken);
    const callerUid = callerClaims?.sub as string | undefined;
    if (!callerUid) {
      return jsonResponse(401, { error: "invalid_authorization" });
    }

    // ─── Admin client for all privileged lookups/inserts ──────────────────
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ─── 1. Verify caller is app_admin ────────────────────────────────────
    const { data: callerLookup, error: callerErr } = await admin.auth.admin.getUserById(callerUid);
    if (callerErr || !callerLookup?.user) {
      return jsonResponse(403, { error: "caller_not_found" });
    }
    const isAppAdmin = callerLookup.user.user_metadata?.app_admin === true;
    if (!isAppAdmin) {
      return jsonResponse(403, { error: "not_app_admin" });
    }

    // ─── 2. Verify target user exists ─────────────────────────────────────
    const { data: targetLookup, error: targetErr } = await admin.auth.admin.getUserById(targetUserId);
    if (targetErr || !targetLookup?.user) {
      return jsonResponse(404, { error: "target_not_found" });
    }
    const target = targetLookup.user;

    // ─── 3. Mint short-lived JWT ──────────────────────────────────────────
    const now = Math.floor(Date.now() / 1000);
    const exp = now + IMPERSONATION_TTL_SECONDS;

    const jwt = await new SignJWT({
      email: target.email ?? "",
      role: "authenticated",
      app_metadata: target.app_metadata ?? {},
      user_metadata: target.user_metadata ?? {},
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(target.id)
      .setAudience("authenticated")
      .setIssuer(ISSUER)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(new TextEncoder().encode(JWT_SECRET));

    // ─── 4. Log impersonation ─────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;
    const userAgent = req.headers.get("user-agent") ?? null;

    const { data: logRow, error: logErr } = await admin
      .from("impersonation_log")
      .insert({
        admin_user_id: callerUid,
        target_user_id: target.id,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (logErr) {
      console.error("impersonation_log insert failed:", logErr);
      return jsonResponse(500, { error: "log_insert_failed", detail: logErr.message });
    }

    // ─── 5. Respond ───────────────────────────────────────────────────────
    return jsonResponse(200, {
      access_token: jwt,
      target_user: {
        id: target.id,
        email: target.email,
        user_metadata: target.user_metadata ?? {},
      },
      expires_at: new Date(exp * 1000).toISOString(),
      log_id: logRow.id,
    });
  } catch (err) {
    console.error("mint-impersonation-token error:", err);
    return jsonResponse(500, { error: "internal_error", detail: String(err) });
  }
});
