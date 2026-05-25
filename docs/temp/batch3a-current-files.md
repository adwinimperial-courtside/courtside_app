# Batch 3a — Current Files

## Files

| Path | Lines |
|---|---:|
| `src/pages/LeagueUsers.jsx` | 800 |
| `src/pages/GameLog.jsx` | 511 |
| `src/pages/ApplicationReview.jsx` | 253 |
| **Total** | **1,564** |

All three files already dark-themed (colors swept in prior batch). Structural mobile redesigns not yet applied.

## Key imports + data hooks

### `LeagueUsers.jsx`
```js
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Button, Input, Label, Badge, Select*, Dialog* } from "@/components/ui/*";
import { toast } from "@/components/ui/use-toast";
```
Uses `useState`/`useEffect` (not TanStack `useQuery`) for data loading. Computes metric counts client-side.

### `GameLog.jsx`
```js
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Card*, Select*, Badge, Button, Input } from "@/components/ui/*";
import { FileText, Download, List, LayoutList, Clock, User } from "lucide-react";
import { format } from "date-fns";
```
`List` / `LayoutList` icons suggest an existing list/table toggle. Data via `useState`/`useEffect`.

### `ApplicationReview.jsx`
```js
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, XCircle, AlertCircle, ClipboardList } from "lucide-react";
```
Simpler than the other two. Uses `useState`/`useEffect` + Supabase directly.

## Shared infra available for reuse

- `useIsNarrowLayout()` from [src/lib/DevicePreviewContext.jsx](src/lib/DevicePreviewContext.jsx) — returns `true` on real mobile OR admin phone/tablet preview
- `DropdownPill` pattern already inline in `src/pages/Statistics.jsx` and `src/pages/Schedule.jsx` (click-outside close, dark dropdown, chevron)
- `framer-motion` installed for expand/collapse animations
- `totalPoints` helper from `@/lib/playerStats` (not needed here but available)

## Implementation plan

For each page I'll:
1. Keep ALL existing data logic (`useState`, `useEffect`, Supabase queries, computed metrics) untouched.
2. Add an `isNarrow = useIsNarrowLayout()` hook.
3. Branch render: if narrow, render the new card/timeline layout; otherwise render the current desktop layout unchanged.
4. Reuse the `DropdownPill` / `CollapsibleSearch` helpers by inlining them in each file (or extracting if they grow to 4+ users — not yet).

Awaiting confirmation to proceed with Step 2.
