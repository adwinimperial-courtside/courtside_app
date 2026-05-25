# Standings Page — Current State

## src/pages/Standings.jsx — imports
```
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Filter, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
```

No external component files imported (all self-contained in Standings.jsx).

## Data fetching (must be preserved exactly)
1. `useQuery(['leagues', 'active'])` — `supabase.from('leagues').select('*').eq('is_active', true)`
2. `useQuery(['teams', selectedLeagueId])` — `supabase.from('teams').select('*').eq('league_id', ...).eq('is_active', true)`
3. `useQuery(['games', selectedLeagueId, 'final'])` — `supabase.from('games').select('*').eq('league_id', ...).eq('status', 'final')`

## Helper functions (must be preserved exactly)
- `getGameResult(teamId, game)` — handles default results + score comparison
- `getTeamStreak(teamId, games)` — most recent consecutive same result
- `getMiniStats(teamId, subGames)` — used for tiebreaker h2h win%
- `sortTiedGroup(group, allGames)` — 2-team h2h tiebreak, 3+ by points diff
- `computeStandings(teams, games)` — full standings computation with tiebreakers

## Current mobile layout
Small table: #, Team (logo + name + trend), W, L, Str, +/-

## Current desktop layout
Larger table: #, Team (logo + name + trend), W, L, Win%, Streak, +/-

## Light theme classes to replace
- `bg-gradient-to-br from-slate-50 via-white to-slate-50` (page bg)
- `bg-white rounded-xl shadow-sm border border-slate-200` (card wrapper)
- `bg-slate-50 text-slate-500` (table header)
- `border-slate-100 / border-slate-200` (row borders)
- `hover:bg-slate-50/50` (row hover)
- `text-slate-900 text-slate-700 text-slate-500 text-slate-400` (text)

## State
- `selectedLeagueId` — currently selected league
- No mobile expand state yet (will be added)
