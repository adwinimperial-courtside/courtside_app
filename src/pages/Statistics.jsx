import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart3, Filter, Shield, User, Trophy, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt1 = (n) => (n == null ? "0.0" : Number(n).toFixed(1));

function calcPts(s) {
  return (s.points_2 || 0) * 2 + (s.points_3 || 0) * 3 + (s.free_throws || 0);
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortTh({ label, col, sortCol, sortDir, onSort, className = "" }) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`py-3 px-2 text-center font-semibold cursor-pointer select-none whitespace-nowrap ${
        active ? "text-purple-700" : "text-slate-500"
      } ${className}`}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active ? (
          sortDir === "desc" ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )
        ) : (
          <span className="text-slate-300 text-[10px]">↕</span>
        )}
      </span>
    </th>
  );
}

function useSort(defaultCol, defaultDir = "desc") {
  const [sortCol, setSortCol] = useState(defaultCol);
  const [sortDir, setSortDir] = useState(defaultDir);
  const onSort = (col) => {
    if (col === sortCol) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };
  const sortFn = (a, b) => {
    const av = a[sortCol] ?? 0;
    const bv = b[sortCol] ?? 0;
    return sortDir === "desc" ? bv - av : av - bv;
  };
  return { sortCol, sortDir, onSort, sortFn };
}

// ─── Tab 1: Team Stats ────────────────────────────────────────────────────────

function TeamStatsTab({ teams, allStats, selectedTeamId }) {
  const { sortCol, sortDir, onSort, sortFn } = useSort("pts");

  const rows = useMemo(() => {
    const filtered = selectedTeamId === "all" ? teams : teams.filter(t => t.id === selectedTeamId);
    return filtered.map(team => {
      const ts = allStats.filter(s => s.team_id === team.id);
      const gameIds = new Set(ts.map(s => s.game_id));
      const gp = gameIds.size;
      if (gp === 0) return { ...team, gp: 0, pts: 0, reb: 0, ast: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, to: 0 };
      const tot = ts.reduce((a, s) => ({
        pts:  a.pts  + calcPts(s),
        reb:  a.reb  + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0),
        ast:  a.ast  + (s.assists || 0),
        oreb: a.oreb + (s.offensive_rebounds || 0),
        dreb: a.dreb + (s.defensive_rebounds || 0),
        stl:  a.stl  + (s.steals || 0),
        blk:  a.blk  + (s.blocks || 0),
        to:   a.to   + (s.turnovers || 0),
      }), { pts: 0, reb: 0, ast: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, to: 0 });
      return {
        ...team, gp,
        pts:  tot.pts  / gp,
        reb:  tot.reb  / gp,
        ast:  tot.ast  / gp,
        oreb: tot.oreb / gp,
        dreb: tot.dreb / gp,
        stl:  tot.stl  / gp,
        blk:  tot.blk  / gp,
        to:   tot.to   / gp,
      };
    }).filter(t => t.gp > 0).sort(sortFn);
  }, [teams, allStats, selectedTeamId, sortFn]);

  if (rows.length === 0) {
    return <p className="text-slate-500 text-center py-12">No team stats available yet.</p>;
  }

  const thProps = { sortCol, sortDir, onSort };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-slate-900">Team Statistics (Per Game Averages)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="py-3 px-3 text-left font-semibold text-slate-500 whitespace-nowrap">Team</th>
              <SortTh label="GP"   col="gp"   {...thProps} />
              <SortTh label="PTS"  col="pts"  {...thProps} />
              <SortTh label="REB"  col="reb"  {...thProps} />
              <SortTh label="AST"  col="ast"  {...thProps} />
              <SortTh label="OREB" col="oreb" {...thProps} />
              <SortTh label="DREB" col="dreb" {...thProps} />
              <SortTh label="STL"  col="stl"  {...thProps} />
              <SortTh label="BLK"  col="blk"  {...thProps} />
              <SortTh label="TO"   col="to"   {...thProps} />
            </tr>
          </thead>
          <tbody>
            {rows.map(team => (
              <tr key={team.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: team.color || "#3b82f6" }}
                    >
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900 uppercase tracking-wide text-xs">{team.name}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-slate-700">{team.gp}</td>
                <td className="py-3 px-2 text-center font-bold text-purple-700">{fmt1(team.pts)}</td>
                <td className="py-3 px-2 text-center text-slate-700">{fmt1(team.reb)}</td>
                <td className="py-3 px-2 text-center text-slate-700">{fmt1(team.ast)}</td>
                <td className="py-3 px-2 text-center text-slate-700">{fmt1(team.oreb)}</td>
                <td className="py-3 px-2 text-center text-slate-700">{fmt1(team.dreb)}</td>
                <td className="py-3 px-2 text-center text-slate-700">{fmt1(team.stl)}</td>
                <td className="py-3 px-2 text-center text-slate-700">{fmt1(team.blk)}</td>
                <td className="py-3 px-2 text-center text-slate-700">{fmt1(team.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab 2: Player Stats ──────────────────────────────────────────────────────

function PlayerStatsTab({ players, teams, allStats, selectedTeamId, playerSearch }) {
  const { sortCol, sortDir, onSort, sortFn } = useSort("ppg");

  const rows = useMemo(() => {
    const search = playerSearch.trim().toLowerCase();
    let filteredPlayers = selectedTeamId === "all"
      ? players
      : players.filter(p => p.team_id === selectedTeamId);
    if (search) filteredPlayers = filteredPlayers.filter(p =>
      (p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()).toLowerCase().includes(search)
    );

    return filteredPlayers.map(player => {
      const ps = allStats.filter(s => s.player_id === player.id);
      if (ps.length === 0) return null;

      // Group by game, sum per game, then average
      const byGame = {};
      ps.forEach(s => {
        if (!byGame[s.game_id]) byGame[s.game_id] = [];
        byGame[s.game_id].push(s);
      });
      const gp = Object.keys(byGame).length;
      if (gp === 0) return null;

      const gameTotals = Object.values(byGame).map(rows => ({
        pts:  rows.reduce((a, s) => a + calcPts(s), 0),
        pm2:  rows.reduce((a, s) => a + (s.points_2 || 0), 0),
        pm3:  rows.reduce((a, s) => a + (s.points_3 || 0), 0),
        ftm:  rows.reduce((a, s) => a + (s.free_throws || 0), 0),
        oreb: rows.reduce((a, s) => a + (s.offensive_rebounds || 0), 0),
        dreb: rows.reduce((a, s) => a + (s.defensive_rebounds || 0), 0),
        reb:  rows.reduce((a, s) => a + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0),
        ast:  rows.reduce((a, s) => a + (s.assists || 0), 0),
        stl:  rows.reduce((a, s) => a + (s.steals || 0), 0),
        blk:  rows.reduce((a, s) => a + (s.blocks || 0), 0),
        to:   rows.reduce((a, s) => a + (s.turnovers || 0), 0),
        pf:   rows.reduce((a, s) => a + (s.fouls || 0), 0),
      }));
      const sum = key => gameTotals.reduce((a, g) => a + g[key], 0);
      const team = teams.find(t => t.id === player.team_id);

      return {
        ...player,
        team,
        gp,
        ppg:  sum("pts")  / gp,
        pm2:  sum("pm2")  / gp,
        pm3:  sum("pm3")  / gp,
        ftm:  sum("ftm")  / gp,
        oreb: sum("oreb") / gp,
        dreb: sum("dreb") / gp,
        rpg:  sum("reb")  / gp,
        apg:  sum("ast")  / gp,
        stl:  sum("stl")  / gp,
        blk:  sum("blk")  / gp,
        to:   sum("to")   / gp,
        pf:   sum("pf")   / gp,
      };
    }).filter(Boolean).sort(sortFn);
  }, [players, teams, allStats, selectedTeamId, playerSearch, sortFn]);

  if (rows.length === 0) {
    return <p className="text-slate-500 text-center py-12">No player stats available yet.</p>;
  }

  const thProps = { sortCol, sortDir, onSort };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-slate-900">Player Statistics</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="py-3 px-3 text-left font-semibold text-slate-500 whitespace-nowrap">Player</th>
              <th className="py-3 px-2 text-left font-semibold text-slate-500 whitespace-nowrap">Team</th>
              <SortTh label="GP"   col="gp"   {...thProps} />
              <SortTh label="PPG"  col="ppg"  {...thProps} />
              <SortTh label="2PM"  col="pm2"  {...thProps} />
              <SortTh label="3PM"  col="pm3"  {...thProps} />
              <SortTh label="FTM"  col="ftm"  {...thProps} />
              <SortTh label="OREB" col="oreb" {...thProps} />
              <SortTh label="DREB" col="dreb" {...thProps} />
              <SortTh label="RPG"  col="rpg"  {...thProps} />
              <SortTh label="APG"  col="apg"  {...thProps} />
              <SortTh label="STL"  col="stl"  {...thProps} />
              <SortTh label="BLK"  col="blk"  {...thProps} />
              <SortTh label="TO"   col="to"   {...thProps} />
              <SortTh label="PF"   col="pf"   {...thProps} />
            </tr>
          </thead>
          <tbody>
            {rows.map(player => {
              const name = player.name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown";
              return (
                <tr key={player.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: player.team?.color || "#3b82f6" }}
                      >
                        {player.jersey_number ?? "—"}
                      </div>
                      <span className="font-bold text-slate-900 uppercase tracking-wide text-xs whitespace-nowrap">{name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-slate-500 uppercase text-xs font-semibold whitespace-nowrap">
                    {player.team?.short_name || player.team?.name || "—"}
                  </td>
                  <td className="py-3 px-2 text-center text-slate-700">{player.gp}</td>
                  <td className="py-3 px-2 text-center font-bold text-purple-700">{fmt1(player.ppg)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.pm2)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.pm3)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.ftm)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.oreb)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.dreb)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.rpg)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.apg)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.stl)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.blk)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.to)}</td>
                  <td className="py-3 px-2 text-center text-slate-700">{fmt1(player.pf)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab 3: League Leaders ────────────────────────────────────────────────────

const LEADER_CATEGORIES = [
  { key: "ppg",  label: "PPG Leaders",  icon: "🏀" },
  { key: "pm3",  label: "3PM Leaders",  icon: "🎯" },
  { key: "rpg",  label: "RPG Leaders",  icon: "💪" },
  { key: "apg",  label: "APG Leaders",  icon: "🤝" },
  { key: "stl",  label: "SPG Leaders",  icon: "🏆" },
  { key: "blk",  label: "BPG Leaders",  icon: "🚫" },
];

const RANK_STYLE = [
  "bg-yellow-400 text-yellow-900",   // #1 gold
  "bg-slate-300 text-slate-700",     // #2 silver
  "bg-orange-400 text-white",        // #3 bronze
  "bg-slate-200 text-slate-500",     // #4
  "bg-slate-200 text-slate-500",     // #5
];

function LeaderCard({ category, leaderRows }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{category.icon}</span>
        <span className="font-bold text-slate-900 text-sm">{category.label}</span>
      </div>
      {leaderRows.length === 0 ? (
        <p className="text-slate-400 text-xs text-center py-4">No data yet</p>
      ) : (
        <div className="space-y-2">
          {leaderRows.map((row, i) => (
            <div key={row.id} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${RANK_STYLE[i] || RANK_STYLE[4]}`}>
                {i + 1}
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: row.team?.color || "#3b82f6" }}
              >
                {row.jersey_number ?? "—"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs truncate uppercase">{row.playerName}</div>
                <div className="text-slate-400 text-[10px] truncate uppercase">{row.team?.short_name || row.team?.name || "—"}</div>
              </div>
              <span className="font-bold text-purple-700 text-sm flex-shrink-0">{fmt1(row[category.key])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeagueLeadersTab({ players, teams, allStats }) {
  const leaderData = useMemo(() => {
    return players.map(player => {
      const ps = allStats.filter(s => s.player_id === player.id);
      if (ps.length === 0) return null;

      const byGame = {};
      ps.forEach(s => {
        if (!byGame[s.game_id]) byGame[s.game_id] = [];
        byGame[s.game_id].push(s);
      });
      const gp = Object.keys(byGame).length;
      if (gp === 0) return null;

      const gameTotals = Object.values(byGame).map(rows => ({
        pts:  rows.reduce((a, s) => a + calcPts(s), 0),
        pm3:  rows.reduce((a, s) => a + (s.points_3 || 0), 0),
        reb:  rows.reduce((a, s) => a + (s.offensive_rebounds || 0) + (s.defensive_rebounds || 0), 0),
        ast:  rows.reduce((a, s) => a + (s.assists || 0), 0),
        stl:  rows.reduce((a, s) => a + (s.steals || 0), 0),
        blk:  rows.reduce((a, s) => a + (s.blocks || 0), 0),
      }));
      const sum = key => gameTotals.reduce((a, g) => a + g[key], 0);
      const team = teams.find(t => t.id === player.team_id);
      const playerName = player.name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown";

      return {
        ...player, team, gp, playerName,
        ppg: sum("pts") / gp,
        pm3: sum("pm3") / gp,
        rpg: sum("reb") / gp,
        apg: sum("ast") / gp,
        stl: sum("stl") / gp,
        blk: sum("blk") / gp,
      };
    }).filter(Boolean);
  }, [players, teams, allStats]);

  const top5 = (key) => [...leaderData].sort((a, b) => b[key] - a[key]).slice(0, 5);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-slate-900">League Leaders</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {LEADER_CATEGORIES.map(cat => (
          <LeaderCard key={cat.key} category={cat} leaderRows={top5(cat.key)} />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Statistics() {
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [selectedTeamId,   setSelectedTeamId]   = useState("all");
  const [playerSearch,     setPlayerSearch]      = useState("");
  const [activeTab,        setActiveTab]         = useState("team");

  // Debounce player search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(playerSearch), 300);
    return () => clearTimeout(t);
  }, [playerSearch]);

  // 1. Leagues
  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ["leagues", "active"],
    queryFn: () =>
      supabase.from("leagues").select("*").eq("is_active", true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
  });

  // Default to first league
  useEffect(() => {
    if (leagues.length > 0 && !selectedLeagueId) setSelectedLeagueId(leagues[0].id);
  }, [leagues, selectedLeagueId]);

  // 2. Teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["teams", selectedLeagueId],
    queryFn: () =>
      supabase.from("teams").select("*").eq("league_id", selectedLeagueId).eq("is_active", true)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: !!selectedLeagueId,
  });

  const teamIds = useMemo(() => teams.map(t => t.id), [teams]);

  // 3. Players
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ["players", teamIds],
    queryFn: () =>
      supabase.from("players").select("*").in("team_id", teamIds)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: teamIds.length > 0,
  });

  // 4. Completed games
  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ["games", selectedLeagueId, "final"],
    queryFn: () =>
      supabase.from("games").select("*").eq("league_id", selectedLeagueId).eq("status", "final")
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: !!selectedLeagueId,
  });

  const gameIds = useMemo(() => games.map(g => g.id), [games]);

  // 5. Player stats
  const { data: allStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["player_stats", gameIds],
    queryFn: () =>
      supabase.from("player_stats").select("*").in("game_id", gameIds)
        .then(({ data, error }) => { if (error) throw error; return data || []; }),
    enabled: gameIds.length > 0,
  });

  const isLoading = leaguesLoading || teamsLoading || playersLoading || gamesLoading || statsLoading;

  const TABS = [
    { id: "team",    label: "Team Stats" },
    { id: "player",  label: "Player Stats" },
    { id: "leaders", label: "League Leaders" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-12">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900">Statistics</h1>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm pl-1">League, team and player statistics</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-slate-900 text-base">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* League */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">League</label>
              {leaguesLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
              ) : (
                <Select
                  value={selectedLeagueId || ""}
                  onValueChange={v => { setSelectedLeagueId(v); setSelectedTeamId("all"); setPlayerSearch(""); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select league" />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Team */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Team</label>
              <Select
                value={selectedTeamId}
                onValueChange={v => { setSelectedTeamId(v); setPlayerSearch(""); }}
                disabled={!selectedLeagueId || teams.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Player search — only on Player Stats tab */}
            {activeTab === "player" && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Search Player</label>
                <Input
                  type="text"
                  placeholder="Filter by player name…"
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-0 border-b border-slate-100">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : !selectedLeagueId ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-purple-300" />
                </div>
                <p className="text-slate-500 text-sm">Select a league to view statistics.</p>
              </div>
            ) : activeTab === "team" ? (
              <TeamStatsTab
                teams={teams}
                allStats={allStats}
                selectedTeamId={selectedTeamId}
              />
            ) : activeTab === "player" ? (
              <PlayerStatsTab
                players={players}
                teams={teams}
                allStats={allStats}
                selectedTeamId={selectedTeamId}
                playerSearch={debouncedSearch}
              />
            ) : (
              <LeagueLeadersTab
                players={players}
                teams={teams}
                allStats={allStats}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
