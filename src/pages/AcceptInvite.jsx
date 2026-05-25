import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Trophy, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { currentUser, isLoadingAuth } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const ROLE_LABELS = {
    viewer: "Viewer", player: "Player",
    coach: "Coach", league_admin: "League Admin",
  };

  // Fetch invite on mount
  useEffect(() => {
    if (!token) { setError("Invalid invitation link."); setLoading(false); return; }
    supabase
      .from("league_invitations")
      .select("*, league:leagues!league_id(id, name), inviter:profiles!invited_by(display_name, full_name)")
      .eq("token", token)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) { setError("This invitation link is invalid or has already been used."); }
        else if (data.status !== "pending") { setError(`This invitation has already been ${data.status}.`); }
        else if (new Date(data.expires_at) < new Date()) { setError("This invitation has expired."); }
        else { setInvite(data); }
        setLoading(false);
      });
  }, [token]);

  // Once auth loads and invite is valid + user is logged in, auto-process
  useEffect(() => {
    if (!invite || isLoadingAuth || !currentUser || processing || done) return;
    acceptInvite();
  }, [invite, isLoadingAuth, currentUser]);

  async function acceptInvite() {
    if (!invite || !currentUser) return;
    setProcessing(true);
    try {
      // Check not already a member
      const { data: existing } = await supabase
        .from("user_league_memberships")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("league_id", invite.league_id)
        .maybeSingle();

      if (!existing) {
        const { error: memberErr } = await supabase.from("user_league_memberships").insert({
          user_id: currentUser.id,
          league_id: invite.league_id,
          role: invite.role,
          is_active: true,
        });
        if (memberErr) throw memberErr;
      }

      await supabase.from("league_invitations").update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: currentUser.id,
      }).eq("id", invite.id);

      localStorage.removeItem("pendingInviteToken");
      setDone(true);
      toast({ title: `You've joined ${invite.league?.name}!` });
      setTimeout(() => navigate("/Home"), 2000);
    } catch (err) {
      setError(`Failed to accept invitation: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  function handleLoginRedirect() {
    localStorage.setItem("pendingInviteToken", token);
    navigate("/Home");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-[var(--ct-bg-card)] rounded-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 text-center">
          <Trophy className="w-10 h-10 text-white mx-auto mb-2" />
          <h1 className="text-xl font-bold text-white">Courtside by AI</h1>
        </div>

        <div className="p-8 text-center">
          {loading || (invite && !isLoadingAuth && currentUser && !done && !error) ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-[var(--ct-text-secondary)]">{loading ? "Loading invitation…" : "Joining league…"}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3">
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <h2 className="text-lg font-semibold text-[var(--ct-text-primary)]">Invitation Invalid</h2>
              <p className="text-[var(--ct-text-secondary)] text-sm">{error}</p>
              <Button onClick={() => navigate("/Home")} className="mt-2 bg-[var(--ct-bg-card)] hover:bg-[var(--ct-bg-elevated)] text-white">
                Go to App
              </Button>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <h2 className="text-lg font-semibold text-[var(--ct-text-primary)]">You're in!</h2>
              <p className="text-[var(--ct-text-secondary)] text-sm">Redirecting you to the app…</p>
            </div>
          ) : invite ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--ct-text-primary)] mb-1">You're invited!</h2>
                <p className="text-[var(--ct-text-secondary)] text-sm">
                  <span className="font-medium">
                    {invite.inviter?.full_name || invite.inviter?.display_name || "Someone"}
                  </span>{" "}
                  invited you to join
                </p>
                <p className="text-[var(--ct-text-primary)] font-semibold text-base mt-1">{invite.league?.name}</p>
                <p className="text-[var(--ct-text-secondary)] text-sm mt-0.5">
                  as a <span className="font-medium text-orange-600">{ROLE_LABELS[invite.role] ?? invite.role}</span>
                </p>
                <p className="text-[var(--ct-text-muted)] text-xs mt-2">
                  Expires {format(new Date(invite.expires_at), "MMM d, yyyy")}
                </p>
              </div>

              {!isLoadingAuth && !currentUser && (
                <Button
                  onClick={handleLoginRedirect}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Log in or Sign up to Accept
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
