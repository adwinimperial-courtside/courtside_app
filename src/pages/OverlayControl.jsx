import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tv2, Upload, Loader2, Radio } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBroadcastState } from '@/hooks/useBroadcastState';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { totalPoints } from '@/lib/playerStats';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updateBroadcastState(gameId, patch) {
  const { error } = await supabase
    .from('broadcast_state')
    .update(patch)
    .eq('game_id', gameId);
  return error;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div
      style={{
        background: 'var(--ct-bg-card)',
        border: '1px solid var(--ct-border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--ct-border)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--ct-text-muted)',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({ id, label, description, checked, onCheckedChange, disabled }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        opacity: disabled ? 0.38 : 1,
        transition: 'opacity 0.15s',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Label
          htmlFor={id}
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ct-text-primary)',
            cursor: disabled ? 'default' : 'pointer',
            display: 'block',
            marginBottom: 2,
          }}
        >
          {label}
        </Label>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--ct-text-muted)', margin: 0, lineHeight: 1.4 }}>
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

// ─── Lower thirds config ──────────────────────────────────────────────────────

const LOWER_THIRD_TYPES = [
  { id: 'player_intro',         label: 'Player intro',   durationMs: 7000, needsPlayer: true  },
  { id: 'stat_callout',         label: 'Stat callout',   durationMs: 6000, needsPlayer: true  },
  { id: 'leading_scorer',       label: 'Leading scorer', durationMs: 6000, needsPlayer: false },
  { id: 'quarter_recap',        label: 'Quarter recap',  durationMs: 8000, needsPlayer: false },
  { id: 'team_foul_comparison', label: 'Team fouls',     durationMs: 6000, needsPlayer: false },
];

// Compute total pts from a player_stats row.
function computePts(stat) {
  return totalPoints(stat);
}

function computeReb(stat) {
  return (stat.offensive_rebounds || 0) + (stat.defensive_rebounds || 0);
}

// Extract current-period foul count from the home_team_fouls / away_team_fouls JSONB.
// The JSONB is keyed by period number as string: { "1": 3, "2": 0 }.
// Falls back to summing all values if the period key is missing.
function extractFouls(foulsObj, period) {
  if (!foulsObj || typeof foulsObj !== 'object') return 0;
  const key = String(period || 1);
  if (key in foulsObj) return foulsObj[key] || 0;
  // Fallback: sum all period values
  return Object.values(foulsObj).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OverlayControl() {
  const { gameId } = useParams();
  const { currentUser, isAppAdmin, isLoadingAuth, isAuthenticated } = useAuth();
  const userId = currentUser?.id;

  const { broadcastState, loading: bsLoading } = useBroadcastState(gameId);

  // ── Game data (for matchup header) ──────────────────────────────────────────
  const { data: game } = useQuery({
    queryKey: ['overlay-game-info', gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id, league_id,
          home_team:teams!home_team_id(id, name, short_name, color),
          away_team:teams!away_team_id(id, name, short_name, color)
        `)
        .eq('id', gameId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
    staleTime: 300000,
  });

  const leagueId = game?.league_id ?? null;

  // ── League-admin role check ──────────────────────────────────────────────────
  const { data: membership } = useQuery({
    queryKey: ['my-league-role', leagueId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_league_memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!userId && !!leagueId && !isAppAdmin,
    staleTime: 60000,
  });

  const isLeagueAdmin = membership?.role === 'league_admin';
  const hasAccess = isAppAdmin || isLeagueAdmin;

  // ── Player stats for this game (for lower thirds player picker) ──────────────
  const { data: playerStatsData = [] } = useQuery({
    queryKey: ['overlay-control-player-stats', gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_stats')
        .select(`
          id, player_id,
          points, points_2, points_3, free_throws,
          offensive_rebounds, defensive_rebounds, assists,
          player:players!player_id(id, first_name, last_name, jersey_number),
          team:teams!team_id(id, name, short_name)
        `)
        .eq('game_id', gameId);
      if (error) throw error;
      // Sort descending by computed points so leading_scorer is index 0.
      return (data || []).sort((a, b) => computePts(b) - computePts(a));
    },
    enabled: !!gameId,
    staleTime: 30_000,
  });

  // ── Crew identity local state ────────────────────────────────────────────────
  const [crewName, setCrewName] = useState('');
  const [crewLogoUrl, setCrewLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // ── Streamer ticker local state ──────────────────────────────────────────────
  const [streamerText, setStreamerText] = useState('');
  const [savingStreamer, setSavingStreamer] = useState(false);

  // ── Lower thirds local state ─────────────────────────────────────────────────
  const [ltSelectedType, setLtSelectedType] = useState(null);   // type id string or null
  const [ltSelectedPlayerId, setLtSelectedPlayerId] = useState('');
  const [ltFiring, setLtFiring] = useState(false);
  const [ltClearing, setLtClearing] = useState(false);
  const [ltCountdown, setLtCountdown] = useState(null);  // seconds remaining, or null

  // Sync forms from broadcastState on first load
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!bsLoading && !initializedRef.current) {
      initializedRef.current = true;
      setCrewName(broadcastState.crew_name ?? '');
      setCrewLogoUrl(broadcastState.crew_logo_url ?? null);
      setStreamerText(broadcastState.streamer_text ?? '');
    }
  }, [bsLoading, broadcastState.crew_name, broadcastState.crew_logo_url, broadcastState.streamer_text]);

  // ── Lower thirds countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!broadcastState.current_graphic || !broadcastState.lower_third_started_at) {
      setLtCountdown(null);
      return;
    }
    const update = () => {
      const elapsed = Date.now() - new Date(broadcastState.lower_third_started_at).getTime();
      const remaining = Math.max(0, (broadcastState.lower_third_duration_ms || 6000) - elapsed);
      setLtCountdown(Math.ceil(remaining / 1000));
    };
    update();
    const iv = setInterval(update, 250);
    return () => clearInterval(iv);
  }, [
    broadcastState.current_graphic,
    broadcastState.lower_third_started_at,
    broadcastState.lower_third_duration_ms,
  ]);

  // ── Auth / access guards ─────────────────────────────────────────────────────
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ct-text-muted)' }} />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  // Show a brief loading state while we check role
  if (!isAppAdmin && !game) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ct-text-muted)' }} />
      </div>
    );
  }

  // Once game is loaded, if not admin show access denied
  if (game && !hasAccess) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'var(--ct-bg-base)' }}
      >
        <div style={{ textAlign: 'center', color: 'var(--ct-text-muted)' }}>
          <Tv2 className="w-8 h-8 mx-auto mb-3" />
          <p style={{ fontSize: 14 }}>You don't have access to this control panel.</p>
        </div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleOverlayToggle = async (checked) => {
    const err = await updateBroadcastState(gameId, { overlay_visible: checked });
    if (err) toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
  };

  const handleScorebugToggle = async (checked) => {
    const err = await updateBroadcastState(gameId, { scorebug_visible: checked });
    if (err) toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
  };

  const handleCrewLogoToggle = async (checked) => {
    const err = await updateBroadcastState(gameId, { crew_logo_visible: checked });
    if (err) toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
  };

  const handleStreamerToggle = async (checked) => {
    const err = await updateBroadcastState(gameId, { streamer_visible: checked });
    if (err) toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
  };

  const handleSaveStreamer = async () => {
    setSavingStreamer(true);
    const err = await updateBroadcastState(gameId, {
      streamer_text: streamerText.trim(),
    });
    setSavingStreamer(false);
    if (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } else {
      toast({ title: 'Streamer message saved' });
    }
  };

  // ── Lower thirds handlers ─────────────────────────────────────────────────────

  const handleLtFire = async () => {
    const typeConfig = LOWER_THIRD_TYPES.find((t) => t.id === ltSelectedType);
    if (!typeConfig) return;

    let payload = null;

    if (ltSelectedType === 'player_intro' || ltSelectedType === 'stat_callout') {
      const stat = playerStatsData.find((s) => s.player_id === ltSelectedPlayerId);
      if (!stat) {
        toast({ title: 'Select a player first', variant: 'destructive' });
        return;
      }
      const p = stat.player;
      const t = stat.team;
      payload = {
        type: ltSelectedType,
        name: p ? `${p.first_name} ${p.last_name}` : 'Unknown',
        jersey: p?.jersey_number || null,
        team: t?.short_name || t?.name || null,
        pts: computePts(stat),
        reb: computeReb(stat),
        ast: stat.assists || 0,
      };

    } else if (ltSelectedType === 'leading_scorer') {
      const top = playerStatsData[0];
      if (!top) {
        toast({ title: 'No player stats found for this game', variant: 'destructive' });
        return;
      }
      const p = top.player;
      const t = top.team;
      payload = {
        type: 'leading_scorer',
        name: p ? `${p.first_name} ${p.last_name}` : 'Unknown',
        jersey: p?.jersey_number || null,
        team: t?.short_name || t?.name || null,
        pts: computePts(top),
      };

    } else if (ltSelectedType === 'quarter_recap' || ltSelectedType === 'team_foul_comparison') {
      // Fetch fresh live game data at fire time
      const { data: liveGame, error: gErr } = await supabase
        .from('games')
        .select('home_score, away_score, clock_period, period_type, home_team_fouls, away_team_fouls')
        .eq('id', gameId)
        .single();
      if (gErr) {
        toast({ title: 'Failed to fetch game data', description: gErr.message, variant: 'destructive' });
        return;
      }
      const period = liveGame.clock_period || 1;
      const isHalves = liveGame.period_type === 'halves';
      const periodLabel = isHalves ? `H${period}` : `Q${period}`;
      const homeName = game?.home_team?.short_name || game?.home_team?.name || 'Home';
      const awayName = game?.away_team?.short_name || game?.away_team?.name || 'Away';

      if (ltSelectedType === 'quarter_recap') {
        payload = {
          type: 'quarter_recap',
          period,
          period_label: periodLabel,
          home_name: homeName,
          home_score: liveGame.home_score,
          away_name: awayName,
          away_score: liveGame.away_score,
        };
      } else {
        payload = {
          type: 'team_foul_comparison',
          period,
          period_label: periodLabel,
          home_name: homeName,
          home_fouls: extractFouls(liveGame.home_team_fouls, period),
          away_name: awayName,
          away_fouls: extractFouls(liveGame.away_team_fouls, period),
        };
      }
    }

    if (!payload) return;

    setLtFiring(true);
    const err = await updateBroadcastState(gameId, {
      current_graphic: payload,
      lower_third_started_at: new Date().toISOString(),
      lower_third_duration_ms: typeConfig.durationMs,
    });
    setLtFiring(false);

    if (err) {
      toast({ title: 'Failed to fire graphic', description: err.message, variant: 'destructive' });
    } else {
      toast({ title: `${typeConfig.label} fired — ${typeConfig.durationMs / 1000}s` });
    }
  };

  const handleLtClear = async () => {
    setLtClearing(true);
    const err = await updateBroadcastState(gameId, {
      current_graphic: null,
      lower_third_started_at: null,
    });
    setLtClearing(false);
    if (err) {
      toast({ title: 'Failed to clear graphic', description: err.message, variant: 'destructive' });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    if (!allowed.includes(ext)) {
      toast({ title: 'Unsupported file type', description: 'Use JPG, PNG, GIF, WebP, or SVG.', variant: 'destructive' });
      return;
    }

    const path = `crew/${gameId}/logo.${ext}`;
    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Bust the browser cache by appending a timestamp
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;
      setCrewLogoUrl(urlWithBust);
      toast({ title: 'Logo uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setCrewLogoUrl(null);
  };

  const handleSaveCrew = async () => {
    setSaving(true);
    const err = await updateBroadcastState(gameId, {
      crew_name: crewName.trim() || null,
      crew_logo_url: crewLogoUrl || null,
    });
    setSaving(false);

    if (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } else {
      toast({ title: 'Crew identity saved' });
    }
  };

  // ── Derived display ──────────────────────────────────────────────────────────
  const homeAbbr = (game?.home_team?.short_name || game?.home_team?.name?.slice(0, 3) || 'HME').toUpperCase();
  const awayAbbr = (game?.away_team?.short_name || game?.away_team?.name?.slice(0, 3) || 'AWY').toUpperCase();

  const overlayActive = broadcastState.overlay_visible;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--ct-bg-base)',
        color: 'var(--ct-text-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: '1px solid var(--ct-border)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--ct-bg-card)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Tv2 style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
            Broadcast Control
          </div>
          {game && (
            <div style={{ fontSize: 12, color: 'var(--ct-text-muted)', marginTop: 1 }}>
              {awayAbbr} vs {homeAbbr}
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: overlayActive ? '#22C55E' : '#6B7280',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ct-text-muted)', letterSpacing: '0.5px' }}>
            {overlayActive ? 'OVERLAY ON' : 'OVERLAY OFF'}
          </span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 540,
          margin: '0 auto',
          padding: '20px 16px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >

        {/* ── VISIBILITY SECTION ──────────────────────────────────────────── */}
        <Section title="Visibility">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Master toggle */}
            <ToggleRow
              id="toggle-overlay"
              label="Overlay active"
              description="Master switch. Controls all broadcast graphics. LIVE badge is always on."
              checked={overlayActive}
              onCheckedChange={handleOverlayToggle}
            />

            {/* Divider + sub-toggle wrapper */}
            <div
              style={{
                borderTop: '1px solid var(--ct-border)',
                paddingTop: 16,
                paddingLeft: 14,
                borderLeft: `2px solid ${overlayActive ? 'var(--ct-accent, #3B82F6)' : 'var(--ct-border)'}`,
                transition: 'border-color 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <ToggleRow
                id="toggle-scorebug"
                label="Scorebug"
                description={
                  overlayActive
                    ? 'Scores, clock, timeouts, fouls, and crew strip.'
                    : 'No effect — overlay is off.'
                }
                checked={broadcastState.scorebug_visible}
                onCheckedChange={handleScorebugToggle}
                disabled={!overlayActive}
              />

              <ToggleRow
                id="toggle-crew-logo"
                label="Show broadcaster logo (top-right)"
                description={
                  overlayActive
                    ? 'Large brand mark, top-right of the overlay. Requires a logo upload.'
                    : 'No effect — overlay is off.'
                }
                checked={broadcastState.crew_logo_visible}
                onCheckedChange={handleCrewLogoToggle}
                disabled={!overlayActive}
              />

              <ToggleRow
                id="toggle-streamer"
                label="Show streamer ticker (bottom)"
                description={
                  overlayActive
                    ? 'Scrolling sponsor / announcement bar along the bottom edge.'
                    : 'No effect — overlay is off.'
                }
                checked={broadcastState.streamer_visible}
                onCheckedChange={handleStreamerToggle}
                disabled={!overlayActive}
              />
            </div>

          </div>
        </Section>

        {/* ── CREW IDENTITY SECTION ───────────────────────────────────────── */}
        <Section title="Crew Identity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Crew name */}
            <div>
              <Label
                htmlFor="crew-name"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--ct-text-primary)', display: 'block', marginBottom: 6 }}
              >
                Crew name
              </Label>
              <Input
                id="crew-name"
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
                placeholder="e.g. Westside Refs"
                maxLength={60}
                style={{ fontSize: 14 }}
              />
              <p style={{ fontSize: 11, color: 'var(--ct-text-muted)', marginTop: 4 }}>
                Displayed as text on the scorebug crew strip when set.
              </p>
            </div>

            {/* Crew logo */}
            <div>
              <Label
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--ct-text-primary)', display: 'block', marginBottom: 6 }}
              >
                Crew logo
              </Label>

              {crewLogoUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      border: '1px solid var(--ct-border)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: 'var(--ct-bg-elevated)',
                    }}
                  >
                    <img
                      src={crewLogoUrl}
                      alt="Crew logo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--ct-text-muted)', marginBottom: 6, wordBreak: 'break-all' }}>
                      Logo ready
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                          fontSize: 12,
                          color: 'var(--ct-accent, #3B82F6)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {uploading ? 'Uploading…' : 'Replace'}
                      </button>
                      <span style={{ color: 'var(--ct-border)', fontSize: 12 }}>·</span>
                      <button
                        onClick={handleRemoveLogo}
                        style={{
                          fontSize: 12,
                          color: 'var(--ct-text-muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px dashed var(--ct-border)',
                    borderRadius: 8,
                    background: 'var(--ct-bg-elevated)',
                    cursor: uploading ? 'wait' : 'pointer',
                    fontSize: 13,
                    color: 'var(--ct-text-muted)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ct-accent, #3B82F6)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ct-border)')}
                >
                  {uploading ? (
                    <Loader2 style={{ width: 14, height: 14, flexShrink: 0 }} className="animate-spin" />
                  ) : (
                    <Upload style={{ width: 14, height: 14, flexShrink: 0 }} />
                  )}
                  {uploading ? 'Uploading…' : 'Upload logo'}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <p style={{ fontSize: 11, color: 'var(--ct-text-muted)', marginTop: 4 }}>
                JPG, PNG, GIF, WebP, SVG. Displayed as the large broadcaster mark in the top-right of the overlay.
              </p>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <Button
                onClick={handleSaveCrew}
                disabled={saving}
                size="sm"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                {saving ? 'Saving…' : 'Save crew identity'}
              </Button>
            </div>

          </div>
        </Section>

        {/* ── STREAMER / SPONSOR SECTION ──────────────────────────────────── */}
        <Section title="Streamer / Sponsor">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div>
              <Label
                htmlFor="streamer-text"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--ct-text-primary)', display: 'block', marginBottom: 6 }}
              >
                Streamer message
              </Label>
              <Textarea
                id="streamer-text"
                value={streamerText}
                onChange={(e) => setStreamerText(e.target.value.slice(0, 240))}
                maxLength={240}
                rows={3}
                placeholder="e.g. Sponsored by Acme Sports — Game presented by Westside Broadcasting"
                style={{ fontSize: 14, resize: 'vertical' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 4,
                  fontSize: 11,
                  color: 'var(--ct-text-muted)',
                }}
              >
                <span>This message scrolls across the bottom of the overlay. Keep it short and high-contrast for readability.</span>
                <span style={{ flexShrink: 0, marginLeft: 12 }}>{streamerText.length}/240</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <Button
                onClick={handleSaveStreamer}
                disabled={savingStreamer}
                size="sm"
              >
                {savingStreamer && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                {savingStreamer ? 'Saving…' : 'Save streamer message'}
              </Button>
            </div>

          </div>
        </Section>

        {/* ── LOWER THIRDS SECTION ────────────────────────────────────────── */}
        <Section title="Lower Thirds">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Status line */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 6,
                background: broadcastState.current_graphic
                  ? 'rgba(59,130,246,0.08)'
                  : 'var(--ct-bg-elevated)',
                border: `1px solid ${broadcastState.current_graphic ? 'rgba(59,130,246,0.25)' : 'var(--ct-border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: broadcastState.current_graphic && ltCountdown > 0
                      ? '#22C55E'
                      : 'var(--ct-text-muted)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--ct-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {broadcastState.current_graphic && ltCountdown > 0
                    ? `${LOWER_THIRD_TYPES.find(t => t.id === broadcastState.current_graphic?.type)?.label ?? broadcastState.current_graphic?.type} — ${ltCountdown}s`
                    : broadcastState.current_graphic
                      ? 'Fading out…'
                      : 'Nothing active'}
                </span>
              </div>
              {broadcastState.current_graphic && (
                <button
                  onClick={handleLtClear}
                  disabled={ltClearing}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--ct-text-muted)',
                    background: 'none',
                    border: '1px solid var(--ct-border)',
                    borderRadius: 4,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {ltClearing
                    ? <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />
                    : null}
                  Clear
                </button>
              )}
            </div>

            {/* Type selector grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {LOWER_THIRD_TYPES.map((t) => {
                const isSelected = ltSelectedType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setLtSelectedType(isSelected ? null : t.id);
                      setLtSelectedPlayerId('');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `1px solid ${isSelected ? '#3B82F6' : 'var(--ct-border)'}`,
                      background: isSelected ? 'rgba(59,130,246,0.10)' : 'var(--ct-bg-elevated)',
                      color: isSelected ? '#3B82F6' : 'var(--ct-text-primary)',
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Inline form for selected type */}
            {ltSelectedType && (() => {
              const typeConfig = LOWER_THIRD_TYPES.find((t) => t.id === ltSelectedType);

              // ── Player picker (player_intro / stat_callout) ────────────────
              if (typeConfig.needsPlayer) {
                return (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 6,
                      border: '1px solid var(--ct-border)',
                      background: 'var(--ct-bg-elevated)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <label
                      style={{ fontSize: 12, fontWeight: 500, color: 'var(--ct-text-muted)' }}
                    >
                      Player
                    </label>
                    <select
                      value={ltSelectedPlayerId}
                      onChange={(e) => setLtSelectedPlayerId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--ct-border)',
                        background: 'var(--ct-bg-card)',
                        color: 'var(--ct-text-primary)',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Select a player…</option>
                      {playerStatsData.map((s) => {
                        const p = s.player;
                        const pts = computePts(s);
                        const name = p ? `${p.first_name} ${p.last_name}` : 'Unknown';
                        const jersey = p?.jersey_number ? ` #${p.jersey_number}` : '';
                        return (
                          <option key={s.player_id} value={s.player_id}>
                            {name}{jersey} — {pts} PTS
                          </option>
                        );
                      })}
                    </select>
                    {playerStatsData.length === 0 && (
                      <p style={{ fontSize: 11, color: 'var(--ct-text-muted)', margin: 0 }}>
                        No players recorded for this game yet.
                      </p>
                    )}
                    <button
                      onClick={handleLtFire}
                      disabled={ltFiring || !ltSelectedPlayerId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: ltFiring || !ltSelectedPlayerId ? '#374151' : '#DC2626',
                        color: ltFiring || !ltSelectedPlayerId ? '#6B7280' : '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: ltFiring || !ltSelectedPlayerId ? 'not-allowed' : 'pointer',
                        transition: 'background 0.12s',
                      }}
                    >
                      {ltFiring
                        ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                        : <Radio style={{ width: 12, height: 12 }} />}
                      {ltFiring ? 'Firing…' : `Fire — ${typeConfig.durationMs / 1000}s`}
                    </button>
                  </div>
                );
              }

              // ── Auto-resolve (leading_scorer / quarter_recap / team_foul_comparison) ──
              let previewLine = '';
              if (ltSelectedType === 'leading_scorer') {
                const top = playerStatsData[0];
                if (top) {
                  const p = top.player;
                  const name = p ? `${p.first_name} ${p.last_name}` : 'Unknown';
                  const jersey = p?.jersey_number ? ` #${p.jersey_number}` : '';
                  previewLine = `Auto: ${name}${jersey} — ${computePts(top)} PTS`;
                } else {
                  previewLine = 'No player stats found for this game yet.';
                }
              } else if (ltSelectedType === 'quarter_recap') {
                previewLine = 'Auto-reads current scores at fire time.';
              } else if (ltSelectedType === 'team_foul_comparison') {
                previewLine = 'Auto-reads current-period fouls at fire time.';
              }

              return (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid var(--ct-border)',
                    background: 'var(--ct-bg-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <p style={{ fontSize: 12, color: 'var(--ct-text-muted)', margin: 0 }}>
                    {previewLine}
                  </p>
                  <button
                    onClick={handleLtFire}
                    disabled={ltFiring || (ltSelectedType === 'leading_scorer' && playerStatsData.length === 0)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: (ltFiring || (ltSelectedType === 'leading_scorer' && playerStatsData.length === 0))
                        ? '#374151'
                        : '#DC2626',
                      color: (ltFiring || (ltSelectedType === 'leading_scorer' && playerStatsData.length === 0))
                        ? '#6B7280'
                        : '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    {ltFiring
                      ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                      : <Radio style={{ width: 12, height: 12 }} />}
                    {ltFiring ? 'Firing…' : `Fire — ${typeConfig.durationMs / 1000}s`}
                  </button>
                </div>
              );
            })()}

          </div>
        </Section>

      </div>
    </div>
  );
}
