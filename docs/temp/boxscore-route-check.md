/Users/macm5pro/Projects/courtside/src/components/schedule/GameCard.jsx
/Users/macm5pro/Projects/courtside/src/components/player/PlayerNextGame.jsx
/Users/macm5pro/Projects/courtside/src/pages/LiveBoxScore.jsx

--- ROUTING ANALYSIS ---

LiveBoxScore is registered via pages.config.js auto-generated page registry.
Route path: /LiveBoxScore (dynamic route via pagesConfig.Pages in App.jsx line 59)

Files referencing LiveBoxScore:
- src/pages/LiveBoxScore.jsx        — the page itself
- src/components/schedule/GameCard.jsx   — links to it
- src/components/player/PlayerNextGame.jsx — links to it

NOT in: App.jsx hardcoded routes, router.jsx, routes.jsx (those files don't exist)
Pages are auto-registered: any file in src/pages/ is picked up by pages.config.js
and mounted at /<PageName> via the dynamic <Route> on App.jsx line 59.
