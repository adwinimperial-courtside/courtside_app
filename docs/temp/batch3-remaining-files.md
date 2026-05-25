# Batch 3 — Remaining Files Inventory

Searched `src/` for `bg-white | bg-gray-* | bg-slate-* | text-gray-* | text-slate-* | border-gray-* | border-slate-* | shadow-sm | shadow-md | shadow-lg | bg-zinc-* | text-zinc-*`. **92 files, ~970 total hits.**

Grouped below with a recommendation for each group.

---

## EXCLUDED per spec (do not touch)

All live-game files — user said leave on existing theme:

| File | Hits |
|---|---:|
| `src/pages/LiveGame.jsx` | 4 |
| `src/pages/LiveBoxScore.jsx` | 44 |
| `src/components/live/LiveStatTracker.jsx` | 74 |
| `src/components/live/ScoreHeader.jsx` | 18 |
| `src/components/live/EmergencyLineupRepair.jsx` | 17 |
| `src/components/live/StartingLineup.jsx` | 23 |
| `src/components/live/ClockDisplay.jsx` | 2 |
| `src/components/live/StatButtons.jsx` | 1 |
| `src/components/live/EndOfPeriodModal.jsx` | 4 |
| `src/components/live/PlayerSelector.jsx` | 5 |
| `src/components/live/LatestActivity.jsx` | 13 |

---

## shadcn UI primitives (`src/components/ui/*`) — recommend NOT touching

Already theme via CSS variables from the prior theme pass (`--background`, `--foreground`, `--border`, etc. in `index.css`). The hits here are mostly single `shadow-sm` fragments inside variant definitions. Touching them risks breaking all dialogs/popovers/inputs app-wide:

alert-dialog, button, context-menu (2), dialog, dropdown-menu (2), hover-card, input, input-otp, menubar (3), navigation-menu, popover, select (2), sheet, sonner, switch (2), textarea, toast, toggle — **21 files, ~27 hits**

---

## Already shipped pages (from prior batches) — only trailing refs

| File | Hits | Note |
|---|---:|---|
| `src/Layout.jsx` | 1 | likely one SidebarTrigger or leftover |
| `src/pages/Standings.jsx` | 1 | one leftover |
| `src/App.jsx` | 1 | single spinner class |

Minor cleanup pass — can patch in minutes.

---

## PAGES in Batch 3 user spec (ordered by steps)

### Step 2 — Admin Tools
| File | Hits |
|---|---:|
| `src/pages/AdminTools.jsx` | **47** |
| `src/components/admin/GameConfirmationModal.jsx` | 5 |

### Step 3 — Game Log
| File | Hits |
|---|---:|
| `src/pages/GameLog.jsx` | **35** |

### Step 4 — League Users
| File | Hits |
|---|---:|
| `src/pages/LeagueUsers.jsx` | **51** |

### Step 5 — Award Settings
| File | Hits |
|---|---:|
| `src/pages/LeagueAwardSettings.jsx` | **26** |

### Step 6 — Application Review
| File | Hits |
|---|---:|
| `src/pages/ApplicationReview.jsx` | 19 |

### Step 7 — Player Profile
| File | Hits |
|---|---:|
| `src/pages/PlayerProfile.jsx` | 7 |
| `src/components/player/PlayerDashboardCard.jsx` | 15 |
| `src/components/player/PlayerLastGame.jsx` | 4 |
| `src/components/player/PlayerNextGame.jsx` | 9 |
| `src/components/player/PlayerTrendCard.jsx` | 1 |
| `src/components/player/PlayerAchievements.jsx` | 5 |
| `src/components/player/BadgeCard.jsx` | 13 |

### Step 8 — Remaining pages
| File | Hits |
|---|---:|
| `src/pages/Coaches.jsx` | 5 |
| `src/components/admin/CoachesView.jsx` | 12 |
| `src/pages/Viewers.jsx` | 5 |
| `src/components/admin/ViewersView.jsx` | 12 |
| `src/pages/Whiteboard.jsx` | 17 |
| `src/components/whiteboard/DrawingToolbar.jsx` | 7 |
| `src/components/whiteboard/SavePlayDialog.jsx` | 3 |
| `src/components/whiteboard/LoadPlayDialog.jsx` | 6 |
| `src/pages/CoachInsights.jsx` | **76** |
| `src/pages/ApplyForLeague.jsx` | 31 |
| `src/pages/FixManualStats.jsx` | 11 |
| `src/pages/LeagueIDs.jsx` | 3 |
| `src/pages/SimulateUser.jsx` | 15 |
| `src/pages/RoleSelection.jsx` | 8 |
| `src/pages/LeagueApplication.jsx` | 11 |
| `src/pages/PendingApproval.jsx` | 6 |
| `src/pages/AcceptInvite.jsx` | 12 |
| `src/pages/Landing.jsx` | 0 | already dark (no hits) |

### Not in Step 8 spec but still light
| File | Hits | Suggestion |
|---|---:|---|
| `src/pages/Players.jsx` | 2 | probably route-only, quick |
| `src/pages/Leagues.jsx` | 9 | likely used |
| `src/pages/Teams.jsx` | 12 | likely used |
| `src/components/leagues/CreateLeagueDialog.jsx` | 2 | dialog |
| `src/components/leagues/LeagueCard.jsx` | 5 | used by Leagues |
| `src/components/teams/TeamCard.jsx` | 5 | used by Teams |
| `src/components/teams/TeamDetailView.jsx` | 27 | big component |
| `src/components/teams/PlayerCard.jsx` | 4 | used by TeamDetailView |
| `src/components/teams/PlayerTableInput.jsx` | 8 | used by TeamDetailView |
| `src/pages/LeagueSelection.jsx` | 0 | already dark |
| `src/components/auth/LoginPage.jsx` | 10 | auth flow |
| `src/components/UserNotRegisteredError.jsx` | 4 | error state |
| `src/components/schedule/DefaultWinnerDialog.jsx` | 10 | GameCard modal |
| `src/components/schedule/CreateGameDialog.jsx` | 5 | Schedule modal |
| `src/components/schedule/EditGameSettingsDialog.jsx` | 5 | GameCard modal |
| `src/components/schedule/POGSpotlightModal.jsx` | 3 | modal |
| `src/components/layout/DevicePreviewToggle.jsx` | 4 | admin FAB (quick) |
| `src/components/layout/ImpersonationBanner.jsx` | 3 | banner (quick) |
| `src/lib/PageNotFound.jsx` | 7 | 404 page |

### Dead code (confirmed not imported in prior batch) — recommend skip

Skipping saves ~20% of the effort:

- `src/components/stats/TeamStats.jsx` (11)
- `src/components/stats/PlayerStats.jsx` (16)
- `src/components/stats/LeagueLeaders.jsx` (5)
- `src/components/stats/GameStats.jsx` (22)
- `src/components/stats/TeamStandings.jsx` (9)
- `src/components/stats/MobileAwardCards.jsx` (10)
- `src/components/stats/mobile/MobileTeamStats.jsx` (15)
- `src/components/stats/mobile/MobilePlayerStats.jsx` (19)
- `src/components/stats/mobile/MobileLeagueLeaders.jsx` (6)
- `src/components/stats/mobile/MobileGameStats.jsx` (15)
- `src/components/player/PlayerQuickStats.jsx` (4)
- `src/components/player/PlayerRecognition.jsx` (2)

---

## ⚠️ Scope reality check

**In-scope now (recommended): ~50 files, ~630 hits.** That is a large amount of UI work even with focused rewrites. Realistic completion estimate: multiple hours of edits, and I can't visually verify anything — the build passing just means the code compiles.

**Highest-value subset if you want to prioritize:**

1. **High user impact** (everyday pages)
   - `LeagueUsers` (51), `GameLog` (35), `AdminTools` (47), `LeagueAwardSettings` (26), `ApplicationReview` (19)

2. **Medium impact** (player / approval flows)
   - `PlayerProfile` + `PlayerDashboardCard` + `PlayerLastGame/NextGame/TrendCard/Achievements/BadgeCard`
   - `CoachInsights` (76) — large but only 1 file
   - `ApplyForLeague`, `RoleSelection`, `LeagueApplication`, `PendingApproval`, `AcceptInvite`, `SimulateUser`

3. **Low impact / straightforward** (small pages + admin views)
   - `Coaches`/`CoachesView`, `Viewers`/`ViewersView`, `Whiteboard` + toolbar, `FixManualStats`, `LeagueIDs`
   - `Players`, `Leagues`, `Teams` + team components
   - `LoginPage`, `UserNotRegisteredError`, `PageNotFound`

4. **Quick trailing cleanup**
   - `Layout.jsx` (1), `Standings.jsx` (1), `App.jsx` (1), `ImpersonationBanner` (3), `DevicePreviewToggle` (4)
   - Schedule modals (`CreateGameDialog`, `EditGameSettingsDialog`, `DefaultWinnerDialog`, `POGSpotlightModal`)

5. **Dead code** — SKIP (12 files)

6. **Excluded** — live/*, ui/*

---

## Recommendations for how to proceed

**Option A — Full sweep (user spec as written).** I'll work through steps 2–10 in order, committing to batch as the spec. I'll take conservative shortcuts where safe (e.g., reuse the shared DropdownPill pattern from Statistics/Schedule, reuse the HeroCard pattern from AwardLeaders where it fits). Expect multiple large writes. You confirm before I start.

**Option B — Split into sub-batches.** I do just steps 2–4 (Admin Tools + Game Log + League Users = the heaviest pages, ~133 hits) in this turn, then stop for your review. Next turn we do 5–7, then 8, etc. Lower risk, easier to review.

**Option C — Pragmatic priority pass.** Only the high/medium-impact pages (~10 files). Skip Whiteboard drawing chrome, Teams/Leagues admin pages, and auth/error screens. Call them out as "remaining trailing work" at the end.

Awaiting your call on which route. Default if you just say "go" will be **Option B** — tightest-reviewed approach.
