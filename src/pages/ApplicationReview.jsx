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

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusMessage({ message }) {
  if (!message) return null;
  const isError = message.type === "error";
  return (
    <div className={`flex items-start gap-2 rounded-lg px-4 py-3 mb-5 text-sm border ${isError ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900 text-base">{app.full_name}</p>
          <span className="inline-block mt-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full px-2.5 py-0.5">
            {ROLE_LABELS[app.requested_role] ?? app.requested_role}
          </span>
        </div>
        <p className="text-xs text-slate-400 shrink-0">{formatDate(app.created_at)}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-slate-500">League: </span>
          <span className="text-slate-800">{leagueDisplay}</span>
        </div>
        {app.country && (
          <div>
            <span className="text-slate-500">Country: </span>
            <span className="text-slate-800">{app.country}</span>
          </div>
        )}
        {(app.requested_role === "coach" || app.requested_role === "player") && app.team_name && (
          <div>
            <span className="text-slate-500">Team: </span>
            <span className="text-slate-800">{app.team_name}</span>
          </div>
        )}
        {app.requested_role === "player" && app.nickname && (
          <div>
            <span className="text-slate-500">Nickname: </span>
            <span className="text-slate-800">{app.nickname}</span>
          </div>
        )}
        {isLeagueAdmin && app.season_start_date && (
          <div>
            <span className="text-slate-500">Season start: </span>
            <span className="text-slate-800">{formatDate(app.season_start_date)}</span>
          </div>
        )}
        {isLeagueAdmin && app.num_teams && (
          <div>
            <span className="text-slate-500">Teams: </span>
            <span className="text-slate-800">{app.num_teams}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onApprove(app)}
          disabled={processing}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={() => onReject(app)}
          disabled={processing}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
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
        <p className="text-slate-500 text-sm">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-slate-900">Application Review</h1>
      </div>

      <StatusMessage message={statusMessage} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No pending applications</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
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
