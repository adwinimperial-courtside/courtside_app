import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBroadcastState } from '@/hooks/useBroadcastState';

const pulseKeyframes = `
@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
`;

export default function LiveGameOverlay() {
  const { gameId } = useParams();
  const { broadcastState } = useBroadcastState(gameId);
  const prevBg = useRef(null);

  useEffect(() => {
    prevBg.current = document.body.style.background;
    document.body.style.background = 'transparent';
    return () => {
      document.body.style.background = prevBg.current;
    };
  }, []);

  if (!broadcastState.overlay_visible) return null;

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
        {/* Top-left: LIVE badge + Courtside credit */}
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
      </div>
    </>
  );
}
