# Statistics Page — Current State

## Files

| File | Status |
|---|---|
| `src/pages/Statistics.jsx` | Single file, 617 lines — **contains all 3 tabs inline** |
| `src/components/statistics/` | Does not exist |
| `src/components/stats/*.jsx` | Exists (AwardLeaders, GameStats, LeagueLeaders, MobileAwardCards, PlayerStats, TeamStandings, TeamStats) — but **NOT imported by Statistics.jsx**. These belong to other pages (AwardLeaders etc.). |

So only `src/pages/Statistics.jsx` needs to change.

## Statistics.jsx imports (top of file)
```js
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart3, Filter, Shield, User, Trophy, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
```

## Data fetching (must be preserved exactly)
1. `leagues` — `supabase.from('leagues').select('*').eq('is_active', true)`
2. `teams` — `supabase.from('teams').select('*').eq('league_id', ...).eq('is_active', true)`
3. `players` — `supabase.from('players').select('*').in('team_id', teamIds)`
4. `games` — `supabase.from('games').select('*').eq('league_id', ...).eq('status', 'final')`
5. `player_stats` — `supabase.from('player_stats').select('*').in('game_id', gameIds)`

## State (at Statistics level)
- `selectedLeagueId`
- `selectedTeamId` (default `"all"`)
- `playerSearch` → debounced to `debouncedSearch`
- `activeTab` (default `"team"`)

## Sort hook (shared by Team / Player tabs)
```js
function useSort(defaultCol, defaultDir = "desc") { ... }
// Exposes: sortCol, sortDir, onSort, sortFn
```

## Team Stats computed keys
`team.id, team.name, team.color, gp, pts, reb, ast, oreb, dreb, stl, blk, to` (per-game averages)

## Player Stats computed keys
`player.id, player.name, player.first_name, player.last_name, player.jersey_number, team, gp, ppg, pm2, pm3, ftm, oreb, dreb, rpg, apg, stl, blk, to, pf`

## League Leaders computed keys
`ppg, pm3, rpg, apg, stl, blk` — top 5 per category
Categories: PPG 🏀, 3PM 🎯, RPG 💪, APG 🤝, SPG 🏆, BPG 🚫

## Light theme classes to replace
- Page bg: `bg-gradient-to-br from-slate-50 via-white to-slate-50`
- Card wrappers: `bg-white rounded-xl shadow-sm border border-slate-200`
- Table header: `bg-slate-50 text-slate-500 border-slate-200`
- Row borders: `border-slate-100`
- Row hover: `hover:bg-slate-50/50`
- Text: `text-slate-900 text-slate-700 text-slate-500 text-slate-400 text-slate-300`
- Active tab: `bg-purple-600 text-white`
- Active stat: `text-purple-700` and `text-purple-600` for filter icons
- Leader rank badges: yellow-400, slate-300, orange-400, slate-200 (gold/silver/bronze/4-5)
- Jersey circle fallback bg: `#3b82f6` (already compatible)

## ⚠️ Schema gap: FG% is not computable
Spec asks for "FG%" as the 4th stat in mobile card grids. The `player_stats` table only has makes (`points_2, points_3, free_throws`) — **no attempts columns**. Cannot compute FG%.

Plan: substitute the 4th stat with **SPG** (steals per game, already computed) and call it out in the final deviation note. The other three (PPG, RPG, APG) match the spec exactly.
