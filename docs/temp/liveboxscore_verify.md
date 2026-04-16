14:function mergeStatsByPlayer(statRows) {
22:    // Sort descending by created_at to find most recent row for is_active
48:      is_active:         latest.is_active,
98:      if (game.clock_running && game.clock_started_at) {
107:    if (!game.clock_running) return;
111:  }, [game?.clock_running, game?.clock_started_at, game?.clock_time_left]);
123:        if (a.is_active && !b.is_active) return -1;
124:        if (!a.is_active && b.is_active) return 1;
206:            {/* TEAM TOTALS */}
208:              <td className="py-2.5 px-3 text-sm">TEAM TOTALS</td>
244:    refetchInterval: 5000,
282:    refetchInterval: 5000,
293:    refetchInterval: 5000,
302:    const uid = Math.random().toString(36).slice(2, 8);
305:      .channel(`boxscore-game-${gameId}-${uid}`)
311:      .channel(`boxscore-stats-${gameId}-${uid}`)
317:      .channel(`boxscore-logs-${gameId}-${uid}`)
335:  const mergedStats = useMemo(() => mergeStatsByPlayer(allStats), [allStats]);
377:            Back to Schedule
401:            Back to Schedule
420:          Back to Schedule
