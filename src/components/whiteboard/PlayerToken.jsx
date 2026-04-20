import React, { useCallback, useRef } from "react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const R = 20;

// Convert a pointer event's screen coords to SVG viewBox coords
function screenToSVG(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const { x, y } = pt.matrixTransform(ctm.inverse());
  return { x, y };
}

export default function PlayerToken({
  token,
  vbW,
  vbH,
  isDrawMode,
  onDrag,
  ballAttachedTo,
}) {
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const isOffense = token.id.startsWith("o");
  const num = parseInt(token.id.slice(1), 10);
  const color = isOffense ? "#3B82F6" : "#EF4444";
  const label = POSITIONS[num - 1] || "";
  const hasBall = ballAttachedTo === token.id;

  const onPointerDown = useCallback(
    (e) => {
      if (isDrawMode) return;
      e.stopPropagation();
      const svgEl = e.currentTarget.ownerSVGElement;
      if (!svgEl) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      isDragging.current = true;
      const p = screenToSVG(svgEl, e.clientX, e.clientY);
      offset.current = { x: token.x - p.x, y: token.y - p.y };
    },
    [isDrawMode, token.x, token.y]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!isDragging.current) return;
      const svgEl = e.currentTarget.ownerSVGElement;
      if (!svgEl) return;
      const p = screenToSVG(svgEl, e.clientX, e.clientY);
      const nx = Math.max(R, Math.min(vbW - R, p.x + offset.current.x));
      const ny = Math.max(R, Math.min(vbH - R, p.y + offset.current.y));
      onDrag(token.id, nx, ny, false);
    },
    [vbW, vbH, token.id, onDrag]
  );

  const onPointerUp = useCallback(
    (e) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const svgEl = e.currentTarget.ownerSVGElement;
      if (!svgEl) return;
      const p = screenToSVG(svgEl, e.clientX, e.clientY);
      const nx = Math.max(R, Math.min(vbW - R, p.x + offset.current.x));
      const ny = Math.max(R, Math.min(vbH - R, p.y + offset.current.y));
      onDrag(token.id, nx, ny, true);
    },
    [vbW, vbH, token.id, onDrag]
  );

  return (
    <g
      style={{ cursor: isDrawMode ? "default" : "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <circle cx={token.x + 1.5} cy={token.y + 1.5} r={R} fill="rgba(0,0,0,0.25)" />
      <circle cx={token.x} cy={token.y} r={R} fill={color} stroke="white" strokeWidth={2} />
      {hasBall && (
        <circle cx={token.x} cy={token.y} r={R + 4} fill="none"
                stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3" />
      )}
      <text x={token.x} y={token.y + 1} textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize={14} fontWeight="700"
            style={{ pointerEvents: "none", userSelect: "none" }}>
        {num}
      </text>
      <text x={token.x} y={token.y + R + 10} textAnchor="middle"
            fill={color} fontSize={9} fontWeight="700"
            style={{ pointerEvents: "none", userSelect: "none" }}>
        {label}
      </text>
    </g>
  );
}
