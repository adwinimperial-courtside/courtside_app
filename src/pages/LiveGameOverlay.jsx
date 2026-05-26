import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBroadcastState } from '@/hooks/useBroadcastState';
import { useGameOverlayData } from '@/hooks/useGameOverlayData';
import Scorebug, { CrewStripOverlay } from '@/components/broadcast/Scorebug';
import BroadcasterLogo from '@/components/broadcast/BroadcasterLogo';
import StreamerBar from '@/components/broadcast/StreamerBar';

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

  // ── Visibility rules ────────────────────────────────────────────────────────
  // LIVE badge : always visible (locked)
  // overlay_visible = false : ONLY LIVE badge renders, nothing else
  // overlay_visible = true :
  //   BroadcasterLogo       — if crew_logo_visible AND crew_logo_url
  //   Scorebug              — if scorebug_visible (text-only crew strip embedded)
  //   CrewStripOverlay      — if !scorebug_visible AND crew_name
  //   StreamerBar           — if streamer_visible AND streamer_text non-empty
  // Scorebug bottom offset is bumped by 64px (56 bar + 8 gap) when StreamerBar
  // is on so the two don't overlap.
  const overlayOn      = broadcastState.overlay_visible;
  const scorebugOn     = overlayOn && broadcastState.scorebug_visible;
  const logoOn         = overlayOn && broadcastState.crew_logo_visible && !!broadcastState.crew_logo_url;
  const streamerText   = (broadcastState.streamer_text || '').trim();
  const streamerOn     = overlayOn && broadcastState.streamer_visible && streamerText.length > 0;
  const crewStripOnly  = overlayOn && !scorebugOn && !!(broadcastState.crew_name || '').trim();
  const bottomOffset   = streamerOn ? 64 : 0;

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

        {/* ── Top-right: broadcaster logo ──────────────────────────────────── */}
        {logoOn && <BroadcasterLogo src={broadcastState.crew_logo_url} alt="Broadcaster logo" />}

        {/* ── Bottom-right: full scorebug ──────────────────────────────────── */}
        {scorebugOn && (
          <Scorebug
            game={game}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            clockDisplay={clockDisplay}
            crewName={broadcastState.crew_name}
            bottomOffset={bottomOffset}
          />
        )}

        {/* ── Bottom-right: standalone crew strip (overlay on, scorebug off) ─ */}
        {crewStripOnly && (
          <CrewStripOverlay
            crewName={broadcastState.crew_name}
            bottomOffset={bottomOffset}
          />
        )}

        {/* ── Bottom: streamer ticker ──────────────────────────────────────── */}
        {streamerOn && <StreamerBar text={broadcastState.streamer_text} />}
      </div>
    </>
  );
}
