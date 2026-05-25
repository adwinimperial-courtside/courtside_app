# Batch 3a Build — LeagueUsers + GameLog + ApplicationReview mobile

## Build output
```
vite v6.3.6 building for production...
✓ 2600 modules transformed.
dist/assets/index-BPa05hGs.css    111.34 kB │ gzip:  17.79 kB
dist/assets/index-CxoRI66w.js   1,328.37 kB │ gzip: 365.13 kB
✓ built in 1.79s
```
Zero errors. ✅

---

## What changed

### `src/pages/LeagueUsers.jsx`

**Imports + constants**
- Added `useRef`, `motion`, `AnimatePresence`, `useIsNarrowLayout`
- `ROLE_COLORS` rewritten to the Dark-Court palette: `bg-[#EF4444]/20 text-[#EF4444]` (app_admin), `#F59E0B` (league_admin), `#3B82F6` (coach), `#22C55E` (player), `#A0A0B8` (viewer)

**New: `UserCardMobile` component**
- Card: `bg-[#1A1A2E]` + `border #2A2A42` + p-4
- Top row: name + role badge (most privileged role across memberships)
- Email in `#6B6B80`
- Tap (44px min target) expands via `framer-motion` height animation
- Expanded panel (`#0F0F1A` bg, rounded-lg): Last Active + Change Role Select + Remove button per membership

**Main component branches on `isNarrow`:**
- **Mobile extras above everything else:**
  - 2×2 stats grid — Total Users / Players / Coaches / Viewers
  - Action row — Invite User (`#3B82F6`) + Export (`#2A2A42`) buttons, `flex-1` each, `h-44`
  - Role filter pills — All / Admin / Coach / Player / Viewer (`#3B82F6` active, `#2A2A42` inactive)
  - Search — rounded-full dark input with Search icon
- **Desktop-only** blocks wrapped in `{!isNarrow && ...}`: role summary chips row, existing filters row (search + 3 Selects)
- **User list branches:** `<UserCardMobile>` on narrow, existing `<UserRow>` table on desktop

Data flow preserved: all `useState`, `useEffect`, `loadUsers`, `loadInvites`, `handleRoleChange`, `confirmRemove`, `submitInvite`, `handleResend`, `confirmRevoke`, filters, pagination, CSV export — untouched.

---

### `src/pages/GameLog.jsx`

**Imports**
- Added `useRef`, `useIsNarrowLayout`, `ChevronDown`, `Search`

**New helpers**
- `DropdownPill` (inlined — same pattern as Statistics/Schedule)
- `CollapsibleSearch` (icon → expanding input)
- `actionDotColor(log)` → returns:
  - `#EF4444` if undone
  - `#22C55E` if score added (`points_2 / points_3 / free_throws`)
  - `#F59E0B` if foul (`fouls / technical_fouls / unsportsmanlike_fouls`)
  - `#3B82F6` if substitution (`substitution / sub_in / sub_out`)
  - `#6B6B80` otherwise

**New: `MobileTimeline` component**
- Vertical 2px line (`border-[#2A2A42]`) running down the left
- Each entry: card with a coloured 12px dot sitting on the line
- Top row: player name + period badge (`Q1` style pill, `#2A2A42` bg)
- Bottom row: action text with +/− prefix + team + timestamp
- Undone entries: `opacity: 0.5` + `text-decoration: line-through` on action text

**Main component branches on `isNarrow`:**
- **Mobile** renders a sticky compact filter row: DropdownPill (league, active blue) + DropdownPill (game) + DropdownPill (period) + CollapsibleSearch (player)
- **Desktop** keeps the existing two filter rows (league+game selects, then period+player+points toggle + List/Timeline view toggle)
- **Log content** branches: `<MobileTimeline>` on narrow, existing list or timeline view on desktop
- Mobile has NO list/timeline toggle (timeline only, per spec)

Data flow preserved: all `useState`, all `useEffect`s, filtering, CSV/Excel export — untouched.

---

### `src/pages/ApplicationReview.jsx`

- Added `ROLE_BADGE` dark-palette role badges (same as LeagueUsers)
- `StatusMessage` now uses inline styles with `rgba(...)` for semi-transparent error/success backgrounds, replacing `bg-red-50 bg-green-50` (which the earlier sweep didn't touch — the `50` suffix on `red`/`green`/etc wasn't in the sed map)
- `ApplicationCard`:
  - Role badge uses the new `ROLE_BADGE` mapping (coloured by requested_role)
  - Applicant name bumped to `text-lg` with `truncate`
  - Email added under name (`text-[#6B6B80]`)
  - Action buttons: `flex-1` each, `h-44`, `gap-3` between — full width on all viewports
  - Button colors: Approve `#22C55E`, Reject `#EF4444`
- Header icon colour changed from legacy `text-orange-500` to `#F59E0B`
- Spinner: uses `#2A2A42` track + `#3B82F6` top (was `border-t-slate-800`)
- Removed `flex flex-col gap-4` wrapper around cards — each card now has its own `mb-3` margin

Data flow preserved: `loadApplications`, `handleApprove` (including league-creation side effect for `league_admin` apps), `handleReject`, `showMessage` — untouched.

---

## Test checklist

### LeagueUsers
- [ ] Mobile: 2×2 stats grid at top with Total / Players / Coaches / Viewers counts
- [ ] Mobile: Invite User + Export buttons side-by-side, 44px tall
- [ ] Mobile: Role filter pills — All / Admin / Coach / Player / Viewer — active pill blue
- [ ] Mobile: Search input rounded-full with magnifier icon
- [ ] Mobile: Each user is a dark card with role badge (coloured by role)
- [ ] Mobile: Tap card → slide-down showing Last Active + Change Role Select + Remove button per league membership
- [ ] Mobile: Role dropdown inside expanded card changes role
- [ ] Mobile: No horizontal overflow at 390px
- [ ] Desktop: unchanged — existing UserRow table renders as before

### GameLog
- [ ] Mobile: Sticky filter row with League pill (blue), Game pill, Period pill, Search icon
- [ ] Mobile: Tap any pill → dark dropdown menu with `#3B82F6` for selected option
- [ ] Mobile: Search icon expands into an input when tapped
- [ ] Mobile: Log entries render as vertical timeline with coloured dots on the left line
  - score action dot = green
  - foul dot = amber
  - substitution dot = blue
  - undone dot = red
  - other = grey
- [ ] Mobile: Undone rows are 50% opacity with strikethrough
- [ ] Mobile: Period badge (`Q1`, etc.) renders on right of player name
- [ ] Mobile: No list/table toggle visible
- [ ] Desktop: unchanged — existing list + timeline view toggle, existing filter rows

### ApplicationReview
- [ ] Each application card shows name, email, role badge (coloured by role), applied date
- [ ] Approve + Reject buttons full-width, 44px tall, side-by-side
- [ ] Approving creates/updates membership (and league for league_admin role)
- [ ] Rejecting marks application rejected
- [ ] Success/error messages appear with semi-transparent red/green backgrounds
- [ ] Empty state: clipboard icon + "No pending applications"

### Global
- [ ] No horizontal overflow on any of the three pages at 390px
- [ ] All interactive elements at least 44px tall on mobile
- [ ] Build: zero errors, 2600 modules, 1.79s
