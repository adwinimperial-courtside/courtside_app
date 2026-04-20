import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, CheckCircle, AlertCircle } from "lucide-react";

const ROLE_LABELS = {
  player: "Player",
  coach: "Coach",
  viewer: "Viewer",
  league_admin: "League Admin",
};

const ROLE_DESCRIPTIONS = {
  player: "Play in a league and track your personal stats.",
  coach: "Access team insights and performance data for your team.",
  viewer: "View standings, stats, and schedules.",
  league_admin: "Manage an existing league you are the organizer of.",
};

export default function ApplyForLeague() {
  const { currentUser, userProfile, userType, isAppAdmin } = useAuth();
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedLeagueIds, setSelectedLeagueIds] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const { data: leagues = [] } = useQuery({
    queryKey: ["leagues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leagues").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser,
  });

  // Current league memberships — substitute for assigned_league_ids
  const { data: myMemberships = [] } = useQuery({
    queryKey: ["myMemberships", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_league_memberships")
        .select("league_id")
        .eq("user_id", currentUser.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const assignedLeagueIds = myMemberships.map(m => m.league_id);
  const availableLeagues = leagues.filter(l => !assignedLeagueIds.includes(l.id));
  const teamsInSelectedLeague = teams.filter(t => t.league_id === selectedLeagueId);

  const toggleLeagueId = (id) => {
    setSelectedLeagueIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError("");
    if (!selectedRole) { setError("Please select a role."); return; }

    if (selectedRole === "player") {
      if (!selectedLeagueId) { setError("Please select a league."); return; }
      if (!selectedTeamId) { setError("Please select a team."); return; }
    } else {
      if (selectedLeagueIds.length === 0) { setError("Please select at least one league."); return; }
    }

    setSubmitting(true);
    try {
      const targetLeagueId = selectedRole === "player" ? selectedLeagueId : selectedLeagueIds[0];
      const payload = {
        user_id: currentUser.id,
        email: currentUser.email,
        full_name: userProfile?.full_name || null,
        requested_role: selectedRole,
        league_id: targetLeagueId,
        status: "pending",
      };

      const { error: insertError } = await supabase
        .from("user_applications")
        .insert(payload);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["myAdditionalRequests", currentUser?.id] });
      setSuccess(true);
      setSelectedRole("");
      setSelectedLeagueIds([]);
      setSelectedLeagueId("");
      setSelectedTeamId("");
    } catch (e) {
      setError("Failed to submit request: " + (e.message || "unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAppAdmin || userType === "app_admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">App administrators manage league access directly from User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Request League Access</h1>
            <p className="text-slate-500 text-sm">Apply to join additional leagues with a specific role.</p>
          </div>
        </div>

        {assignedLeagueIds.length > 0 && (
          <Card className="border-slate-200 mb-5 bg-white">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Current Access</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                  Role: {ROLE_LABELS[userType] || userType}
                </Badge>
                {assignedLeagueIds.map(id => {
                  const l = leagues.find(lg => lg.id === id);
                  return l ? (
                    <Badge key={id} className="bg-orange-50 text-orange-700 border border-orange-200">
                      {l.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Request submitted!</p>
              <p className="text-sm text-green-700">The app administrator will review your request and you'll gain access once approved.</p>
            </div>
          </div>
        )}

        {availableLeagues.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-900 mb-1">You have access to all available leagues.</p>
              <p className="text-sm text-slate-500">There are no additional leagues to apply for right now.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">New League Access Request</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">What role are you applying for?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {["player", "coach", "viewer", "league_admin"].map(role => (
                    <button
                      key={role}
                      onClick={() => { setSelectedRole(role); setSelectedLeagueIds([]); setSelectedLeagueId(""); setSelectedTeamId(""); }}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedRole === role
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="font-semibold text-slate-900 text-sm">{ROLE_LABELS[role]}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedRole && selectedRole !== "player" && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Select league(s)</label>
                  <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    {availableLeagues.map(l => (
                      <label key={l.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLeagueIds.includes(l.id)}
                          onChange={() => toggleLeagueId(l.id)}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <span className="text-sm text-slate-800 font-medium">{l.name}</span>
                        <span className="text-xs text-slate-400">({l.season})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selectedRole === "player" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Select league</label>
                    <Select value={selectedLeagueId} onValueChange={v => { setSelectedLeagueId(v); setSelectedTeamId(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a league…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLeagues.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name} — {l.season}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedLeagueId && (
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Select team</label>
                      {teamsInSelectedLeague.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No teams found in this league.</p>
                      ) : (
                        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a team…" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamsInSelectedLeague.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                Your request will be reviewed by the app administrator. You'll gain access once approved.
              </p>
            </CardContent>
          </Card>
        )}

        <PendingRequests currentUser={currentUser} leagues={leagues} />
      </div>
    </div>
  );
}

function PendingRequests({ currentUser, leagues }) {
  const { data: myApps = [] } = useQuery({
    queryKey: ["myAdditionalRequests", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_applications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  if (myApps.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Previous Requests</p>
      <div className="space-y-2">
        {myApps.map(app => {
          const leagueName = leagues.find(l => l.id === app.league_id)?.name || "—";
          const statusColor = app.status === "approved" ? "bg-green-100 text-green-800" : app.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";
          return (
            <div key={app.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{ROLE_LABELS[app.requested_role] || app.requested_role} — {leagueName}</p>
                <p className="text-xs text-slate-400">{app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}</p>
              </div>
              <Badge className={`${statusColor} text-xs flex-shrink-0`}>{app.status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
