/**
 * LowerThird — Phase 4 broadcast lower-third graphics
 *
 * Renders one of 5 graphic types based on graphic.type:
 *   player_intro       — entering player name, number, team, PTS/REB/AST
 *   stat_callout       — player stat highlight (same layout, different badge)
 *   leading_scorer     — who's leading the game in points
 *   quarter_recap      — end-of-period score summary
 *   team_foul_comparison — side-by-side home/away foul counts
 *
 * The component is purely presentational — caller handles all animation
 * (AnimatePresence / motion.div) and positioning (fixed, bottom-left).
 */

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const ACCENT  = '#3B82F6';
const BG      = 'rgba(15, 15, 26, 0.93)';
const WHITE   = '#FFFFFF';
const MUTED   = 'rgba(255,255,255,0.60)';
const DIVIDER = 'rgba(255,255,255,0.10)';

// ── Shared shell ──────────────────────────────────────────────────────────────

function Shell({ badge, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        width: 360,
        background: BG,
        borderRadius: '0 4px 4px 0',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.50)',
        fontFamily: FONT,
      }}
    >
      {/* Left accent bar */}
      <div style={{ width: 3, background: ACCENT, flexShrink: 0 }} />

      {/* Content area */}
      <div style={{ flex: 1, padding: '11px 14px', minWidth: 0 }}>
        {/* Type badge */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            color: ACCENT,
            marginBottom: 5,
          }}
        >
          {badge}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Stat pill row (PTS / REB / AST) ──────────────────────────────────────────

function StatRow({ pts, reb, ast }) {
  const pills = [
    { label: 'PTS', value: pts ?? 0 },
    { label: 'REB', value: reb ?? 0 },
    { label: 'AST', value: ast ?? 0 },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginTop: 7,
        paddingTop: 7,
        borderTop: `1px solid ${DIVIDER}`,
      }}
    >
      {pills.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: WHITE, lineHeight: 1 }}>
            {value}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.8px', color: MUTED }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── player_intro ──────────────────────────────────────────────────────────────

function PlayerIntro({ g }) {
  return (
    <Shell badge="Player intro">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: WHITE, lineHeight: 1.15 }}>
          {g.name}
        </span>
        {g.jersey && (
          <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>#{g.jersey}</span>
        )}
      </div>
      {g.team && (
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1, letterSpacing: '0.3px' }}>
          {g.team}
        </div>
      )}
      <StatRow pts={g.pts} reb={g.reb} ast={g.ast} />
    </Shell>
  );
}

// ── stat_callout ──────────────────────────────────────────────────────────────

function StatCallout({ g }) {
  return (
    <Shell badge="Stat callout">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: WHITE, lineHeight: 1.15 }}>
          {g.name}
        </span>
        {g.jersey && (
          <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>#{g.jersey}</span>
        )}
      </div>
      {g.team && (
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1, letterSpacing: '0.3px' }}>
          {g.team}
        </div>
      )}
      <StatRow pts={g.pts} reb={g.reb} ast={g.ast} />
    </Shell>
  );
}

// ── leading_scorer ────────────────────────────────────────────────────────────

function LeadingScorer({ g }) {
  return (
    <Shell badge="Leading scorer">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: WHITE, lineHeight: 1.15 }}>
          {g.name}
        </span>
        {g.jersey && (
          <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>#{g.jersey}</span>
        )}
      </div>
      {g.team && (
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1, letterSpacing: '0.3px' }}>
          {g.team}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          marginTop: 7,
          paddingTop: 7,
          borderTop: `1px solid ${DIVIDER}`,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
          {g.pts ?? 0}
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.8px', color: MUTED }}>
          PTS
        </span>
      </div>
    </Shell>
  );
}

// ── quarter_recap ─────────────────────────────────────────────────────────────

function QuarterRecap({ g }) {
  // period_label: "Q1", "H1", etc.
  const label = g.period_label || `Q${g.period || 1}`;

  return (
    <Shell badge={`End of ${label}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Home side */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: MUTED,
              letterSpacing: '0.5px',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {g.home_name}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
            {g.home_score ?? 0}
          </div>
        </div>

        {/* Divider */}
        <div style={{ fontSize: 14, fontWeight: 400, color: MUTED, flexShrink: 0 }}>–</div>

        {/* Away side */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: MUTED,
              letterSpacing: '0.5px',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {g.away_name}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
            {g.away_score ?? 0}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ── team_foul_comparison ──────────────────────────────────────────────────────

function TeamFoulComparison({ g }) {
  const label = g.period_label || `Q${g.period || 1}`;

  return (
    <Shell badge={`Team fouls — ${label}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Home side */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: MUTED,
              letterSpacing: '0.5px',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {g.home_name}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
            {g.home_fouls ?? 0}
          </div>
        </div>

        {/* Divider */}
        <div style={{ fontSize: 14, fontWeight: 400, color: MUTED, flexShrink: 0 }}>·</div>

        {/* Away side */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: MUTED,
              letterSpacing: '0.5px',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {g.away_name}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
            {g.away_fouls ?? 0}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function LowerThird({ graphic }) {
  if (!graphic?.type) return null;

  switch (graphic.type) {
    case 'player_intro':       return <PlayerIntro      g={graphic} />;
    case 'stat_callout':       return <StatCallout      g={graphic} />;
    case 'leading_scorer':     return <LeadingScorer    g={graphic} />;
    case 'quarter_recap':      return <QuarterRecap     g={graphic} />;
    case 'team_foul_comparison': return <TeamFoulComparison g={graphic} />;
    default: return null;
  }
}
