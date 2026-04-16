/Users/macm5pro/Projects/courtside/src/components/schedule/GameCard.jsx:331:                    View Live

--- CONTEXT (GameCard.jsx line 324-333) ---

"View Live" button appears when game.status === "live"
BUT it calls onStartGame (not navigate to LiveBoxScore).
onStartGame is passed as a prop from Schedule.jsx — it opens the LiveGame admin tracker.

LiveBoxScore (/LiveBoxScore?gameId=...) is NOT linked from Schedule or GameCard.
The "View Live" label is misleading — it goes to the admin LiveGame page, not the spectator LiveBoxScore page.

GameCard has its own inline box score (renderBoxScore) that expands for final games.
That is the only box score experience available from the schedule view.
