import React from "react";
import { format } from "date-fns";

/**
 * Horizontal scrollable score-strip for the Schedule page.
 * Each tile is compact — team initials + score (or time/status) — and tapping
 * a tile smooth-scrolls to that game's full card via `onTileClick(gameId)`.
 */
export default function ScoreStrip({ games, livePeriods = {}, onTileClick }) {
  if (!games || games.length === 0) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {games.map((g) => {
        const isLive = g.status === "live";
        const isFinal = g.status === "final";
        const isScheduled = g.status === "scheduled";
        const homeScore = g.home_score || 0;
        const awayScore = g.away_score || 0;
        const homeWon = isFinal && homeScore > awayScore;
        const awayWon = isFinal && awayScore > homeScore;
        const period = livePeriods[g.id];

        return (
          <button
            key={g.id}
            onClick={() => onTileClick?.(g.id)}
            className="flex-shrink-0 rounded-lg text-left transition-colors hover:opacity-90"
            style={{
              width: 148,
              background: "var(--ct-bg-card)",
              border: isLive
                ? "1px solid var(--ct-danger)"
                : "1px solid var(--ct-border)",
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            {/* status */}
            <div className="flex items-center justify-between mb-1.5">
              {isLive ? (
                <span className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--ct-danger)" }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--ct-danger)" }}
                  >
                    Live{period ? ` · Q${period}` : ""}
                  </span>
                </span>
              ) : isFinal ? (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--ct-text-muted)" }}
                >
                  Final
                </span>
              ) : isScheduled && g.scheduled_at ? (
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "var(--ct-accent)" }}
                >
                  {format(new Date(g.scheduled_at), "EEE HH:mm")}
                </span>
              ) : (
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: "var(--ct-text-muted)" }}
                >
                  {g.status}
                </span>
              )}
            </div>

            {/* away row */}
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: g.away_team?.color || "var(--ct-accent)" }}
              />
              <span
                className="flex-1 text-xs truncate"
                style={{
                  color: isFinal && !awayWon ? "var(--ct-text-muted)" : "var(--ct-text-primary)",
                  fontWeight: awayWon ? 700 : 500,
                }}
              >
                {g.away_team?.short_name || g.away_team?.name?.slice(0, 3).toUpperCase() || "?"}
              </span>
              {(isLive || isFinal) && (
                <span
                  className="text-sm font-bold tabular-nums flex-shrink-0"
                  style={{
                    color: isLive
                      ? "var(--ct-success)"
                      : awayWon
                      ? "var(--ct-text-primary)"
                      : "var(--ct-text-muted)",
                  }}
                >
                  {awayScore}
                </span>
              )}
            </div>

            {/* home row */}
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: g.home_team?.color || "var(--ct-accent)" }}
              />
              <span
                className="flex-1 text-xs truncate"
                style={{
                  color: isFinal && !homeWon ? "var(--ct-text-muted)" : "var(--ct-text-primary)",
                  fontWeight: homeWon ? 700 : 500,
                }}
              >
                {g.home_team?.short_name || g.home_team?.name?.slice(0, 3).toUpperCase() || "?"}
              </span>
              {(isLive || isFinal) && (
                <span
                  className="text-sm font-bold tabular-nums flex-shrink-0"
                  style={{
                    color: isLive
                      ? "var(--ct-success)"
                      : homeWon
                      ? "var(--ct-text-primary)"
                      : "var(--ct-text-muted)",
                  }}
                >
                  {homeScore}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
