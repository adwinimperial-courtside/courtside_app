const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatClock(seconds) {
  if (seconds == null || isNaN(seconds)) return '--:--';
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function periodLabel(period) {
  if (!period || period <= 4) return `Q${period || 1}`;
  return 'OT';
}

// Mirrors ScoreHeader segment logic
function getTimeoutSegment(period, periodType, totalPeriods) {
  if (period > totalPeriods) return 'OVERTIME';
  if (periodType === 'halves') return period === 1 ? 'FIRST_HALF' : 'SECOND_HALF';
  return period <= 2 ? 'FIRST_HALF' : 'SECOND_HALF';
}

function getMaxTimeouts(segment, periodType) {
  if (segment === 'OVERTIME') return 1;
  if (segment === 'FIRST_HALF') return 2;
  return periodType === 'halves' ? 2 : 3;
}

// Mirrors LiveStatTracker foul key logic
function getFoulKey(period, periodType, totalPeriods) {
  if (period > totalPeriods) return String(period);
  if (periodType === 'halves') return period === 1 ? 'h1' : 'h2';
  return String(period);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeoutDots({ used, max }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: i < max - used
              ? 'rgba(255,255,255,0.85)'
              : 'rgba(255,255,255,0.18)',
          }}
        />
      ))}
    </div>
  );
}

function TeamMark({ color, letter }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 4,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 500, color: '#fff', fontFamily: FONT }}>
        {letter}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Scorebug({ game, homeTeam, awayTeam, clockDisplay, crewName }) {
  if (!game) return null;

  // ── Scores ──────────────────────────────────────────────────────────────────
  const homeScore   = game.home_score ?? 0;
  const awayScore   = game.away_score ?? 0;
  const homeLeading = homeScore > awayScore;
  const awayLeading = awayScore > homeScore;

  // ── Team identity ────────────────────────────────────────────────────────────
  const homeColor = homeTeam?.color || '#3B82F6';
  const awayColor = awayTeam?.color || '#EF4444';
  const homeAbbr  = (homeTeam?.short_name || homeTeam?.name?.slice(0, 3) || 'HME').toUpperCase();
  const awayAbbr  = (awayTeam?.short_name || awayTeam?.name?.slice(0, 3) || 'AWY').toUpperCase();
  const homeMark  = (homeTeam?.name?.[0] || 'H').toUpperCase();
  const awayMark  = (awayTeam?.name?.[0] || 'A').toUpperCase();

  // ── Period / clock ───────────────────────────────────────────────────────────
  const period      = game.clock_period || 1;
  const showClock   = game.game_mode === 'timed' || game.clock_time_left != null;
  const periodType  = game.game_rules?.period_type || 'quarters';
  const totalPeriods = periodType === 'halves' ? 2 : 4;

  // ── Fouls ────────────────────────────────────────────────────────────────────
  const foulKey   = getFoulKey(period, periodType, totalPeriods);
  const homeFouls = (game.home_team_fouls || {})[foulKey] ?? null;
  const awayFouls = (game.away_team_fouls || {})[foulKey] ?? null;

  // ── Timeouts ─────────────────────────────────────────────────────────────────
  const segment        = getTimeoutSegment(period, periodType, totalPeriods);
  const maxTO          = getMaxTimeouts(segment, periodType);
  const homeTOUsed     = (game.home_timeouts || {})[segment] ?? null;
  const awayTOUsed     = (game.away_timeouts || {})[segment] ?? null;
  const hasTOData      = homeTOUsed !== null || awayTOUsed !== null;

  // ── Possession ───────────────────────────────────────────────────────────────
  const homePossession = game.possession === 'home';
  const awayPossession = game.possession === 'away';

  // ── Crew ─────────────────────────────────────────────────────────────────────
  const crewDisplay = crewName?.trim() || null;
  const crewInitial = crewDisplay?.[0]?.toUpperCase() || null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        right: 14,
        width: 280,
        pointerEvents: 'none',
        background: 'rgba(15,15,26,0.94)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
        overflow: 'hidden',
        color: '#fff',
        fontFamily: FONT,
      }}
    >

      {/* ── STRIP 1: HEADER ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 10px',
          background: 'rgba(59,130,246,0.10)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Left: league chip + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 8, fontWeight: 500, color: '#fff', fontFamily: FONT }}>
              LG
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.8px',
              color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
            }}
          >
            League
          </span>
        </div>

        {/* Right: period + clock + possession dot (home side = header right) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.8px',
              color: '#F59E0B',
              fontFamily: FONT,
            }}
          >
            {periodLabel(period)}
          </span>
          {showClock && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#fff',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: FONT,
              }}
            >
              {formatClock(clockDisplay)}
            </span>
          )}
          {!showClock && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.50)',
                fontFamily: FONT,
              }}
            >
              {game.status === 'final' ? 'FINAL' : 'LIVE'}
            </span>
          )}
          {/* Possession dot here when HOME has possession */}
          {homePossession && (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#F59E0B',
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </div>

      {/* ── STRIP 2: HOME TEAM ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '7px 10px',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <TeamMark color={homeColor} letter={homeMark} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: homeLeading ? '#fff' : 'rgba(255,255,255,0.92)',
            fontFamily: FONT,
          }}
        >
          {homeAbbr}
        </span>
        {/* Score */}
        <span
          style={{
            fontSize: 20,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 32,
            textAlign: 'right',
            color: homeLeading ? '#fff' : 'rgba(255,255,255,0.92)',
            fontFamily: FONT,
          }}
        >
          {homeScore}
        </span>
      </div>

      {/* ── STRIP 3: AWAY TEAM ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '7px 10px',
          gap: 10,
        }}
      >
        <TeamMark color={awayColor} letter={awayMark} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: awayLeading ? '#fff' : 'rgba(255,255,255,0.92)',
            fontFamily: FONT,
          }}
        >
          {awayAbbr}
        </span>
        {/* Possession dot moves to away row when AWAY has possession */}
        {awayPossession && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#F59E0B',
              flexShrink: 0,
            }}
          />
        )}
        {/* Score */}
        <span
          style={{
            fontSize: 20,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 32,
            textAlign: 'right',
            color: awayLeading ? '#fff' : 'rgba(255,255,255,0.92)',
            fontFamily: FONT,
          }}
        >
          {awayScore}
        </span>
      </div>

      {/* ── STRIP 4: META (timeouts + fouls) ────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 10px',
          background: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.65)',
          fontFamily: FONT,
        }}
      >
        {/* Home: TO dots + fouls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>TO</span>
          {hasTOData
            ? <TimeoutDots used={Math.min(homeTOUsed ?? 0, maxTO)} max={maxTO} />
            : <span style={{ marginLeft: 2 }}>—</span>
          }
          <span style={{ marginLeft: 4 }}>
            F{' '}
            <span style={{ color: '#F59E0B', fontWeight: 500 }}>
              {homeFouls !== null ? homeFouls : '—'}
            </span>
          </span>
        </div>

        {/* Away: fouls + TO dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>
            F{' '}
            <span style={{ color: '#F59E0B', fontWeight: 500 }}>
              {awayFouls !== null ? awayFouls : '—'}
            </span>
          </span>
          <span style={{ marginLeft: 4 }}>TO</span>
          {hasTOData
            ? <TimeoutDots used={Math.min(awayTOUsed ?? 0, maxTO)} max={maxTO} />
            : <span style={{ marginLeft: 2 }}>—</span>
          }
        </div>
      </div>

      {/* ── STRIP 5: CREW (conditional) ─────────────────────────────────────── */}
      {crewDisplay && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 10px',
            background: 'rgba(0,0,0,0.28)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.70)',
            fontFamily: FONT,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 8, fontWeight: 500, color: '#1A1A2E', fontFamily: FONT }}>
              {crewInitial}
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
            }}
          >
            {crewDisplay}
          </span>
        </div>
      )}

    </div>
  );
}
