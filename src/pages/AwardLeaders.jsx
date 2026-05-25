import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, ChevronDown, Loader2 } from "lucide-react";
import AwardLeadersComponent from "../components/stats/AwardLeaders";

// ─── Dropdown pill (same pattern as Statistics / Schedule) ────────────────────

function DropdownPill({ label, options, selectedId, onChange, active = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
        style={{
          background: active ? "var(--ct-accent)" : "var(--ct-bg-elevated)",
          color:      active ? "#ffffff"  : "var(--ct-text-secondary)",
          border: "none",
          cursor: "pointer",
          maxWidth: 220,
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-xl p-2 min-w-[220px] z-50"
          style={{
            background: "var(--ct-bg-card)",
            border: "1px solid var(--ct-border)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.6)",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {options.map(opt => {
            const sel = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap block"
                style={{
                  background: "transparent",
                  color: sel ? "var(--ct-accent)" : "var(--ct-text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: sel ? 600 : 400,
                }}
                onMouseEnter={e => {
                  if (!sel) {
                    e.currentTarget.style.background = "var(--ct-bg-elevated)";
                    e.currentTarget.style.color = "var(--ct-text-primary)";
                  }
                }}
                onMouseLeave={e => {
                  if (!sel) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--ct-text-secondary)";
                  }
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwardLeadersPage() {
  const [selectedLeague, setSelectedLeague] = useState(null);

  // 1. Leagues
  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ["leagues", "active"],
    queryFn: () =>
      supabase.from("leagues").select("*").eq("is_active", true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
  });

  // Auto-select first league once loaded
  useEffect(() => {
    if (leagues.length > 0 && !selectedLeague) setSelectedLeague(leagues[0].id);
  }, [leagues, selectedLeague]);

  const leagueSelected = !!selectedLeague;

  // 2. Teams
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", selectedLeague],
    queryFn: () =>
      supabase.from("teams").select("*").eq("league_id", selectedLeague).eq("is_active", true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: leagueSelected,
    staleTime: 0,
  });

  const teamIds = useMemo(() => teams.map(t => t.id), [teams]);

  // 3. Players
  const { data: players = [] } = useQuery({
    queryKey: ["players", teamIds],
    queryFn: () =>
      supabase.from("players").select("*").in("team_id", teamIds)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: teamIds.length > 0,
    staleTime: 0,
  });

  // 4. Games (all final games for the league)
  const { data: games = [] } = useQuery({
    queryKey: ["games", selectedLeague, "final"],
    queryFn: () =>
      supabase.from("games").select("*").eq("league_id", selectedLeague).eq("status", "final")
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: leagueSelected,
    staleTime: 0,
  });

  const gameIds = useMemo(() => games.map(g => g.id), [games]);

  // 5. Player stats
  const { data: allStats = [] } = useQuery({
    queryKey: ["player_stats", gameIds],
    queryFn: () =>
      supabase.from("player_stats").select("*").in("game_id", gameIds)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: gameIds.length > 0,
    staleTime: 0,
  });

  // 6. Award settings
  const { data: leagueAwardSettings = null } = useQuery({
    queryKey: ["league_award_settings", selectedLeague],
    queryFn: () =>
      supabase.from("league_award_settings").select("*").eq("league_id", selectedLeague).maybeSingle()
        .then(({ data, error }) => { if (error) throw error; return data; }),
    enabled: leagueSelected,
    staleTime: 60000,
  });

  const selectedLeagueObj = leagues.find(l => l.id === selectedLeague) || null;
  const currentLeagueName = selectedLeagueObj?.name || "League";

  const leagueOptions = leagues.map(l => ({
    id: l.id,
    label: l.season ? `${l.name} (${l.season})` : l.name,
  }));

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--ct-accent-gold)" }}
          >
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "var(--ct-text-primary)" }}>
              Award Leaders
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: "var(--ct-text-muted)" }}>
              MVP race, DPOY, and Player of the Game
            </p>
          </div>
        </div>

        {/* League pill filter */}
        <div className="mb-4 flex items-center gap-2">
          {leaguesLoading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ct-text-muted)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading leagues…
            </div>
          ) : leagues.length > 0 ? (
            <DropdownPill
              active
              label={currentLeagueName}
              options={leagueOptions}
              selectedId={selectedLeague}
              onChange={setSelectedLeague}
            />
          ) : (
            <span className="text-sm" style={{ color: "var(--ct-text-muted)" }}>No active leagues</span>
          )}
        </div>

        {!leagueSelected ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
          >
            <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--ct-text-muted)" }} />
            <p className="font-medium" style={{ color: "var(--ct-text-secondary)" }}>
              Select a league to view award leaders
            </p>
          </div>
        ) : (
          <AwardLeadersComponent
            league={selectedLeagueObj}
            teams={teams}
            games={games}
            players={players}
            stats={allStats}
            awardSettings={leagueAwardSettings}
          />
        )}
      </div>
    </div>
  );
}
