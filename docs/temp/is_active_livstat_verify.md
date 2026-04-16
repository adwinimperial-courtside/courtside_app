261:  const activePlayers     = existingStats.filter(s => s.is_starter);
264:  const homeActiveCount = existingStats.filter(s => s.team_id === game?.home_team_id && s.is_starter).length;
265:  const awayActiveCount = existingStats.filter(s => s.team_id === game?.away_team_id && s.is_starter).length;
321:      const activeIds = new Set(freshStats.filter(s => s.team_id === teamId && s.is_starter).map(s => s.player_id));
341:      const activeIds  = new Set(freshStats.filter(s => s.team_id === teamId && s.is_starter).map(s => s.player_id));
370:  // is_starter is the on-court flag (player_stats has no is_active column).
550:          .update({ is_starter: false, is_active: false })
706:          return s ? supabase.from('player_stats').update({ is_starter: true, is_active: true }).eq('id', s.id) : null;
711:          return s ? supabase.from('player_stats').update({ is_starter: false, is_active: false }).eq('id', s.id) : null;
788:    // Flip is_starter / is_active in the cache immediately so player cards
802:        if (outIds.has(s.player_id)) return { ...s, is_starter: false, is_active: false };
803:        if (inIds.has(s.player_id))  return { ...s, is_starter: true,  is_active: true  };
838:              .update({ is_starter: false, is_active: false, minutes_played: totalMin })
849:              .update({ is_starter: true, is_active: true })
857:              is_starter: true,
858:              is_active:  true,
