import React from "react";
import { MousePointer2, Pencil, ArrowRight, Spline, Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOLS = [
  { id: "select",   icon: MousePointer2, label: "Select / Move" },
  { id: "freehand", icon: Pencil,        label: "Freehand" },
  { id: "arrow",    icon: ArrowRight,    label: "Arrow" },
  { id: "curve",    icon: Spline,        label: "Curved arrow" },
  { id: "eraser",   icon: Eraser,        label: "Eraser" },
];

const COLORS = [
  { hex: "#000000", label: "Black" },
  { hex: "var(--ct-success)", label: "Green" },
  { hex: "var(--ct-danger)", label: "Red" },
  { hex: "#FFFFFF", label: "White" },
];

export default function DrawingToolbar({
  activeTool, onToolChange,
  drawColor, onColorChange,
  drawDashed, onDashedChange,
  onClearDrawings,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Tools */}
      <div className="flex items-center gap-1 rounded-lg border border-[var(--ct-border)] p-1 bg-[var(--ct-bg-card)]">
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            title={label}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
              activeTool === id ? "bg-orange-500 text-white" : "text-[var(--ct-text-secondary)] hover:bg-[var(--ct-bg-elevated)]"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[var(--ct-bg-elevated)]" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {COLORS.map(({ hex, label }) => (
          <button
            key={hex}
            onClick={() => onColorChange(hex)}
            title={label}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              drawColor === hex ? "ring-2 ring-offset-1 ring-orange-500 border-white" : "border-[var(--ct-border)]"
            }`}
            style={{ background: hex }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-[var(--ct-bg-elevated)]" />

      {/* Dashed toggle */}
      <button
        onClick={() => onDashedChange(!drawDashed)}
        className={`h-9 px-3 rounded-md text-xs font-medium transition-colors ${
          drawDashed ? "bg-orange-500 text-white" : "bg-[var(--ct-bg-card)] border border-[var(--ct-border)] text-[var(--ct-text-secondary)] hover:bg-[var(--ct-bg-elevated)]"
        }`}
        title="Toggle dashed lines"
      >
        {drawDashed ? "Dashed" : "Solid"}
      </button>

      <div className="flex-1" />

      {/* Clear */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearDrawings}
        className="h-9 text-[var(--ct-text-secondary)] hover:text-red-600"
        title="Clear all drawings"
      >
        <Trash2 className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">Clear</span>
      </Button>
    </div>
  );
}
