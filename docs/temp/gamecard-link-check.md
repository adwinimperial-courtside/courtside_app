# GameCard LiveBoxScore link check

## GameCard.jsx

grep -n "LiveBoxScore|boxscore|gameId" returned NO matches.

The earlier `find | xargs grep -l "LiveBoxScore|BoxScore"` was a FALSE POSITIVE.
GameCard.jsx contains `renderBoxScore` (an inline expand function for final games),
NOT a navigation link to the LiveBoxScore page.

GameCard renders an inline expandable box score directly — it does NOT link out
to /LiveBoxScore.

## PlayerNextGame.jsx — actual LiveBoxScore link

Line 31:
  onClick={() => navigate(createPageUrl(`LiveBoxScore?gameId=${nextGame.id}`))}

PlayerNextGame.jsx is the only component that navigates to /LiveBoxScore.
URL pattern: /LiveBoxScore?gameId=<uuid>

## Summary

| File | Links to /LiveBoxScore? | Notes |
|------|------------------------|-------|
| GameCard.jsx | No | Has inline renderBoxScore(), not a page link |
| PlayerNextGame.jsx | Yes | navigate(createPageUrl(`LiveBoxScore?gameId=${id}`)) |
| LiveBoxScore.jsx | — | The page itself, reads gameId from window.location.search |
