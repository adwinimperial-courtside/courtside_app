26:    const latest = sorted[0];
35:      ...latest,
48:      is_active:         latest.is_active,
92:  const [display, setDisplay] = useState(null);
113:  return display;
256:    queryKey: ["team", game?.home_team_id],
258:      supabase.from("teams").select("*").eq("id", game.home_team_id).single()
260:    enabled:       !!game?.home_team_id,
265:    queryKey: ["team", game?.away_team_id],
267:      supabase.from("teams").select("*").eq("id", game.away_team_id).single()
269:    enabled:       !!game?.away_team_id,
274:    queryKey: ["players_box", game?.home_team_id, game?.away_team_id],
277:        .in("team_id", [game.home_team_id, game.away_team_id])
279:    enabled:   !!(game?.home_team_id && game?.away_team_id),
293:  const { data: latestLogArr = [] } = useQuery({
294:    queryKey: ["game_logs_latest", gameId],
303:  const latestLog = latestLogArr[0] || null;
326:        () => queryClient.invalidateQueries({ queryKey: ["game_logs_latest", gameId] }))
345:    () => mergedStats.filter(s => s.team_id === game?.home_team_id),
346:    [mergedStats, game?.home_team_id]
349:    () => mergedStats.filter(s => s.team_id === game?.away_team_id),
350:    [mergedStats, game?.away_team_id]
359:  const latestActivityLabel = useMemo(() => {
360:    if (!latestLog) return null;
362:    // Match team by team_id against loaded team objects (avoids JSON parsing issues)
363:    const team = latestLog.team_id === homeTeam?.id ? homeTeam
364:               : latestLog.team_id === awayTeam?.id ? awayTeam
367:    const statType  = latestLog.stat_type  || "";
368:    const statLabel = latestLog.stat_label || statType;
371:    if (statType === "timeout") {
376:    if (statType === "substitution") {
388:    const player = players.find(p => p.id === latestLog.player_id);
400:  }, [latestLog, players, homeTeam, awayTeam]);
488:            {/* Center: clock + status + latest activity */}
509:              {latestActivityLabel && (
511:                  <p className="text-slate-800 text-xs font-semibold truncate">{latestActivityLabel.who}</p>
512:                  <p className="text-slate-500 text-[11px] truncate">{latestActivityLabel.what}</p>
