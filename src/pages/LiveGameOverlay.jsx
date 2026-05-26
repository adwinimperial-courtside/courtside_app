import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBroadcastState } from '@/hooks/useBroadcastState';
import { useGameOverlayData } from '@/hooks/useGameOverlayData';
import Scorebug, { CrewStripOverlay } from '@/components/broadcast/Scorebug';

const pulseKeyframes = `
@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
`;

export default function LiveGameOverlay() {
  const { gameId } = useParams();
  const { broadcastState } = useBroadcastState(gameId);
  const { game, homeTeam, awayTeam, clockDisplay } = useGameOverlayData(gameId);
  const prevBg = useRef(null);

  useEffect(() => {
    prevBg.current = document.body.style.background;
    document.body.style.background = 'transparent';
    return () => {
      document.body.style.background = prevBg.current;
    };
  }, []);

  // ── Visibility rules ──────────────────────────────────────────────────────
  // LIVE badge : always visible — no toggle
  // overlay_visible = false : hide scorebug + crew strip (LIVE badge stays)
  // overlay_visible = true, scorebug_visible = false : show standalone crew strip only
  // overlay_visible = true, scorebug_visible = true  : show full scorebug (incl. crew strip)
  const overlayOn   = broadcastState.overlay_visible;
  const scorebugOn  = broadcastState.scorebug_visible;

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: 'transparent',
        }}
      >
        {/* ── Top-left: LIVE badge + Courtside credit — ALWAYS VISIBLE ─────── */}
        <div style={{ position: 'absolute', top: 14, left: 14 }}>

          {/* LIVE badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 10px 4px 8px',
              borderRadius: 3,
              background: 'rgba(15,15,26,0.88)',
              border: '1px solid rgba(239,68,68,0.45)',
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#EF4444',
                animation: 'livePulse 1.2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '2.5px',
                color: '#fff',
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              }}
            >
              LIVE
            </span>
          </div>

          {/* Powered by credit */}
          <div
            style={{
              marginTop: 7,
              fontSize: 9,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.6px',
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
          >
            Powered by{' '}
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              Courtside-by-AI
            </span>
          </div>
        </div>

        {/* ── Bottom-right: full scorebug (overlay + scorebug both on) ──────── */}
        {overlayOn && scorebugOn && (
          <Scorebug
            game={game}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            clockDisplay={clockDisplay}
            crewName={broadcastState.crew_name}
            crewLogoUrl={broadcastState.crew_logo_url}
          />
        )}

        {/* ── Bottom-right: crew strip only (overlay on, scorebug off) ──────── */}
        {overlayOn && !scorebugOn && (
          <CrewStripOverlay
            crewName={broadcastState.crew_name}
            crewLogoUrl={broadcastState.crew_logo_url}
          />
        )}
      </div>
    </>
  );
}
