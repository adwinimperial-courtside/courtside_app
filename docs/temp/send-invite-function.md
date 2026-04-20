# send-invite-email edge function

## File: supabase/functions/send-invite-email/index.ts

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Courtside by AI <noreply@courtsidebyai.com>";

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
      console.warn("RESEND_API_KEY not set — invite email not sent");
      return new Response(JSON.stringify({ sent: false, reason: "no_email_service" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ... HTML email template + Resend API call ...
    // Returns { sent: true } on success, throws on Resend error
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

## No auth check in function code

The function has NO explicit `Authorization` header check. The 401 was coming from
Supabase's JWT gateway middleware, not from function code.

## Fix applied

### supabase/functions/send-invite-email/config.toml
```toml
verify_jwt = false
```
(No section header — function-level config format)

### supabase/config.toml (appended)
```toml
[functions.send-invite-email]
verify_jwt = false
```

## Client call (LeagueUsers.jsx line ~70)

Already correct — uses `supabase.functions.invoke()` which auto-sends the session token:
```js
await supabase.functions.invoke("send-invite-email", {
  body: { email, inviterName, leagueName, role, inviteUrl: inviteUrl(token) },
});
```

## Deploy command
```
npx supabase functions deploy send-invite-email
```
The config.toml `verify_jwt = false` is picked up automatically on deploy.
No `--no-verify-jwt` CLI flag needed when config is present.
