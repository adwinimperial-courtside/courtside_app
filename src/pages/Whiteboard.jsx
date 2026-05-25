import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PenTool, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

import CourtSVG, { HALF_W, HALF_H, FULL_W, FULL_H } from "../components/whiteboard/CourtSVG";
import PlayerToken from "../components/whiteboard/PlayerToken";
import DrawingToolbar from "../components/whiteboard/DrawingToolbar";
import DrawingCanvas from "../components/whiteboard/DrawingCanvas";
import SavePlayDialog from "../components/whiteboard/SavePlayDialog";
import LoadPlayDialog from "../components/whiteboard/LoadPlayDialog";

// ─── Default positions (absolute viewBox units) ────────────────────────────
const DEFAULT_HALF = {
  offense: [
    { id: "o1", x: 350, y: 250 },
    { id: "o2", x: 320, y:  80 },
    { id: "o3", x: 320, y: 420 },
    { id: "o4", x: 220, y: 150 },
    { id: "o5", x: 140, y: 310 },
  ],
  defense: [
    { id: "d1", x: 300, y: 250 },
    { id: "d2", x: 270, y: 110 },
    { id: "d3", x: 270, y: 390 },
    { id: "d4", x: 180, y: 170 },
    { id: "d5", x: 120, y: 280 },
  ],
  ball: { x: 350, y: 250, attachedTo: "o1" },
};

const DEFAULT_FULL = {
  offense: [
    { id: "o1", x: 550, y: 250 },
    { id: "o2", x: 650, y: 100 },
    { id: "o3", x: 650, y: 400 },
    { id: "o4", x: 750, y: 150 },
    { id: "o5", x: 750, y: 350 },
  ],
  defense: [
    { id: "d1", x: 350, y: 250 },
    { id: "d2", x: 250, y: 100 },
    { id: "d3", x: 250, y: 400 },
    { id: "d4", x: 150, y: 150 },
    { id: "d5", x: 200, y: 350 },
  ],
  ball: { x: 550, y: 250, attachedTo: "o1" },
};

function getDefaults(courtType) {
  const d = courtType === "full" ? DEFAULT_FULL : DEFAULT_HALF;
  return { players: [...d.offense, ...d.defense], ball: { ...d.ball } };
}

// ─── Ball token (SVG, absolute viewBox coords) ─────────────────────────────
const BALL_R = 10;

function BallToken({ ball, vbW, vbH, isDrawMode, onDrag }) {
  const dragging = React.useRef(false);
  const offset = React.useRef({ x: 0, y: 0 });

  const screenToSVG = (svgEl, clientX, clientY) => {
    const pt = svgEl.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const { x, y } = pt.matrixTransform(ctm.inverse());
    return { x, y };
  };

  const onDown = (e) => {
    if (isDrawMode) return;
    e.stopPropagation();
    const svgEl = e.currentTarget.ownerSVGElement;
    if (!svgEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    const p = screenToSVG(svgEl, e.clientX, e.clientY);
    offset.current = { x: ball.x - p.x, y: ball.y - p.y };
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    const svgEl = e.currentTarget.ownerSVGElement;
    if (!svgEl) return;
    const p = screenToSVG(svgEl, e.clientX, e.clientY);
    const nx = Math.max(BALL_R, Math.min(vbW - BALL_R, p.x + offset.current.x));
    const ny = Math.max(BALL_R, Math.min(vbH - BALL_R, p.y + offset.current.y));
    onDrag(nx, ny, false);
  };
  const onUp = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    const svgEl = e.currentTarget.ownerSVGElement;
    if (!svgEl) return;
    const p = screenToSVG(svgEl, e.clientX, e.clientY);
    const nx = Math.max(BALL_R, Math.min(vbW - BALL_R, p.x + offset.current.x));
    const ny = Math.max(BALL_R, Math.min(vbH - BALL_R, p.y + offset.current.y));
    onDrag(nx, ny, true);
  };

  return (
    <g style={{ cursor: isDrawMode ? "default" : "grab", touchAction: "none" }}
       onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
      <circle cx={ball.x + 1} cy={ball.y + 1} r={BALL_R} fill="rgba(0,0,0,0.3)" />
      <circle cx={ball.x} cy={ball.y} r={BALL_R} fill="#F97316" stroke="black" strokeWidth={1} />
      <path d={`M ${ball.x - BALL_R + 1} ${ball.y} A ${BALL_R - 1} ${BALL_R - 1} 0 0 1 ${ball.x + BALL_R - 1} ${ball.y}`}
            stroke="black" strokeWidth={0.8} fill="none" />
      <path d={`M ${ball.x - BALL_R + 1} ${ball.y} A ${BALL_R - 1} ${BALL_R - 1} 0 0 0 ${ball.x + BALL_R - 1} ${ball.y}`}
            stroke="black" strokeWidth={0.8} fill="none" />
      <line x1={ball.x} y1={ball.y - BALL_R + 1} x2={ball.x} y2={ball.y + BALL_R - 1}
            stroke="black" strokeWidth={0.8} />
    </g>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Whiteboard() {
  // Court state
  const [courtType, setCourtType] = useState("half");
  const initial = getDefaults("half");
  const [players, setPlayers] = useState(initial.players);
  const [ball, setBall] = useState(initial.ball);
  const [drawings, setDrawings] = useState([]);

  // Drawing state
  const [activeTool, setActiveTool] = useState("select");
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawDashed, setDrawDashed] = useState(false);

  // Auth
  const { currentUser: supabaseUser, userProfile, userType, isAppAdmin } = useAuth();
  const currentUser = userProfile;

  // Dialogs
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

  // League selection
  const [selectedLeague, setSelectedLeague] = useState(null);

  const isSupabaseAdmin = isAppAdmin;

  // Leagues
  const { data: leagues = [] } = useQuery({
    queryKey: ["wb-leagues", supabaseUser?.id, userType, isSupabaseAdmin],
    queryFn: async () => {
      if (userType === "app_admin" || isSupabaseAdmin) {
        const { data } = await supabase.from("leagues").select("id, name").eq("is_active", true).order("name");
        return data || [];
      }
      if (!supabaseUser?.id) return [];
      const { data } = await supabase
        .from("user_league_memberships")
        .select("league_id, leagues(id, name)")
        .eq("user_id", supabaseUser.id)
        .eq("is_active", true);
      return (data || []).map((r) => r.leagues).filter(Boolean);
    },
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (leagues.length > 0 && !selectedLeague) setSelectedLeague(leagues[0].id);
  }, [leagues, selectedLeague]);

  // Escape → select
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setActiveTool("select"); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // viewBox dims for current court
  const vbW = courtType === "full" ? FULL_W : HALF_W;
  const vbH = courtType === "full" ? FULL_H : HALF_H;
  const isDrawMode = activeTool !== "select";

  // Switch court (confirm if drawings exist)
  const switchCourt = (next) => {
    if (next === courtType) return;
    if (drawings.length > 0) {
      const ok = window.confirm("Switching courts will clear your current drawings. Continue?");
      if (!ok) return;
    }
    setCourtType(next);
    const d = getDefaults(next);
    setPlayers(d.players);
    setBall(d.ball);
    setDrawings([]);
    setActiveTool("select");
  };

  const resetAll = () => {
    const d = getDefaults(courtType);
    setPlayers(d.players);
    setBall(d.ball);
    setDrawings([]);
    setActiveTool("select");
  };

  // Player drag — move ball along with attached player
  const handlePlayerDrag = useCallback((id, nx, ny) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, x: nx, y: ny } : p)));
    setBall((prev) => (prev.attachedTo === id ? { ...prev, x: nx, y: ny } : prev));
  }, []);

  // Ball drag — snap to nearest offense within 30 viewBox units on release
  const handleBallDrag = useCallback((nx, ny, isEnd) => {
    if (!isEnd) {
      setBall((prev) => ({ ...prev, x: nx, y: ny, attachedTo: null }));
      return;
    }
    const SNAP = 30;
    let nearest = null;
    let nearestD = Infinity;
    players.forEach((p) => {
      if (!p.id.startsWith("o")) return;
      const d = Math.hypot(p.x - nx, p.y - ny);
      if (d < SNAP && d < nearestD) { nearestD = d; nearest = p; }
    });
    setBall(nearest
      ? { x: nearest.x + 14, y: nearest.y, attachedTo: nearest.id }
      : { x: nx, y: ny, attachedTo: null });
  }, [players]);

  // Load a saved play
  const loadPlay = (play) => {
    const pd = play.play_data || {};
    if (pd.courtType) setCourtType(pd.courtType);
    if (Array.isArray(pd.players)) setPlayers(pd.players);
    if (pd.ball) setBall(pd.ball);
    if (Array.isArray(pd.drawings)) setDrawings(pd.drawings);
    setActiveTool("select");
    setLoadOpen(false);
    toast.success(`Loaded "${play.name}"`);
  };

  const buildPlayData = () => ({ courtType, players, ball, drawings });

  // Access gate
  const allowed = ["coach", "league_admin", "player", "app_admin"];
  if (currentUser && !allowed.includes(userType) && !isSupabaseAdmin) {
    return (
      <div className="min-h-screen bg-[var(--ct-bg-page)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-[var(--ct-text-primary)] mb-2">Access Restricted</p>
          <p className="text-[var(--ct-text-secondary)]">Whiteboard is not available for your role.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] via-[var(--ct-bg-card)] to-[var(--ct-bg-page)]">
      <Toaster position="top-right" richColors />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center ">
            <PenTool className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ct-text-primary)]">Whiteboard</h1>
            <p className="text-[var(--ct-text-secondary)] text-sm">Diagram plays and tactical formations</p>
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedLeague || ""} onValueChange={(v) => setSelectedLeague(v || null)}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[var(--ct-text-muted)]" />
                  <SelectValue placeholder="Select league" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {leagues.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Court tabs */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex rounded-lg border border-[var(--ct-border)] overflow-hidden bg-[var(--ct-bg-card)]">
            <button
              onClick={() => switchCourt("half")}
              className={`px-6 py-2.5 text-sm font-semibold transition-colors ${
                courtType === "half" ? "bg-orange-500 text-white" : "bg-[var(--ct-bg-card)] text-[var(--ct-text-secondary)] hover:bg-[var(--ct-bg-elevated)]"
              }`}
            >Half Court</button>
            <button
              onClick={() => switchCourt("full")}
              className={`px-6 py-2.5 text-sm font-semibold transition-colors border-l border-[var(--ct-border)] ${
                courtType === "full" ? "bg-orange-500 text-white" : "bg-[var(--ct-bg-card)] text-[var(--ct-text-secondary)] hover:bg-[var(--ct-bg-elevated)]"
              }`}
            >Full Court</button>
          </div>
        </div>

        {/* Whiteboard panel */}
        <div className="bg-[var(--ct-bg-card)] rounded-2xl border border-[var(--ct-border)] overflow-hidden">

          {/* Toolbar row */}
          <div className="border-b border-[var(--ct-border)] px-3 py-2 flex flex-wrap items-center gap-2">
            <DrawingToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              drawColor={drawColor}
              onColorChange={setDrawColor}
              drawDashed={drawDashed}
              onDashedChange={setDrawDashed}
              onClearDrawings={() => setDrawings([])}
            />
            <div className="w-px h-6 bg-[var(--ct-bg-elevated)]" />
            <Button variant="ghost" size="sm" onClick={resetAll} title="Reset all"
                    className="h-9 text-[var(--ct-text-secondary)]">
              <RotateCcw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setLoadOpen(true)} disabled={!selectedLeague}
                    title={selectedLeague ? "Load a saved play" : "Select a league to load"}
                    className="h-9">Load</Button>
            <Button onClick={() => setSaveOpen(true)} disabled={!selectedLeague}
                    title={selectedLeague ? "Save current play" : "Select a league to save"}
                    className="bg-orange-500 hover:bg-orange-600 text-white h-9">Save</Button>
          </div>

          {/* Court area */}
          <div className="p-3 sm:p-4 flex justify-center bg-[var(--ct-bg-page)]">
            <div
              className="relative w-full"
              style={{
                maxWidth: courtType === "full" ? 960 : 540,
                aspectRatio: `${vbW} / ${vbH}`,
              }}
            >
              {/* Court markings */}
              <div className="absolute inset-0">
                <CourtSVG courtType={courtType} />
              </div>

              {/* Drawing overlay — below players so players stay draggable in select mode */}
              <DrawingCanvas
                vbW={vbW} vbH={vbH}
                activeTool={activeTool}
                drawColor={drawColor}
                drawDashed={drawDashed}
                drawings={drawings}
                onDrawingsChange={setDrawings}
              />

              {/* Players + ball */}
              <svg
                viewBox={`0 0 ${vbW} ${vbH}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  pointerEvents: isDrawMode ? "none" : "auto",
                  touchAction: "none",
                }}
              >
                {players.map((token) => (
                  <PlayerToken
                    key={token.id}
                    token={token}
                    vbW={vbW} vbH={vbH}
                    isDrawMode={isDrawMode}
                    onDrag={handlePlayerDrag}
                    ballAttachedTo={ball.attachedTo}
                  />
                ))}
                <BallToken ball={ball} vbW={vbW} vbH={vbH} isDrawMode={isDrawMode} onDrag={handleBallDrag} />
              </svg>
            </div>
          </div>
        </div>

        {!selectedLeague && (
          <p className="text-xs text-center text-[var(--ct-text-muted)] mt-3">
            Select a league to enable save/load. The whiteboard works as a scratchpad without one.
          </p>
        )}
      </div>

      {/* Dialogs */}
      {saveOpen && (
        <SavePlayDialog
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          leagueId={selectedLeague}
          courtType={courtType}
          buildPlayData={buildPlayData}
          supabaseUser={supabaseUser}
          onSaved={() => { setSaveOpen(false); toast.success("Play saved!"); }}
        />
      )}
      {loadOpen && (
        <LoadPlayDialog
          open={loadOpen}
          onClose={() => setLoadOpen(false)}
          leagueId={selectedLeague}
          supabaseUser={supabaseUser}
          onLoad={loadPlay}
        />
      )}
    </div>
  );
}
