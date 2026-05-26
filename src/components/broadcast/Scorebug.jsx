const formatClock = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '--:--';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
};

const periodLabel = (period) => {
  if (!period || period <= 4) return `Q${period || 1}`;
  return 'OT';
};

const TeamSide = ({ team, score, align }) => {
  const shortName = team?.short_name || team?.name?.slice(0, 3).toUpperCase() || '???';
  const color = team?.color || '#6366f1';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexDirection: align === 'right' ? 'row-reverse' : 'row',
        minWidth: 0,
      }}
    >
      {/* Team colour dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${color}99`,
        }}
      />
      {/* Short name */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '1.5px',
          color: 'rgba(255,255,255,0.85)',
          textTransform: 'uppercase',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {shortName}
      </span>
      {/* Score */}
      <span
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#ffffff',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          minWidth: 28,
          textAlign: align === 'right' ? 'left' : 'right',
        }}
      >
        {score}
      </span>
    </div>
  );
};

export default function Scorebug({ game, homeTeam, awayTeam, clockDisplay }) {
  if (!game) return null;

  const showClock = game.game_mode === 'timed' || game.clock_time_left != null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        borderRadius: 4,
        overflow: 'hidden',
        background: 'rgba(15,15,26,0.88)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Away team (left side) */}
      <div style={{ padding: '8px 14px 8px 12px' }}>
        <TeamSide team={awayTeam} score={game.away_score ?? 0} align="left" />
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.12)' }} />

      {/* Centre: period + clock */}
      <div
        style={{
          padding: '6px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          minWidth: 72,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '1.8px',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          {periodLabel(game.clock_period)}
        </span>
        {showClock && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: game.clock_running ? '#ffffff' : 'rgba(255,255,255,0.6)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.5px',
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
          >
            {formatClock(clockDisplay)}
          </span>
        )}
        {!showClock && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
          >
            {game.status === 'final' ? 'FINAL' : 'LIVE'}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.12)' }} />

      {/* Home team (right side) */}
      <div style={{ padding: '8px 12px 8px 14px' }}>
        <TeamSide team={homeTeam} score={game.home_score ?? 0} align="right" />
      </div>
    </div>
  );
}
