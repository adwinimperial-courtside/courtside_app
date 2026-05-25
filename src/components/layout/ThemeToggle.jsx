import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Theme toggle — flips <html data-theme> between absent (Dark Court) and "light"
// (Warm Sand). Persists choice in localStorage key `courtside-theme` with value
// "dark" or "light".
//
// The initial DOM attribute is set by the inline no-flash script in index.html
// before React mounts; this component just syncs React state + handles clicks.
//
// Icon convention: Sun icon is shown while dark is active (tap to go light),
// Moon icon is shown while light is active (tap to go dark).

const STORAGE_KEY = "courtside-theme";

function readInitialTheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readInitialTheme);

  // Keep React state in sync if the attribute was set by the inline script.
  useEffect(() => {
    setTheme(readInitialTheme());
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode etc.) — non-fatal
    }
  };

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
      style={{
        background: "var(--ct-bg-elevated)",
        color: "var(--ct-text-secondary)",
        border: "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ct-border)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ct-bg-elevated)")}
    >
      <Icon size={18} />
    </button>
  );
}
