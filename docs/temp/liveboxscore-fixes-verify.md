22:    // Sort descending by created_at to find most recent row for is_active
26:    const latest = sorted[0];
35:      ...latest,
48:      is_active:         latest.is_active,
92:  const [display, setDisplay] = useState(null);
113:  return display;
123:        if (a.is_active && !b.is_active) return -1;
124:        if (!a.is_active && b.is_active) return 1;
178:                  stat.is_active
179:                    ? "border-l-4 border-green-500 bg-green-50"
293:  const { data: latestLogArr = [] } = useQuery({
294:    queryKey: ["game_logs_latest", gameId],
303:  const latestLog = latestLogArr[0] || null;
326:        () => queryClient.invalidateQueries({ queryKey: ["game_logs_latest", gameId] }))
359:  const latestActivityLabel = useMemo(() => {
360:    if (!latestLog) return null;
361:    const player = players.find(p => p.id === latestLog.player_id);
364:    // team.name may be stored as a JSON object with a display field
366:      val == null ? "" : typeof val === "object" ? (val.display || val.name || "") : String(val);
369:    const statLabel = extractStr(latestLog.stat_label || latestLog.stat_type);
384:  }, [latestLog, players, homeTeam, awayTeam, game]);
472:            {/* Center: clock + status + latest activity */}
493:              {latestActivityLabel && (
495:                  <p className="text-slate-800 text-xs font-semibold truncate">{latestActivityLabel.who}</p>
496:                  <p className="text-slate-500 text-[11px] truncate">{latestActivityLabel.what}</p>
