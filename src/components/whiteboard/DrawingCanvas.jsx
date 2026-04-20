import React, { useRef, useState, useCallback } from "react";

const ARROW_COLORS = ["#000000", "#22C55E", "#EF4444", "#FFFFFF"];

function arrowId(color) { return `wb-arrow-${color.replace("#", "")}`; }

function ArrowDefs() {
  return (
    <defs>
      {ARROW_COLORS.map((c) => (
        <marker key={c} id={arrowId(c)} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={c} />
        </marker>
      ))}
    </defs>
  );
}

function screenToSVG(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const { x, y } = pt.matrixTransform(ctm.inverse());
  return { x, y };
}

function Stroke({ stroke, isEraseMode, onErase }) {
  const mark = (stroke.type === "arrow" || stroke.type === "curve")
    ? `url(#${arrowId(stroke.color)})` : undefined;
  const base = {
    stroke: stroke.color,
    strokeWidth: 2.5,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: stroke.dashed ? "7 5" : undefined,
    markerEnd: mark,
    style: { cursor: isEraseMode ? "pointer" : "default", pointerEvents: isEraseMode ? "stroke" : "none" },
    onClick: isEraseMode ? () => onErase(stroke.id) : undefined,
  };
  const hitWidth = isEraseMode ? 10 : 2.5;

  if (stroke.type === "freehand") {
    if (!stroke.points || stroke.points.length < 2) return null;
    const d = stroke.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return <path d={d} {...base} strokeWidth={hitWidth} />;
  }
  if (stroke.type === "arrow") {
    const [a, b] = stroke.points;
    if (!a || !b) return null;
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...base} strokeWidth={hitWidth} />;
  }
  if (stroke.type === "curve") {
    const [a, c, b] = stroke.points;
    if (!a || !b) return null;
    const cx = c?.x ?? (a.x + b.x) / 2;
    const cy = c?.y ?? (a.y + b.y) / 2 - 40;
    return <path d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`} {...base} strokeWidth={hitWidth} />;
  }
  return null;
}

export default function DrawingCanvas({
  vbW, vbH,
  activeTool, drawColor, drawDashed,
  drawings, onDrawingsChange,
}) {
  const svgRef = useRef(null);
  const [current, setCurrent] = useState(null); // in-progress stroke

  const isDraw = activeTool !== "select";
  const isErase = activeTool === "eraser";

  const addStroke = (s) => onDrawingsChange([...drawings, s]);
  const removeStroke = (id) => onDrawingsChange(drawings.filter((d) => d.id !== id));

  const toPt = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    return screenToSVG(svgRef.current, e.clientX, e.clientY);
  };

  const onPointerDown = useCallback((e) => {
    if (!isDraw || isErase) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPt(e);
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (activeTool === "freehand") {
      setCurrent({ id, type: "freehand", points: [p], color: drawColor, dashed: drawDashed });
    } else if (activeTool === "arrow") {
      setCurrent({ id, type: "arrow", points: [p, p], color: drawColor, dashed: drawDashed });
    } else if (activeTool === "curve") {
      // Start drag: a=start, b=end (follows pointer); control point stays implicit until release
      setCurrent({ id, type: "curve", points: [p, null, p], color: drawColor, dashed: drawDashed });
    }
  }, [activeTool, drawColor, drawDashed, isDraw, isErase]);

  const onPointerMove = useCallback((e) => {
    if (!current) return;
    const p = toPt(e);
    setCurrent((prev) => {
      if (!prev) return null;
      if (prev.type === "freehand") {
        return { ...prev, points: [...prev.points, p] };
      }
      if (prev.type === "arrow") {
        return { ...prev, points: [prev.points[0], p] };
      }
      if (prev.type === "curve") {
        // During drag: curve bows perpendicular to the line for a natural look
        const a = prev.points[0];
        const mx = (a.x + p.x) / 2;
        const my = (a.y + p.y) / 2;
        // perpendicular offset (40 units)
        const dx = p.x - a.x, dy = p.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = 40;
        const cx = mx - (dy / len) * off;
        const cy = my + (dx / len) * off;
        return { ...prev, points: [a, { x: cx, y: cy }, p] };
      }
      return prev;
    });
  }, [current]);

  const onPointerUp = useCallback(() => {
    if (!current) return;
    // Drop degenerate strokes
    const valid =
      (current.type === "freehand" && current.points.length > 1) ||
      (current.type === "arrow" &&
        Math.hypot(current.points[1].x - current.points[0].x, current.points[1].y - current.points[0].y) > 3) ||
      (current.type === "curve" && current.points[2] &&
        Math.hypot(current.points[2].x - current.points[0].x, current.points[2].y - current.points[0].y) > 3);
    if (valid) addStroke(current);
    setCurrent(null);
  }, [current, drawings]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: isDraw ? "auto" : "none",
        touchAction: "none",
        cursor: isErase ? "pointer" : isDraw ? "crosshair" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <ArrowDefs />
      {drawings.map((s) => (
        <Stroke key={s.id} stroke={s} isEraseMode={isErase} onErase={removeStroke} />
      ))}
      {current && <Stroke stroke={current} isEraseMode={false} onErase={() => {}} />}
    </svg>
  );
}
