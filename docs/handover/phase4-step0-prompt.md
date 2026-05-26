# Live Game Overlay — Phase 4 Step 0 (lower thirds discovery + scope proposal)

## Model
Sonnet 4.6. This is a read-only discovery pass — no code, no migrations, no commits.

## Context
Phases 1-3 of the Live Game Overlay are shipped and merged to main. Phase 4 introduces "lower thirds" — 5 triggered graphics with animations that appear briefly over the live broadcast (e.g. player intro card, stat callout) and then auto-fade. No formal spec file exists for which 5 graphics; this prompt asks you to investigate and propose.

## Hard rules
- Work in /Users/macm5pro/Projects/courtside. No worktrees.
- READ ONLY. Do not modify any files. Do not run migrations. Do not commit.
- Phase 5 (full-screen graphics) is NOT in scope for Phase 4.
- LiveStatTracker is untouched.

## What to do
Read in full:
    - docs/Handover/overlay-checkpoint-post-phase3.md (latest checkpoint)
    - docs/Handover/overlay-phase3-complete.md
    - docs/Handover/overlay-phase1-complete.md
    - docs/Handover/overlay-broadcast-menu.md
    - All four broadcast migrations under supabase/migrations/2026052600000*.sql
    - src/hooks/useBroadcastState.js
    - src/components/broadcast/Scorebug.jsx
    - src/components/broadcast/BroadcasterLogo.jsx
    - src/components/broadcast/StreamerBar.jsx
    - src/pages/LiveGameOverlay.jsx
    - src/pages/OverlayControl.jsx

Also search the repo for any string matching "lower third", "lower_third", "lowerthird" (case-insensitive) to find any existing references to Phase 4 scope.

Then propose to Win, formatted in clear sections:
    1. Current state of broadcast_state (columns, defaults) including the existing current_graphic column that was added in Phase 1 — explain what it appears designed to do based on usage.
    2. A proposed list of 5 lower thirds for Phase 4, with one sentence each on what the broadcast use case is. Examples to consider (you choose the 5 you'd recommend): player intro on substitution, stat callout (PTS/REB/AST), team comparison, leading scorer, lineup announcement, quarter recap, coach lower third, key matchup. Justify your picks based on what's most valuable for a basketball broadcast at this league level.
    3. Proposed schema changes for broadcast_state needed to support lower thirds (active_lower_third, payload, started_at, duration_ms, or whatever shape you propose). Justify the design.
    4. Proposed animation approach (framer-motion patterns — entrance, dwell, exit) — keep consistent with the StreamerBar pattern already established.
    5. Where the triggers live: in the existing OverlayControl page or a new tab/section within it. Propose the UX briefly.
    6. Auto-fade behaviour: are lower thirds always auto-fade, or some auto + some manual-dismiss?
    7. Any ambiguity you want Win to resolve before the implementation prompt is written.

STOP. Wait for Win to review and respond. Do not start implementation in this session.
