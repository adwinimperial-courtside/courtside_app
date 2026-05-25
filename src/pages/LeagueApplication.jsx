import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle } from "lucide-react";

const ROLE_LABELS = {
  league_admin: "League Admin",
  coach: "Coach",
  player: "Player",
  viewer: "Viewer",
};

const VALID_ROLES = Object.keys(ROLE_LABELS);

function Field({ label, helper, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--ct-text-primary)]">{label}</label>
      {children}
      {helper && <p className="text-xs text-[var(--ct-text-secondary)]">{helper}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--ct-border)] px-3 py-2 text-sm text-[var(--ct-text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent";

function LeagueCheckboxList({ leagues, selectedLeagueIds, onChange }) {
  const toggle = (id) => {
    onChange(
      selectedLeagueIds.includes(id)
        ? selectedLeagueIds.filter(x => x !== id)
        : [...selectedLeagueIds, id]
    );
  };

  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--ct-border)] divide-y divide-[var(--ct-border)]">
      {leagues.length === 0 && (
        <p className="text-sm text-[var(--ct-text-muted)] px-3 py-2">Loading leagues…</p>
      )}
      {leagues.map(l => (
        <label key={l.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-orange-50">
          <input
            type="checkbox"
            checked={selectedLeagueIds.includes(l.id)}
            onChange={() => toggle(l.id)}
            className="accent-orange-500 w-4 h-4 shrink-0"
          />
          <span className="text-sm text-[var(--ct-text-primary)]">{l.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function LeagueApplication() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const role = searchParams.get("role");

  useEffect(() => {
    if (!role || !VALID_ROLES.includes(role)) {
      navigate("/RoleSelection", { replace: true });
    }
  }, [role, navigate]);

  const [leagues, setLeagues] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [selectedLeagueIds, setSelectedLeagueIds] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [nickname, setNickname] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [seasonStartDate, setSeasonStartDate] = useState("");
  const [numTeams, setNumTeams] = useState("");
  const [avgPlayersPerTeam, setAvgPlayersPerTeam] = useState("");

  // Load leagues for coach/player/viewer
  useEffect(() => {
    if (!["coach", "player", "viewer"].includes(role)) return;
    supabase
      .from("leagues")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setLeagues(data);
      });
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate league selection for multi-select roles
    if (["coach", "player", "viewer"].includes(role) && selectedLeagueIds.length === 0) {
      setError("Please select at least one league.");
      return;
    }

    setSubmitting(true);

    try {
      if (role === "league_admin") {
        const row = {
          user_id: currentUser.id,
          requested_role: role,
          status: "pending",
          full_name: fullName,
          country: country || null,
          league_name: leagueName,
          season_start_date: seasonStartDate || null,
          num_teams: numTeams ? parseInt(numTeams, 10) : null,
          avg_players_per_team: avgPlayersPerTeam ? parseInt(avgPlayersPerTeam, 10) : null,
        };

        const { error: insertError } = await supabase
          .from("league_applications")
          .insert(row);

        if (insertError) throw insertError;

      } else {
        // Insert one row per selected league
        for (const leagueId of selectedLeagueIds) {
          const row = {
            user_id: currentUser.id,
            requested_role: role,
            status: "pending",
            full_name: fullName,
            country: country || null,
            league_id: leagueId,
          };

          if (role === "coach") {
            row.team_name = teamName;
          }

          if (role === "player") {
            row.nickname = nickname || null;
            row.team_name = teamName;
          }

          const { error: insertError } = await supabase
            .from("league_applications")
            .insert(row);

          if (insertError) throw insertError;
        }
      }

      navigate("/PendingApproval", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!role || !VALID_ROLES.includes(role)) return null;

  return (
    <div className="min-h-screen bg-[var(--ct-bg-page)] flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/images/courtside-logo.png" alt="Courtside by AI" className="h-16 w-auto" />
        </div>

        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate("/RoleSelection")}
          className="text-sm text-[var(--ct-text-secondary)] hover:text-[var(--ct-text-primary)] mb-6 flex items-center gap-1"
        >
          ← Back to role selection
        </button>

        {/* Card */}
        <div className="bg-[var(--ct-bg-card)] rounded-2xl border border-[var(--ct-border)] p-8">
          <h1 className="text-xl font-bold text-[var(--ct-text-primary)] mb-1">
            Apply as {ROLE_LABELS[role]}
          </h1>
          <p className="text-sm text-[var(--ct-text-secondary)] mb-6">
            Fill in the details below and an admin will review your request.
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── LEAGUE ADMIN ── */}
            {role === "league_admin" && (
              <>
                <Field label="Full Name">
                  <input type="text" required placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Country">
                  <input type="text" required placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
                </Field>
                <Field label="League Name">
                  <input type="text" required placeholder="Name of the league you want to create" value={leagueName} onChange={e => setLeagueName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Season Start Date">
                  <input type="date" required value={seasonStartDate} onChange={e => setSeasonStartDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Number of Teams">
                  <input type="number" required min={2} placeholder="e.g. 8" value={numTeams} onChange={e => setNumTeams(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Avg Players per Team">
                  <input type="number" required min={1} placeholder="e.g. 10" value={avgPlayersPerTeam} onChange={e => setAvgPlayersPerTeam(e.target.value)} className={inputCls} />
                </Field>
              </>
            )}

            {/* ── COACH ── */}
            {role === "coach" && (
              <>
                <Field label="Full Name">
                  <input type="text" required placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Country">
                  <input type="text" required placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Select Leagues" helper="Select all leagues you want to apply to">
                  <LeagueCheckboxList leagues={leagues} selectedLeagueIds={selectedLeagueIds} onChange={setSelectedLeagueIds} />
                </Field>
                <Field label="Team Name">
                  <input type="text" required placeholder="Your team name within the selected league" value={teamName} onChange={e => setTeamName(e.target.value)} className={inputCls} />
                </Field>
              </>
            )}

            {/* ── PLAYER ── */}
            {role === "player" && (
              <>
                <Field label="Player Display Name" helper="This is how your name will appear in stats, standings, and awards">
                  <input type="text" required placeholder="Display name" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Nickname / Handle">
                  <input type="text" placeholder="Optional" value={nickname} onChange={e => setNickname(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Country">
                  <input type="text" required placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Select Leagues" helper="Select all leagues you want to apply to">
                  <LeagueCheckboxList leagues={leagues} selectedLeagueIds={selectedLeagueIds} onChange={setSelectedLeagueIds} />
                </Field>
                <Field label="Team Name">
                  <input type="text" required placeholder="Your team name within the selected league" value={teamName} onChange={e => setTeamName(e.target.value)} className={inputCls} />
                </Field>
              </>
            )}

            {/* ── VIEWER ── */}
            {role === "viewer" && (
              <>
                <Field label="Full Name">
                  <input type="text" required placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Country">
                  <input type="text" required placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Select Leagues" helper="Select all leagues you want to apply to">
                  <LeagueCheckboxList leagues={leagues} selectedLeagueIds={selectedLeagueIds} onChange={setSelectedLeagueIds} />
                </Field>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {submitting ? "Submitting…" : "Submit Application"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
