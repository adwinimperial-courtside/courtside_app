import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, XCircle, AlertCircle, ClipboardList } from "lucide-react";

const ROLE_LABELS = {
  league_admin: "League Admin",
  coach: "Coach",
  player: "Player",
  viewer: "Viewer",
};

// Dark Court role badges — semi-transparent bg + role-coloured text
const ROLE_BADGE = {
  app_admin:    "bg-[rgb(var(--ct-danger-rgb)/0.2)] text-[var(--ct-danger)]",
  league_admin: "bg-[rgb(var(--ct-accent-gold-rgb)/0.2)] text-[var(--ct-accent-gold)]",
  coach:        "bg-[rgb(var(--ct-accent-rgb)/0.2)] text-[var(--ct-accent)]",
  player:       "bg-[rgb(var(--ct-success-rgb)/0.2)] text-[var(--ct-success)]",
  viewer:       "bg-[rgb(var(--ct-text-secondary-rgb)/0.2)] text-[var(--ct-text-secondary)]",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusMessage({ message }) {
  if (!message) return null;
  const isError = message.type === "error";
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-4 py-3 mb-5 text-sm"
      style={{
        background: isError ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
        color:      isError ? "var(--ct-danger)" : "var(--ct-success)",
        border:     isError ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
      }}
    >
      {isError
        ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{message.text}</span>
    </div>
  );
}

function ApplicationCard({ app, onApprove, onReject, processing }) {
  const isLeagueAdmin = app.requested_role === "league_admin";
  const leagueDisplay = isLeagueAdmin
    ? `New League: ${app.league_name || "—"}`
    : app.leagues?.name || "—";

  return (
    <div className="bg-[var(--ct-bg-card)] rounded-xl border border-[var(--ct-border)] p-4 flex flex-col gap-3 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--ct-text-primary)] text-lg truncate">{app.full_name}</p>
          {app.email && <p className="text-sm text-[var(--ct-text-muted)] truncate">{app.email}</p>}
          <span className={`inline-block mt-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 ${ROLE_BADGE[app.requested_role] ?? ROLE_BADGE.viewer}`}>
            {ROLE_LABELS[app.requested_role] ?? app.requested_role}
          </span>
        </div>
        <p className="text-xs text-[var(--ct-text-muted)] shrink-0 whitespace-nowrap">{formatDate(app.created_at)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-[var(--ct-text-secondary)]">League: </span>
          <span className="text-[var(--ct-text-primary)]">{leagueDisplay}</span>
        </div>
        {app.country && (
          <div>
            <span className="text-[var(--ct-text-secondary)]">Country: </span>
            <span className="text-[var(--ct-text-primary)]">{app.country}</span>
          </div>
        )}
        {(app.requested_role === "coach" || app.requested_role === "player") && app.team_name && (
          <div>
            <span className="text-[var(--ct-text-secondary)]">Team: </span>
            <span className="text-[var(--ct-text-primary)]">{app.team_name}</span>
          </div>
        )}
        {app.requested_role === "player" && app.nickname && (
          <div>
            <span className="text-[var(--ct-text-secondary)]">Nickname: </span>
            <span className="text-[var(--ct-text-primary)]">{app.nickname}</span>
          </div>
        )}
        {isLeagueAdmin && app.season_start_date && (
          <div>
            <span className="text-[var(--ct-text-secondary)]">Season start: </span>
            <span className="text-[var(--ct-text-primary)]">{formatDate(app.season_start_date)}</span>
          </div>
        )}
        {isLeagueAdmin && app.num_teams && (
          <div>
            <span className="text-[var(--ct-text-secondary)]">Teams: </span>
            <span className="text-[var(--ct-text-primary)]">{app.num_teams}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onApprove(app)}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          style={{ background: "var(--ct-success)", border: "none", height: 44 }}
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={() => onReject(app)}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          style={{ background: "var(--ct-danger)", border: "none", height: 44 }}
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}

export default function ApplicationReview() {
  const { currentUser, userType, isAppAdmin } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const isAuthorized = isAppAdmin || userType === "league_admin";

  const loadApplications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("league_applications")
      .select("*, leagues(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (!error && data) setApplications(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadApplications();
  }, [isAuthorized, loadApplications]);

  const showMessage = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleApprove = async (app) => {
    setProcessing(true);
    try {
      const now = new Date().toISOString();

      let leagueId = app.league_id;

      // For league_admin: create the league first
      if (app.requested_role === "league_admin") {
        const { data: newLeague, error: leagueErr } = await supabase
          .from("leagues")
          .insert({
            name: app.league_name,
            is_active: true,
            created_at: now,
          })
          .select("id")
          .single();

        if (leagueErr) throw leagueErr;
        leagueId = newLeague.id;
      }

      // Update the application
      const { error: updateErr } = await supabase
        .from("league_applications")
        .update({ status: "approved", reviewed_by: currentUser.id, reviewed_at: now })
        .eq("id", app.id);

      if (updateErr) throw updateErr;

      // Insert membership
      const { error: memberErr } = await supabase
        .from("user_league_memberships")
        .insert({
          user_id: app.user_id,
          league_id: leagueId,
          role: app.requested_role,
          is_active: true,
          joined_at: now,
        });

      if (memberErr) throw memberErr;

      showMessage("success", `Approved ${app.full_name} as ${ROLE_LABELS[app.requested_role] ?? app.requested_role}.`);
      await loadApplications();
    } catch (err) {
      showMessage("error", err.message || "Approval failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (app) => {
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("league_applications")
        .update({ status: "rejected", reviewed_by: currentUser.id, reviewed_at: now })
        .eq("id", app.id);

      if (error) throw error;

      showMessage("success", `Rejected application from ${app.full_name}.`);
      await loadApplications();
    } catch (err) {
      showMessage("error", err.message || "Rejection failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[var(--ct-text-secondary)] text-sm">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-6 h-6" style={{ color: "var(--ct-accent-gold)" }} />
        <h1 className="text-2xl font-bold text-[var(--ct-text-primary)]">Application Review</h1>
      </div>

      <StatusMessage message={statusMessage} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: "var(--ct-border)", borderTopColor: "var(--ct-accent)" }}
          />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--ct-text-muted)" }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No pending applications</p>
        </div>
      ) : (
        <div>
          {applications.map(app => (
            <ApplicationCard
              key={app.id}
              app={app}
              onApprove={handleApprove}
              onReject={handleReject}
              processing={processing}
            />
          ))}
        </div>
      )}
    </div>
  );
}
