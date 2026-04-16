48:  const stored = game?.clock_time_left ?? ((game?.period_minutes || 10) * 60);
118:  // the admin has a chance to open the substitution dialog.
261:  const activePlayers     = existingStats.filter(s => s.is_starter);
264:  const homeActiveCount = existingStats.filter(s => s.team_id === game?.home_team_id && s.is_starter).length;
265:  const awayActiveCount = existingStats.filter(s => s.team_id === game?.away_team_id && s.is_starter).length;
321:      const activeIds = new Set(freshStats.filter(s => s.team_id === teamId && s.is_starter).map(s => s.player_id));
323:      const benchPls  = players.filter(p => p.team_id === teamId && !activeIds.has(p.id));
324:      const eligibleBench = benchPls.filter(p => isPlayerEligible(p.id, freshStats));
341:      const activeIds  = new Set(freshStats.filter(s => s.team_id === teamId && s.is_starter).map(s => s.player_id));
343:      const benchPls   = players.filter(p => p.team_id === teamId && !activeIds.has(p.id));
344:      const eligible   = benchPls.filter(p => isPlayerEligible(p.id, freshStats));
370:  // is_starter is the on-court flag (player_stats has no is_active column).
374:    // Ejection in progress — substitution dialog is handling the lineup restoration.
390:        playerMinutesRef.current[stat.player_id] = stat.minutes_played ? stat.minutes_played * 60 : 0;
418:              supabase.from('player_stats').update({ minutes_played: totalMin }).eq('id', stat.id)
543:        // useEffect ignores the temporarily-invalid roster while the substitution
545:        // when the ejection modal is dismissed without a substitution.
548:        // Mark is_starter = false server-side (player_stats has no is_active column)
551:          .update({ is_starter: false })
707:          return s ? supabase.from('player_stats').update({ is_starter: true }).eq('id', s.id) : null;
709:        // Reverse: players who came IN go back to bench
712:          return s ? supabase.from('player_stats').update({ is_starter: false }).eq('id', s.id) : null;
789:    // Flip is_starter / is_active in the cache immediately so player cards
791:    // Incoming players that don't yet have a stat row (first-time bench sub)
803:        if (outIds.has(s.player_id)) return { ...s, is_starter: false, is_active: false };
804:        if (inIds.has(s.player_id))  return { ...s, is_starter: true,  is_active: true  };
824:          // Accrue minutes if clock is running
839:              .update({ is_starter: false, minutes_played: totalMin })
850:              .update({ is_starter: true })
858:              is_starter: true,
859:              minutes_played: 0,
879:          stat_type:      'substitution',
929:        return supabase.from('player_stats').update({ minutes_played: totalMin }).eq('id', stat.id);
1221:            const isSub      = log.stat_type === 'substitution';
1420:          const nextMins   = nextIsOT ? (game?.overtime_minutes || 5) : (game?.period_minutes || 10);
1434:          const otMins   = game?.overtime_minutes || 5;
1504:              This player cannot return to the game. A substitution is required to continue.
1631:                      <p className="text-center text-red-500 py-3 text-xs font-semibold">No eligible home bench players.</p>
1675:                      <p className="text-center text-red-500 py-3 text-xs font-semibold">No eligible away bench players.</p>
