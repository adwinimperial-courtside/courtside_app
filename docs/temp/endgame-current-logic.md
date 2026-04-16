  // ─── End Game ─────────────────────────────────────────────────────────────

  const finalizeMinutes = async () => {
    if (game?.game_mode === 'timed' && game?.clock_running) {
      activePlayers.forEach(stat => {
        const cs = playerClockStateRef.current[stat.player_id];
        if (cs && cs.period === game.clock_period) {
          const elapsed = cs.timeLeft - computeTimeLeft(game);
          playerMinutesRef.current[stat.player_id] = (playerMinutesRef.current[stat.player_id] || 0) + elapsed;
        }
      });
    }
    await Promise.all(
      existingStats.map(stat => {
        const totalMin = Math.round(((playerMinutesRef.current[stat.player_id] || 0) / 60) * 100) / 100;
        return supabase.from('player_stats').update({ minutes_played: totalMin }).eq('id', stat.id);
      })
    );
  };

  const handleEndGameFromModal = async () => {
    await finalizeMinutes();

    const homeScore = calcTeamScore(game.home_team_id, existingStats);
    const awayScore = calcTeamScore(game.away_team_id, existingStats);
    const homeWins  = homeScore > awayScore;

    const { error: gameErr } = await supabase
      .from('games')
      .update({
        status:         'completed',
        player_of_game: findPlayerOfGame(existingStats, game),
        home_score:     homeScore,
        away_score:     awayScore,
      })
      .eq('id', gameId);
    if (gameErr) { console.error('[handleEndGameFromModal]', gameErr); return; }

    // Update team win/loss records
    const [homeTeamRow] = await supabase.from('teams').select('wins,losses').eq('id', game.home_team_id).single().then(r => [r.data]);
    const [awayTeamRow] = await supabase.from('teams').select('wins,losses').eq('id', game.away_team_id).single().then(r => [r.data]);

    await Promise.all([
      homeTeamRow && supabase.from('teams').update({
        wins:   homeWins ? (homeTeamRow.wins || 0) + 1 : (homeTeamRow.wins || 0),
        losses: !homeWins ? (homeTeamRow.losses || 0) + 1 : (homeTeamRow.losses || 0),
      }).eq('id', game.home_team_id),
      awayTeamRow && supabase.from('teams').update({
        wins:   !homeWins ? (awayTeamRow.wins || 0) + 1 : (awayTeamRow.wins || 0),
        losses: homeWins  ? (awayTeamRow.losses || 0) + 1 : (awayTeamRow.losses || 0),
      }).eq('id', game.away_team_id),
    ].filter(Boolean));

    onBack?.();
  };

  const handleEndGame = async () => {
    if (!window.confirm('Are you sure you want to end this game? This cannot be undone.')) return;
    try {
      await handleEndGameFromModal();
    } catch (err) {
      console.error('[handleEndGame]', err);
      window.alert('Failed to end game: ' + err.message);
    }
  };

  // ─── Derived player lists ──────────────────────────────────────────────────
