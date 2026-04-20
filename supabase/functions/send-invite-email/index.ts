import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Courtside by AI <onboarding@resend.dev>";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { email, inviterName, leagueName, role, inviteUrl } = await req.json();

    if (!RESEND_API_KEY) {
      // No email service configured — return success so the invite record is still created
      console.warn("RESEND_API_KEY not set — invite email not sent");
      return new Response(JSON.stringify({ sent: false, reason: "no_email_service" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const roleLabel: Record<string, string> = {
      viewer: "Viewer",
      player: "Player",
      coach: "Coach",
      league_admin: "League Admin",
    };

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Courtside by AI</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Basketball League Management</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;font-size:16px;margin:0 0 16px;">Hi there,</p>
      <p style="color:#334155;font-size:15px;margin:0 0 24px;">
        <strong>${inviterName}</strong> has invited you to join
        <strong>${leagueName}</strong> as a <strong>${roleLabel[role] ?? role}</strong>.
      </p>
      <p style="color:#64748b;font-size:14px;margin:0 0 32px;">
        Courtside by AI is a basketball league management platform for real-time stats, standings, and analytics.
      </p>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${inviteUrl}"
           style="display:inline-block;background:#ea580c;color:#fff;font-weight:600;font-size:15px;
                  padding:14px 32px;border-radius:8px;text-decoration:none;">
          Accept Invitation
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">This invitation expires in 7 days.</p>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
    <div style="border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Courtside by AI &mdash; Built for real leagues</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `You're invited to join ${leagueName} on Courtside by AI`,
        html,
      }),
    });

    console.log("Resend response status:", res.status);
    const responseBody = await res.text();
    console.log("Resend response body:", responseBody);

    if (!res.ok) {
      throw new Error(`Resend error: ${responseBody}`);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
