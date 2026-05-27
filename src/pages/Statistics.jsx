import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";
import { totalPoints as calcPts } from "@/lib/playerStats";
import {
  BarChart3, Shield, User, Trophy, ChevronUp, ChevronDown, Loader2, Search,
} from "lucide-react";
import DropdownPill from "@/components/ui/DropdownPill";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt1 = (n) => (n == null ? "0.0" : Number(n).toFixed(1));

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
  return { sortCol, sortDir, onSort, setSortCol, setSortDir, sortFn };
}

// ─── Desktop sortable column header ───────────────────────────────────────────

function SortTh({ label, col, sortCol, sortDir, onSort, className = "" }) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`py-3 px-2 text-center cursor-pointer select-none whitespace-nowrap text-xs font-semibold uppercase tracking-wider ${className}`}
      style={{ color: active ? "var(--ct-accent)" : "var(--ct-text-secondary)" }}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active ? (
          sortDir === "desc"
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
        ) : (
          <span style={{ color: "var(--ct-text-muted)", fontSize: 10 }}>↕</span>
        )}
      </span>
    </th>
  );
}

// ─── Pill bar ─────────────────────────────────────────────────────────────────

function PillBar({ options, activeId, onChange, className = "" }) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto ${className}`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {options.map(opt => {
        const active = activeId === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              background: active ? "var(--ct-accent)" : "var(--ct-bg-elevated)",
              color:      active ? "#ffffff"  : "var(--ct-text-secondary)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Collapsible search (mobile player tab) ───────────────────────────────────

function CollapsibleSearch({ value, onChange, placeholder }) {
  const [expanded, setExpanded] = useState(!!value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: "var(--ct-bg-elevated)",
          border: "none",
          cursor: "pointer",
          color: "var(--ct-text-secondary)",
        }}
        aria-label="Search players"
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative flex-1 min-w-[140px]">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--ct-text-muted)" }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => { if (!value) setExpanded(false); }}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-1.5 rounded-full text-sm focus:outline-none"
        style={{
          background: "var(--ct-bg-elevated)",
          border: "1px solid var(--ct-border)",
          color: "var(--ct-text-primary)",
        }}
      />
    </div>
  );
}

// ─── Stat cell (mobile card grid) ─────────────────────────────────────────────

function StatCell({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>
        {label}
      </div>
      <div
        className="text-lg font-bold leading-tight mt-0.5"
        style={{ color: highlight ? "var(--ct-accent)" : "var(--ct-text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Tab 1: Team Stats ────────────────────────────────────────────────────────

const TEAM_SORT_PILLS = [
  { id: "pts",  label: "PPG"  },
  { id: "reb",  label: "RPG"  },
  { id: "ast",  label: "APG"  },
  { id: "stl",  label: "SPG"  },
  { id: "blk",  label: "BPG"  },
  { id: "to",   label: "TO"   },
  { id: "gp",   label: "GP"   },
];

function TeamCardMobile({ team, sortCol, isExpanded, onToggle }) {
  return (
    <div
      className="rounded-xl mb-2"
      style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)", padding: "16px" }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
      >
        {/* Top row: logo + name on left, W-L on right isn't available here (no wins/losses in stats scope).
            Show GP as the right indicator. */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ width: 44, height: 44, backgroundColor: team.color || "var(--ct-accent)" }}
          >
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold truncate" style={{ color: "var(--ct-text-primary)" }}>
              {team.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--ct-text-muted)" }}>
              {team.gp} {team.gp === 1 ? "game" : "games"} played
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            style={{ color: "var(--ct-text-muted)" }}
          />
        </div>

        {/* 4-stat grid: PPG RPG APG SPG */}
        <div className="grid grid-cols-4 gap-2">
          <StatCell label="PPG" value={fmt1(team.pts)} highlight={sortCol === "pts"} />
          <StatCell label="RPG" value={fmt1(team.reb)} highlight={sortCol === "reb"} />
          <StatCell label="APG" value={fmt1(team.ast)} highlight={sortCol === "ast"} />
          <StatCell label="SPG" value={fmt1(team.stl)} highlight={sortCol === "stl"} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="rounded-lg mt-3 p-3 grid grid-cols-4 gap-2"
              style={{ background: "var(--ct-bg-page)" }}
            >
              <StatCell label="OREB" value={fmt1(team.oreb)} highlight={sortCol === "oreb"} />
              <StatCell label="DREB" value={fmt1(team.dreb)} highlight={sortCol === "dreb"} />
              <StatCell label="BPG"  value={fmt1(team.blk)}  highlight={sortCol === "blk"} />
              <StatCell label="TO"   value={fmt1(team.to)}   highlight={sortCol === "to"} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamStatsTab({ teams, allStats, selectedTeamId, isNarrow }) {
  const { sortCol, sortDir, onSort, setSortCol, sortFn } = useSort("pts");
  const [expandedId, setExpandedId] = useState(null);

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
    return <p className="text-center py-12" style={{ color: "var(--ct-text-muted)" }}>No team stats available yet.</p>;
  }

  const thProps = { sortCol, sortDir, onSort };

  if (isNarrow) {
    return (
      <div>
        {/* Section label + mobile sort pills */}
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" style={{ color: "var(--ct-accent)" }} />
          <span className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>Team Statistics</span>
        </div>
        <div className="mb-3">
          <PillBar
            options={TEAM_SORT_PILLS}
            activeId={sortCol}
            onChange={(id) => setSortCol(id)}
          />
        </div>
        {rows.map(team => (
          <TeamCardMobile
            key={team.id}
            team={team}
            sortCol={sortCol}
            isExpanded={expandedId === team.id}
            onToggle={() => setExpandedId(expandedId === team.id ? null : team.id)}
          />
        ))}
      </div>
    );
  }

  // Desktop table
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4" style={{ color: "var(--ct-accent)" }} />
        <span className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>Team Statistics (Per Game Averages)</span>
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ background: "var(--ct-bg-elevated)", borderBottom: "1px solid var(--ct-border)" }}>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--ct-text-secondary)" }}>Team</th>
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
                <tr
                  key={team.id}
                  style={{ borderBottom: "1px solid var(--ct-border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--ct-bg-elevated)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: team.color || "var(--ct-accent)" }}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-xs whitespace-nowrap" style={{ color: "var(--ct-text-primary)" }}>{team.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{team.gp}</td>
                  <td className="py-3 px-2 text-center font-bold" style={{ color: "var(--ct-accent)" }}>{fmt1(team.pts)}</td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(team.reb)}</td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(team.ast)}</td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(team.oreb)}</td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(team.dreb)}</td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(team.stl)}</td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(team.blk)}</td>
                  <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(team.to)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Player Stats ──────────────────────────────────────────────────────

const PLAYER_SORT_PILLS = [
  { id: "ppg", label: "PPG" },
  { id: "rpg", label: "RPG" },
  { id: "apg", label: "APG" },
  { id: "stl", label: "SPG" },
  { id: "blk", label: "BPG" },
  { id: "pm3", label: "3PM" },
  { id: "pm2", label: "2PM" },
];

function PlayerCardMobile({ player, sortCol, isExpanded, onToggle }) {
  const name = player.name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown";
  const teamAbbr = player.team?.short_name || player.team?.name || "—";

  return (
    <div
      className="rounded-xl mb-2"
      style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)", padding: "16px" }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
      >
        {/* Top row: jersey circle + name + team abbr */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ width: 36, height: 36, backgroundColor: player.team?.color || "var(--ct-accent)" }}
          >
            {player.jersey_number ?? "—"}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="text-base font-semibold truncate" style={{ color: "var(--ct-text-primary)" }}>
              {name}
            </div>
          </div>
          <span className="text-xs font-semibold uppercase flex-shrink-0" style={{ color: "var(--ct-text-secondary)" }}>
            {teamAbbr}
          </span>
          <ChevronDown
            className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            style={{ color: "var(--ct-text-muted)" }}
          />
        </div>

        {/* 4-stat grid: PPG RPG APG SPG */}
        <div className="grid grid-cols-4 gap-2">
          <StatCell label="PPG" value={fmt1(player.ppg)} highlight={sortCol === "ppg"} />
          <StatCell label="RPG" value={fmt1(player.rpg)} highlight={sortCol === "rpg"} />
          <StatCell label="APG" value={fmt1(player.apg)} highlight={sortCol === "apg"} />
          <StatCell label="SPG" value={fmt1(player.stl)} highlight={sortCol === "stl"} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="rounded-lg mt-3 p-3 grid grid-cols-4 gap-2"
              style={{ background: "var(--ct-bg-page)" }}
            >
              <StatCell label="GP"   value={player.gp}        highlight={sortCol === "gp"} />
              <StatCell label="2PM"  value={fmt1(player.pm2)} highlight={sortCol === "pm2"} />
              <StatCell label="3PM"  value={fmt1(player.pm3)} highlight={sortCol === "pm3"} />
              <StatCell label="FTM"  value={fmt1(player.ftm)} highlight={sortCol === "ftm"} />
              <StatCell label="OREB" value={fmt1(player.oreb)} highlight={sortCol === "oreb"} />
              <StatCell label="DREB" value={fmt1(player.dreb)} highlight={sortCol === "dreb"} />
              <StatCell label="BPG"  value={fmt1(player.blk)} highlight={sortCol === "blk"} />
              <StatCell label="TO"   value={fmt1(player.to)}  highlight={sortCol === "to"} />
              <StatCell label="PF"   value={fmt1(player.pf)}  highlight={sortCol === "pf"} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerStatsTab({ players, teams, allStats, selectedTeamId, playerSearch, isNarrow }) {
  const { sortCol, sortDir, onSort, setSortCol, sortFn } = useSort("ppg");
  const [expandedId, setExpandedId] = useState(null);

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
    return <p className="text-center py-12" style={{ color: "var(--ct-text-muted)" }}>No player stats available yet.</p>;
  }

  const thProps = { sortCol, sortDir, onSort };

  if (isNarrow) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4" style={{ color: "var(--ct-accent)" }} />
          <span className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>Player Statistics</span>
        </div>
        <div className="mb-3">
          <PillBar
            options={PLAYER_SORT_PILLS}
            activeId={sortCol}
            onChange={(id) => setSortCol(id)}
          />
        </div>
        {rows.map(player => (
          <PlayerCardMobile
            key={player.id}
            player={player}
            sortCol={sortCol}
            isExpanded={expandedId === player.id}
            onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
          />
        ))}
      </div>
    );
  }

  // Desktop table
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4" style={{ color: "var(--ct-accent)" }} />
        <span className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>Player Statistics</span>
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr style={{ background: "var(--ct-bg-elevated)", borderBottom: "1px solid var(--ct-border)" }}>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--ct-text-secondary)" }}>Player</th>
                <th className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--ct-text-secondary)" }}>Team</th>
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
                  <tr
                    key={player.id}
                    style={{ borderBottom: "1px solid var(--ct-border)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--ct-bg-elevated)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: player.team?.color || "var(--ct-accent)" }}
                        >
                          {player.jersey_number ?? "—"}
                        </div>
                        <span className="font-semibold text-xs whitespace-nowrap" style={{ color: "var(--ct-text-primary)" }}>{name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs font-semibold uppercase whitespace-nowrap" style={{ color: "var(--ct-text-secondary)" }}>
                      {player.team?.short_name || player.team?.name || "—"}
                    </td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{player.gp}</td>
                    <td className="py-3 px-2 text-center font-bold" style={{ color: "var(--ct-accent)" }}>{fmt1(player.ppg)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.pm2)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.pm3)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.ftm)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.oreb)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.dreb)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.rpg)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.apg)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.stl)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.blk)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.to)}</td>
                    <td className="py-3 px-2 text-center" style={{ color: "var(--ct-text-primary)" }}>{fmt1(player.pf)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: League Leaders ────────────────────────────────────────────────────

const LEADER_CATEGORIES = [
  { key: "ppg", label: "PPG Leaders", short: "PPG", icon: "🏀" },
  { key: "pm3", label: "3PM Leaders", short: "3PM", icon: "🎯" },
  { key: "rpg", label: "RPG Leaders", short: "RPG", icon: "💪" },
  { key: "apg", label: "APG Leaders", short: "APG", icon: "🤝" },
  { key: "stl", label: "SPG Leaders", short: "SPG", icon: "🏆" },
  { key: "blk", label: "BPG Leaders", short: "BPG", icon: "🚫" },
];

function LeaderCategoryCard({ category, rows }) {
  return (
    <div
      id={`leader-${category.key}`}
      className="rounded-xl"
      style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)", padding: "16px" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{category.icon}</span>
        <span className="text-base font-semibold" style={{ color: "var(--ct-text-primary)" }}>{category.label}</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-center py-4" style={{ color: "var(--ct-text-muted)" }}>No data yet</div>
      ) : (
        <div>
          {rows.map((row, i) => {
            const rank = i + 1;
            const rankColor = rank === 1 ? "var(--ct-accent-gold)" : rank <= 3 ? "var(--ct-text-primary)" : "var(--ct-text-secondary)";
            const isLast = i === rows.length - 1;
            const name = row.playerName;
            const teamAbbr = row.team?.short_name || row.team?.name || "—";
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: isLast ? "none" : "1px solid var(--ct-border)" }}
              >
                <span
                  className="w-5 text-center text-sm font-bold flex-shrink-0"
                  style={{ color: rankColor }}
                >
                  {rank}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: row.team?.color || "var(--ct-accent)" }}
                >
                  {row.jersey_number ?? "—"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--ct-text-primary)" }}>
                    {name}
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--ct-text-muted)" }}>
                    {teamAbbr}
                  </div>
                </div>
                <span className="text-base font-bold flex-shrink-0" style={{ color: "var(--ct-accent)" }}>
                  {fmt1(row[category.key])}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeagueLeadersTab({ players, teams, allStats, isNarrow }) {
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

  const scrollToCategory = (key) => {
    const el = document.getElementById(`leader-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const categoryPillOptions = LEADER_CATEGORIES.map(c => ({ id: c.key, label: c.short }));
  const [activeCategoryPill, setActiveCategoryPill] = useState(LEADER_CATEGORIES[0].key);

  if (isNarrow) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4" style={{ color: "var(--ct-accent)" }} />
          <span className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>League Leaders</span>
        </div>
        <div className="mb-3">
          <PillBar
            options={categoryPillOptions}
            activeId={activeCategoryPill}
            onChange={(id) => { setActiveCategoryPill(id); scrollToCategory(id); }}
          />
        </div>
        <div className="flex flex-col gap-3">
          {LEADER_CATEGORIES.map(cat => (
            <LeaderCategoryCard key={cat.key} category={cat} rows={top5(cat.key)} />
          ))}
        </div>
      </div>
    );
  }

  // Desktop grid (3 cols lg, 2 cols md)
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4" style={{ color: "var(--ct-accent)" }} />
        <span className="font-semibold" style={{ color: "var(--ct-text-primary)" }}>League Leaders</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {LEADER_CATEGORIES.map(cat => (
          <LeaderCategoryCard key={cat.key} category={cat} rows={top5(cat.key)} />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Statistics() {
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [selectedTeamId,   setSelectedTeamId]   = useState("all");
  const [playerSearch,     setPlayerSearch]     = useState("");
  const [activeTab,        setActiveTab]        = useState("team");

  const isNarrow = useIsNarrowLayout();

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
    { id: "team",    short: "Teams",   long: "Team Stats"     },
    { id: "player",  short: "Players", long: "Player Stats"   },
    { id: "leaders", short: "Leaders", long: "League Leaders" },
  ];

  // Filter pill options
  const leaguePillOptions = leagues.map(l => ({ id: l.id, label: l.name }));
  const teamPillOptions = [
    { id: "all", label: "All Teams" },
    ...teams.map(t => ({ id: t.id, label: t.name })),
  ];

  const currentLeague = leagues.find(l => l.id === selectedLeagueId);
  const currentTeam = selectedTeamId === "all"
    ? null
    : teams.find(t => t.id === selectedTeamId);
  const teamPillLabel = currentTeam ? currentTeam.name : "All Teams";
  const leaguePillLabel = currentLeague ? currentLeague.name : "League";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-page)" }}>

      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-3">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--ct-accent)" }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "var(--ct-text-primary)" }}>
              Statistics
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: "var(--ct-text-muted)" }}>
              League, team and player statistics
            </p>
          </div>
        </div>
      </div>

      {/* Sticky section: Tabs + Filter pills */}
      <div
        className="sticky top-0 z-10"
        style={{ background: "var(--color-bg-page)" }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-3 flex flex-col gap-3">
          {/* Tab bar — horizontally scrollable so short labels always fit on one line */}
          <div
            className="overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div
              className="inline-flex p-1 rounded-full gap-1"
              style={{ background: "var(--ct-bg-card)" }}
            >
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap"
                    style={{
                      background: active ? "var(--ct-accent)" : "transparent",
                      color:      active ? "#ffffff" : "var(--ct-text-secondary)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {isNarrow ? tab.short : tab.long}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact filter row: league pill + team dropdown + (search on player tab) */}
          {leaguesLoading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ct-text-muted)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading leagues…
            </div>
          ) : leagues.length > 0 && (
            <div
              className="flex gap-2 items-center overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {/* League dropdown pill — active blue */}
              <DropdownPill
                active
                label={leaguePillLabel}
                options={leaguePillOptions}
                selectedId={selectedLeagueId}
                onChange={(id) => { setSelectedLeagueId(id); setSelectedTeamId("all"); setPlayerSearch(""); }}
              />

              {/* Team dropdown pill */}
              {teams.length > 0 && (
                <DropdownPill
                  label={teamPillLabel}
                  options={teamPillOptions}
                  selectedId={selectedTeamId}
                  onChange={(id) => { setSelectedTeamId(id); setPlayerSearch(""); }}
                />
              )}

              {/* Player search — collapsible on mobile, inline input on desktop */}
              {activeTab === "player" && (
                isNarrow ? (
                  <CollapsibleSearch
                    value={playerSearch}
                    onChange={setPlayerSearch}
                    placeholder="Search players…"
                  />
                ) : (
                  <div className="relative flex-shrink-0" style={{ width: 220 }}>
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: "var(--ct-text-muted)" }}
                    />
                    <input
                      type="text"
                      placeholder="Search players…"
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 rounded-full text-sm focus:outline-none"
                      style={{
                        background: "var(--ct-bg-elevated)",
                        border: "1px solid var(--ct-border)",
                        color: "var(--ct-text-primary)",
                      }}
                    />
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ct-text-muted)" }} />
          </div>
        ) : !selectedLeagueId ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "var(--ct-bg-elevated)" }}
            >
              <BarChart3 className="w-8 h-8" style={{ color: "var(--ct-text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--ct-text-muted)" }}>
              Select a league to view statistics.
            </p>
          </div>
        ) : activeTab === "team" ? (
          <TeamStatsTab
            teams={teams}
            allStats={allStats}
            selectedTeamId={selectedTeamId}
            isNarrow={isNarrow}
          />
        ) : activeTab === "player" ? (
          <PlayerStatsTab
            players={players}
            teams={teams}
            allStats={allStats}
            selectedTeamId={selectedTeamId}
            playerSearch={debouncedSearch}
            isNarrow={isNarrow}
          />
        ) : (
          <LeagueLeadersTab
            players={players}
            teams={teams}
            allStats={allStats}
            isNarrow={isNarrow}
          />
        )}
      </div>
    </div>
  );
}
