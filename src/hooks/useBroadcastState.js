import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const DEFAULT_STATE = {
  overlay_visible: true,
  scorebug_visible: true,
  crew_name: null,
  crew_logo_url: null,
  crew_logo_visible: true,
  streamer_text: '',
  streamer_visible: false,
  current_graphic: null,
};

export function useBroadcastState(gameId) {
  const [broadcastState, setBroadcastState] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gameId) return;

    const uid = Math.random().toString(36).slice(2, 9);
    let channel;

    async function fetchInitial() {
      const { data, error: fetchError } = await supabase
        .from('broadcast_state')
        .select('*')
        .eq('game_id', gameId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No row yet — use defaults silently
          setBroadcastState(DEFAULT_STATE);
        } else {
          setError(fetchError);
        }
      } else if (data) {
        setBroadcastState(data);
      }
      setLoading(false);
    }

    fetchInitial();

    channel = supabase
      .channel(`broadcast-${gameId}-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcast_state',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.new) setBroadcastState((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcast_state',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.new) setBroadcastState((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { broadcastState, loading, error };
}
