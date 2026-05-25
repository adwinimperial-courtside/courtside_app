# Theme Toggle — Current State

## Scope

**70 JSX files contain hardcoded Dark Court hex values** (1,191 total occurrences), excluding `live/*`, `LiveBoxScore`, `LiveGame`, and `components/ui/*`. Full list below.

**`index.html` exists at project root** (not `public/`). Currently minimal — just root div + main.jsx. Needs an inline script in `<head>` for no-flash theme application.

---

## Key files

### `src/styles/theme.css` (84 lines)
Already defines semantic CSS vars (`--color-bg-page`, `--color-bg-card`, `--color-bg-elevated`, `--color-accent`, `--color-accent-gold`, `--color-text-primary/secondary/muted`, `--color-border`, `--color-success`, `--color-danger`) — on `:root` only, no theme switching. Also contains `.live-game-isolate` class (resets everything back to light shadcn defaults) + hardcoded scrollbar + selection colors.

**Plan:** rename `--color-*` vars to `--ct-*` per spec, keep both as duplicate/alias, and add `html[data-theme="light"]` overrides for Warm Sand.

### `src/index.css` (86 lines)
Defines **shadcn** vars in **HSL space-separated format** (e.g. `240 27% 8%`), on both `:root` and `.dark`. Has `body { @apply bg-background text-foreground }`.

**Plan:** add `html[data-theme="light"]` block overriding every shadcn var with HSL conversions of the Warm Sand hex values.

### `src/Layout.jsx` (226 lines)
Already uses `var(--color-bg-page/card/elevated/border/text-primary/secondary/muted)` in inline styles extensively. Has one literal `#2A2A42` (preview frame wrapper) and one `#3B82F6` (SidebarTrigger hover class). Will need to switch those to `var(--ct-*)` references.

### `src/components/layout/SidebarMenuContent.jsx` (143 lines)
Uses hardcoded `#3B82F6`, `#A0A0B8`, `#2A2A42`, `#6B6B80` in inline `style={{ color/background }}` and one class `style={{ color: "#6B6B80" }}` on group labels.

### `src/components/layout/BottomTabBar.jsx` (57 lines)
5 hardcoded hex values: bg `#1A1A2E`, border `#2A2A42`, active `#3B82F6`, inactive `#6B6B80`.

### `src/components/layout/MobileMoreDrawer.jsx` (143 lines)
Hardcoded `#3B82F6`, `#F0F0F5`, `#2A2A42`, `#6B6B80`, `#A0A0B8`, plus `rgba(15, 15, 26, 0.6)` overlay color.

---

## The 70 files that need conversion

### Pages (28)
- Schedule, Standings, Statistics, AwardLeaders, Home, PlayerProfile
- AdminTools, GameLog, LeagueUsers, LeagueAwardSettings, ApplicationReview, ApplyForLeague, LeagueApplication, LeagueIDs, SimulateUser
- Coaches, Viewers, Players, Leagues, Teams, FixManualStats, CoachInsights, Whiteboard
- AcceptInvite, PendingApproval, RoleSelection

### Components (42)
- Layout chrome: SidebarMenuContent, BottomTabBar, MobileMoreDrawer, DevicePreviewToggle, ImpersonationBanner
- Admin: CoachesView, ViewersView, GameConfirmationModal
- Auth: LoginPage, UserNotRegisteredError
- Leagues: CreateLeagueDialog, LeagueCard
- Player: BadgeCard, PlayerAchievements, PlayerDashboardCard, PlayerLastGame, PlayerNextGame, PlayerQuickStats, PlayerRecognition
- Schedule: CreateGameDialog, DefaultWinnerDialog, EditGameSettingsDialog, GameCard, POGSpotlightModal
- Stats: AwardLeaders, GameStats, LeagueLeaders, MobileAwardCards, PlayerStats, TeamStandings, TeamStats, mobile/{Game,League,Player,Team}Stats
- Teams: PlayerCard, PlayerTableInput, TeamCard, TeamDetailView
- Whiteboard: DrawingCanvas, DrawingToolbar, LoadPlayDialog, PlayerToken, SavePlayDialog

### Files NOT in scope (preserve current theming)
- `src/components/live/*` (11 files — LiveStatTracker, ScoreHeader, LatestActivity, ClockDisplay, StatButtons, PlayerSelector, StartingLineup, EmergencyLineupRepair, EndOfPeriodModal)
- `src/pages/LiveGame.jsx`, `src/pages/LiveBoxScore.jsx`
- `src/components/ui/*` (shadcn primitives — they theme via index.css vars)

---

## Replacement strategy for Step 3

### Plain class form
Hex → var, e.g. `bg-[#1A1A2E]` → `bg-[var(--ct-bg-card)]`.

### Inline-style form
`style={{ background: "#1A1A2E" }}` → `style={{ background: "var(--ct-bg-card)" }}`.

Both need handling. The sweep must cover:
- Tailwind arbitrary-value classes (`bg-[#HEX]`, `text-[#HEX]`, `border-[#HEX]`, `from-[#HEX]`, `to-[#HEX]`, `via-[#HEX]`, `placeholder-[#HEX]`, `hover:bg-[#HEX]`, `hover:text-[#HEX]`, `divide-[#HEX]`, `ring-[#HEX]`, `border-{l,r,t,b}-[#HEX]`)
- Opacity variants (`bg-[#EF4444]/20`, etc.)
- Inline styles (`"#1A1A2E"`, `"#3B82F6"`, etc.) inside `style={{ ... }}` blocks

Opacity variants with `/XX` can't reference CSS variables directly the same way in Tailwind v3 arbitrary-value syntax without a wrapper — but `bg-[var(--ct-danger)]/20` actually works because Tailwind's arbitrary-value opacity uses a CSS variable `--tw-bg-opacity` that combines with the color. However, `var()` inside arbitrary with `/XX` needs a slightly different form. We can sidestep by replacing `bg-[#EF4444]/20` with `bg-[rgb(var(--ct-danger-rgb)/0.2)]` — but this requires defining `--ct-danger-rgb: 239 68 68` separately. To keep it simple, I'll include RGB-channel versions alongside the hex ones in theme.css, used only where opacity variants exist.

Trade-off: slightly more vars in theme.css, but replacements stay mechanical.

---

## Scope reality check

- 70 files × ~17 different color patterns = many sed/replace passes
- Inline-style hex replacements need quoted-form pattern (`"#1A1A2E"` → `"var(--ct-bg-card)"`) on top of Tailwind arbitrary
- Every change is mechanical, but opacity variants (`bg-[#XXX]/20` used for role badges in LeagueUsers + ApplicationReview) need special handling
- Total build verification at the end

Achievable in one turn via automated `sed` passes. I'll apply each step in sequence and do a final build check.

---

## Open decisions before Step 2

1. **Variable naming:** spec says `--ct-*` (courtside prefix). I'll introduce these as the new canonical set. The existing `--color-*` vars in `theme.css` can either be renamed or kept as aliases pointing to the new `--ct-*` vars — **recommend keeping as aliases** so I don't have to touch every existing `var(--color-bg-*)` reference in `Layout.jsx` and elsewhere that already uses the old var names. Both will resolve correctly.

2. **Opacity variants:** I'll add `--ct-*-rgb` vars (RGB channel triplets) so `bg-[rgb(var(--ct-danger-rgb)/0.2)]` works in Tailwind arbitrary values. Current usage: role badges in LeagueUsers + ApplicationReview use `.../20` suffix.

3. **Approach for the 70-file sweep:** automated `sed` passes (safe because all patterns are specific literal strings — no regex interpretation). Very similar to how we did the initial dark-theme conversion.

Ready to proceed to Step 2 once you confirm.
