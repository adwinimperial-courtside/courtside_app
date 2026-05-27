import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

/**
 * DropdownPill — a pill-shaped button that opens a floating menu.
 *
 * The menu is rendered via createPortal into document.body so it escapes
 * any overflow-clipping ancestor (e.g. a filter row with overflow-x:auto,
 * which the browser silently coerces to overflow-y:auto, clipping
 * position:absolute children that extend below the container).
 *
 * Props:
 *   label      — button text
 *   options    — [{ id, label }]
 *   selectedId — currently selected option id
 *   onChange   — (id) => void
 *   active     — when true, uses accent colour for the button
 */
export default function DropdownPill({
  label,
  options,
  selectedId,
  onChange,
  active = false,
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, minWidth: 220 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // Recompute menu position from the button's viewport rect.
  const reposition = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,               // 4 px gap below button
      left: r.left,
      minWidth: Math.max(r.width, 220),
    });
  };

  // Reposition on open, and keep in sync during resize/scroll.
  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true); // capture to catch any ancestor scroll
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  // Close on outside click. Menu is portaled, so check both refs.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
        style={{
          background: active ? "var(--ct-accent)" : "var(--ct-bg-elevated)",
          color:      active ? "#ffffff" : "var(--ct-text-secondary)",
          border:     "none",
          cursor:     "pointer",
          maxWidth:   220,
          minHeight:  32,
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="rounded-xl p-2"
            style={{
              position:  "fixed",
              top:       menuPos.top,
              left:      menuPos.left,
              minWidth:  menuPos.minWidth,
              zIndex:    1000,
              background: "var(--ct-bg-card)",
              border:    "1px solid var(--ct-border)",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.6)",
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            {options.map((opt) => {
              const sel = opt.id === selectedId;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap block"
                  style={{
                    background: "transparent",
                    color:      sel ? "var(--ct-accent)" : "var(--ct-text-secondary)",
                    border:     "none",
                    cursor:     "pointer",
                    fontWeight: sel ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!sel) {
                      e.currentTarget.style.background = "var(--ct-bg-elevated)";
                      e.currentTarget.style.color = "var(--ct-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!sel) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--ct-text-secondary)";
                    }
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
