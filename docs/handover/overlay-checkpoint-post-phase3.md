# Live Game Overlay — Post-Phase-3 Checkpoint

**Date:** 2026-05-26
**Branch:** feature/live-game-overlay (merged to main with --no-ff)
**Status:** Phases 1, 2, 3 + Phase 3 amendment all shipped. Live Game Overlay v1 is complete.

---

## Where we are

The Live Game Overlay v1 is feature-complete:

- **Top-left:** pulsing LIVE badge + "Powered by Courtside-by-AI" credit (always visible, locked)
- **Top-right:** big broadcaster logo (112×112, 24px padding from edges, drop shadow, toggleable)
- **Bottom-right:** scorebug — league chip → home/away rows → timeouts/fouls strip → text-only crew strip
- **Bottom full-width:** scrolling streamer ticker (56px tall, scrolls right-to-left in a 30-second loop, toggleable)
- **Control panel** at /overlay/:gameId/control — admin-gated, drives all of the above via realtime broadcast_state writes

---

## What shipped in this session

- Avatars Supabase Storage bucket (public read, league-scoped writes)
- broadcast_state schema additions: crew_logo_visible, streamer_visible, streamer_text
- /overlay/:gameId/control admin-gated control panel (src/pages/OverlayControl.jsx)
- BroadcasterLogo component (src/components/broadcast/BroadcasterLogo.jsx)
- StreamerBar component (src/components/broadcast/StreamerBar.jsx) — framer-motion marquee
- Crew strip refactor: text-only, no logo image, no amber initial square
- LiveGameOverlay visibility state machine (master + 3 subs)
- Scorebug auto-shifts up 64px when streamer is visible
- BroadcastActionsMenu: "Open control panel" item added

---

## Decisions locked in this session — do not re-debate

- ONE confirmation gate per Claude Code session (Step 0 scope check only). Steps 1+ run continuously.
- Split-prompt workflow: send Step 0 first, review, then send Steps 1-End in the same Claude Code session (file reads stay in context).
- Visibility toggle model: overlay_visible is master; scorebug_visible, crew_logo_visible, streamer_visible are subs that dim out when master is off.
- LIVE badge: always visible. No toggle. Locked.
- Crew identity: per-game (no broadcast_crews table).
- Overlay reconnection: silent — keep showing last known state.
- Broadcaster logo: top-right, 112×112, 24px padding, drop shadow.
- Streamer: full-width bottom strip, 56px tall, scrolling marquee, 30-second loop, single message at a time.
- No formal spec file exists for the overlay work. The broadcast_state schema columns are the de facto spec going forward.
- Migration naming: timestamp convention continues. Last applied: 20260526000004.

---

## Known gaps and things to revisit

- **Marquee speed is content-length-relative.** Short messages traverse the screen faster than long ones because the architecture is two-copies-back-to-back with x: 0% → -50%. For consistent screen-relative speed, the implementation would need to measure rendered text width and compute duration dynamically. Acceptable for v1.
- **Orphan logo files.** If a user uploads a logo then leaves the control panel before pressing Save, the file lives in the avatars bucket with no DB reference. Future cleanup task.
- **docs/Handover/ vs docs/handover/ casing.** macOS is case-insensitive, git tracks lowercase. Cleanup item.
- **OBS verification.** Win confirmed "tested well" but the formal OBS-over-coloured-background test should be repeated after the merge to main as a final smoke test.

---

## On the horizon

- **Phase 4: Lower thirds** — 5 triggered graphics with animations (next up; see docs/Handover/phase4-step0-prompt.md)
- **Phase 5: Full-screen graphics** — 4 manual-dismiss takeover cards
- **Phase 6: Polish** — animation tuning, fallbacks, reconnection edge cases
- **BroadcastActionsMenu placement on LiveGame read-only scoreboard** — page may not exist yet
- **Phase 4 prep open questions** (from earlier checkpoint, still pending):
    - Player intro stats source: season vs game-so-far?
    - Quarter-summary auto-suggest: pulse hint vs fully manual?

---

## Session lessons learned

- Split-prompt workflow saves tokens AND lets chat-side review catch spec mismatches before the implementation prompt is even written.
- Embed visual specs line by line in prompts. Generic "build the X" tasks let Claude Code freelance the visuals — seen repeatedly across Phase 2 and Phase 3.
- When no spec file exists, schema columns from previous phases become the de facto spec. Works for small features, risky for bigger ones.
- Master/sub toggle pattern is a clean primitive — currently 1 master + 3 subs, extensible to more.
- Scope expansion mid-build is fine on a single feature branch if nothing has been pushed yet. Roll into the same branch as additional commits.

---

## Recommended models

- Sonnet 4.6 — single-route or single-component work, no fancy animation
- Opus 4.7 — multi-file work with visual polish or animation requirements

---

## How to start the next chat

1. Attach AccountBriefingProtoMax.md and courtside-credentials-reference.txt (as always)
2. Attach this checkpoint
3. Open with: "Continuing Live Game Overlay — Phase 4 (lower thirds) is next. The Step 0 draft is at docs/Handover/phase4-step0-prompt.md — refine if needed, then send to Claude Code."

---

## Quick reference

    main is now at the merge commit for feature/live-game-overlay (--no-ff merge)
    Latest broadcast migration applied: 20260526000004_broadcast_state_marketing.sql
    Avatars bucket exists on Supabase project bikjkoyodkduhnnlbzpb
