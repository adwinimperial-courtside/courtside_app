import React from "react";

// ─── ViewBox (landscape, FIBA 28:15 → scaled to 940×500) ───────────────────
// Full court: basket on LEFT at x=0, basket on RIGHT at x=940, baselines vertical.
// Half court: left half only, 470×500, basket on left.
export const FULL_W = 940;
export const FULL_H = 500;
export const HALF_W = 470;
export const HALF_H = 500;

const FILL = "#D4944C";
const S = { stroke: "white", strokeWidth: 2, fill: "none", strokeLinecap: "round" };

// ─── One basket end in landscape ───────────────────────────────────────────
// basketX: x-coord of the baseline (0 for left, 940 for right)
// sign:    +1 if lane extends to the right (left basket), -1 if to the left (right basket)
function CourtEnd({ basketX, sign }) {
  const rimX        = basketX + sign * 53;
  const backboardX  = rimX;
  const laneNear    = basketX;                  // lane meets baseline
  const laneFar     = basketX + sign * 193;     // FT line x
  const ftCx        = laneFar;
  const cornerNear  = basketX;
  const cornerFar   = basketX + sign * 93;

  // FT circle: solid half is toward basket (inside the lane); dashed half away
  // For left basket (sign=+1): solid = left half (x < ftCx); sweep=0 produces that arc
  // For right basket (sign=-1): solid = right half (x > ftCx); sweep=1
  const ftSolidSweep = sign > 0 ? 0 : 1;
  const ftDashSweep  = sign > 0 ? 1 : 0;
  const ftSolid = `M ${ftCx} 190 A 60 60 0 0 ${ftSolidSweep} ${ftCx} 310`;
  const ftDash  = `M ${ftCx} 190 A 60 60 0 0 ${ftDashSweep} ${ftCx} 310`;

  // Restricted area arc opens toward FT line
  const restrictSweep = sign > 0 ? 1 : 0;
  const restrict = `M ${rimX} 208 A 42 42 0 0 ${restrictSweep} ${rimX} 292`;

  // 3-pt arc: corner straights + arc. r=225 centered at (rimX, 250)
  // Left basket: straights at y=30 and y=470, from baseline (x=0) out to x=93; arc sweep=1
  // Right basket: straights from x=940 to x=847; arc sweep=0
  const threeSweep = sign > 0 ? 1 : 0;
  const threeArc =
    `M ${cornerNear} 30 L ${cornerFar} 30 ` +
    `A 225 225 0 0 ${threeSweep} ${cornerFar} 470 ` +
    `L ${cornerNear} 470`;

  return (
    <g>
      {/* Backboard (vertical line) */}
      <line x1={backboardX} y1={220} x2={backboardX} y2={280} stroke="white" strokeWidth={3} />

      {/* Rim */}
      <circle cx={rimX} cy={250} r={12} {...S} />

      {/* Lane rectangle — baseline side is the court edge, omit */}
      <line x1={laneNear} y1={168} x2={laneFar} y2={168} {...S} />
      <line x1={laneNear} y1={332} x2={laneFar} y2={332} {...S} />
      <line x1={laneFar}  y1={168} x2={laneFar} y2={332} {...S} />

      {/* FT circle halves */}
      <path d={ftSolid} {...S} />
      <path d={ftDash}  stroke="white" strokeWidth={2} fill="none" strokeDasharray="8 6" />

      {/* Restricted area */}
      <path d={restrict} {...S} />

      {/* 3-pt line (corner straights + arc) */}
      <path d={threeArc} {...S} />
    </g>
  );
}

function HalfCourtMarkings() {
  return (
    <g>
      <rect x={0} y={0} width={HALF_W} height={HALF_H} fill={FILL} />
      <rect x={0} y={0} width={HALF_W} height={HALF_H} stroke="white" strokeWidth={2} fill="none" />

      {/* Half-court line along the right edge; centre-circle half opens left */}
      <path d={`M ${HALF_W} 190 A 60 60 0 0 0 ${HALF_W} 310`} {...S} />

      <CourtEnd basketX={0} sign={1} />
    </g>
  );
}

function FullCourtMarkings() {
  return (
    <g>
      <rect x={0} y={0} width={FULL_W} height={FULL_H} fill={FILL} />
      <rect x={0} y={0} width={FULL_W} height={FULL_H} stroke="white" strokeWidth={2} fill="none" />

      {/* Half-court line (vertical) */}
      <line x1={470} y1={0} x2={470} y2={500} stroke="white" strokeWidth={2} />

      {/* Centre circle: left half solid, right half dashed */}
      <path d="M 470 190 A 60 60 0 0 0 470 310" {...S} />
      <path d="M 470 190 A 60 60 0 0 1 470 310"
            stroke="white" strokeWidth={2} fill="none" strokeDasharray="8 6" />
      <circle cx={470} cy={250} r={3} fill="white" />

      <CourtEnd basketX={0}       sign={1}  />
      <CourtEnd basketX={FULL_W}  sign={-1} />
    </g>
  );
}

export default function CourtSVG({ courtType }) {
  const isHalf = courtType === "half";
  const vbW = isHalf ? HALF_W : FULL_W;
  const vbH = isHalf ? HALF_H : FULL_H;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", touchAction: "none", userSelect: "none" }}
    >
      {isHalf ? <HalfCourtMarkings /> : <FullCourtMarkings />}
    </svg>
  );
}
