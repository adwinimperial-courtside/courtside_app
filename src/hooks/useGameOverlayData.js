import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useGameOverlayData(gameId) {
  const [game, setGame] = useState(null);
  const [homeTeam, setHomeTeam] = useState(null);
  const [awayTeam, setAwayTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live clock display derived from game state
  const [clockDisplay, setClockDisplay] = useState(null);
  const clockRef = useRef(null);

  useEffect(() => {
    if (!gameId) return;

    const uid = Math.random().toString(36).slice(2, 9);

    async function fetchGame() {
      const { data, error: fetchError } = await supabase
        .from('games')
        .select(`
          *,
          home_team:teams!home_team_id(id, name, short_name, color, logo_url),
          away_team:teams!away_team_id(id, name, short_name, color, logo_url)
        `)
        .eq('id', gameId)
        .single();

      if (fetchError) {
        setError(fetchError);
      } else if (data) {
        setGame(data);
        setHomeTeam(data.home_team);
        setAwayTeam(data.away_team);
      }
      setLoading(false);
    }

    fetchGame();

    const channel = supabase
      .channel(`overlay-game-${gameId}-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.new) setGame((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Live clock ticker — recomputes every second when clock is running
  useEffect(() => {
    if (clockRef.current) {
      clearInterval(clockRef.current);
      clockRef.current = null;
    }

    if (!game) return;

    const compute = () => {
      if (game.clock_running && game.clock_started_at) {
        const elapsed = (Date.now() - new Date(game.clock_started_at).getTime()) / 1000;
        return Math.max(0, (game.clock_time_left || 0) - elapsed);
      }
      return game.clock_time_left ?? null;
    };

    setClockDisplay(compute());

    if (game.clock_running) {
      clockRef.current = setInterval(() => setClockDisplay(compute()), 1000);
    }

    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [game?.clock_running, game?.clock_started_at, game?.clock_time_left]);

  return { game, homeTeam, awayTeam, clockDisplay, loading, error };
}
