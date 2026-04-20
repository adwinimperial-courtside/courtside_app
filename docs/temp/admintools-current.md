# AdminTools.jsx — Current State

## File: src/pages/AdminTools.jsx
- 446 lines, entirely base44 (broken)
- Imports: ManualGameEntry, StatIntegrityChecker, EditGameEntry, DeleteGameEntry, findPlayerOfGame

## Sections
1. **Manual Game Entry** — create a game record manually (entry_type = 'manual')
2. **Edit Game** — edit an existing game's scores/metadata
3. **Delete Game** — delete a game record
4. **Recalculate** (app_admin only) — recalculate standings/stats from game_logs

## Sub-components (all in same file or imported)
- ManualGameEntry — form to create game
- EditGameEntry — form to edit game
- DeleteGameEntry — confirm + delete game
- StatIntegrityChecker — validate game_logs integrity
- findPlayerOfGame — helper to find player_of_game for a game

## Status
NOT yet rebuilt. All functionality is base44 and non-functional.
