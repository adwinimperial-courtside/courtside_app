import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tv2, Upload, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBroadcastState } from '@/hooks/useBroadcastState';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

  // ── Crew identity local state ────────────────────────────────────────────────
  const [crewName, setCrewName] = useState('');
  const [crewLogoUrl, setCrewLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Sync crew form from broadcastState on first load
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!bsLoading && !initializedRef.current) {
      initializedRef.current = true;
      setCrewName(broadcastState.crew_name ?? '');
      setCrewLogoUrl(broadcastState.crew_logo_url ?? null);
    }
  }, [bsLoading, broadcastState.crew_name, broadcastState.crew_logo_url]);

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
                Displayed on the scorebug crew strip when set.
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
                JPG, PNG, GIF, WebP, SVG. Shown on scorebug instead of the initial square.
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

      </div>
    </div>
  );
}
