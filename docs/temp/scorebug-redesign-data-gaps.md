# Scorebug Redesign — Data Gaps
Date: 2026-05-26

## 1. League name / abbreviation / color
**Gap**: `useGameOverlayData` queries games with `select('*, home_team:..., away_team:...')` —
no `league:leagues!league_id(...)` join. `game.league` is undefined.
**Mitigation**: Header strip renders with fallback chip (#3B82F6, "LG", "LEAGUE").
**Fix when ready**: Add `league:leagues!league_id(id, name, short_name, color)` to the
select in `useGameOverlayData.js` and pass through.

## 2. Crew name / crew logo URL
**Gap**: `crew_name` and `crew_logo_url` live in `broadcastState` (from `useBroadcastState`),
not in `useGameOverlayData`. Scorebug currently receives no `broadcastState` props.
**Mitigation**: Pass `crewName={broadcastState.crew_name}` from LiveGameOverlay to Scorebug.
No hook changes needed.

## 3. Period type (quarters vs halves)
**Available** via `game.game_rules?.period_type` — falls back to `'quarters'` if not set.
Not a gap; handled inline in Scorebug.

## 4. Timeout segment logic
**Available**: `game.home_timeouts` / `game.away_timeouts` are jsonb maps keyed by
`'FIRST_HALF'`, `'SECOND_HALF'`, or `'OVERTIME'`. Max timeouts per segment:
- FIRST_HALF: 2
- SECOND_HALF: 2 (halves) or 3 (quarters)
- OVERTIME: 1
Implemented with the same segment logic as ScoreHeader.

## 5. Fouls per period
**Available**: `game.home_team_fouls` / `game.away_team_fouls` jsonb maps keyed by period.
Quarters: `"1"` `"2"` `"3"` `"4"`. Halves: `"h1"` `"h2"`. OT: String(period).
Implemented with the same key logic as LiveStatTracker.

## 6. Team logo images
**Not implemented**: spec says colored squares only. Real logos come when avatars
bucket exists (future phase).
