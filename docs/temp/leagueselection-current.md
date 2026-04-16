# src/pages/LeagueSelection.jsx — current contents
**Date:** 2026-04-16

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function LeagueSelection() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    loadLeagues();
  }, [currentUser]);

  async function loadLeagues() {
    setLoading(true);
    setError(null);
    try {
      const { data: memberships, error: memErr } = await supabase
        .from('user_league_memberships')
        .select('league_id, role, leagues(id, name, logo_url, is_active)')
        .eq('user_id', currentUser.id)
        .eq('is_active', true);

      if (memErr) throw memErr;

      const activeLeagues = memberships
        .map(m => ({ ...m.leagues, role: m.role }))
        .filter(l => l && l.is_active);

      // If only one league, auto-set it and go straight to Schedule
      if (activeLeagues.length === 1) {
        await setDefaultAndNavigate(activeLeagues[0].id);
        return;
      }

      // Check if user already has a default set
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_league_id')
        .eq('id', currentUser.id)
        .single();

      if (profile.default_league_id) {
        navigate('/Schedule', { replace: true });
        return;
      }

      setLeagues(activeLeagues);
    } catch (err) {
      setError(t('leagueSelection.errorLoading', 'Failed to load your leagues. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function setDefaultAndNavigate(leagueId) {
    setSaving(true);
    try {
      await supabase.from('profiles').update({ default_league_id: leagueId }).eq('id', currentUser.id);
      navigate('/Schedule', { replace: true });
    } catch (err) {
      setError(t('leagueSelection.errorSaving', 'Failed to save your selection. Please try again.'));
      setSaving(false);
    }
  }

  if (loading || saving) {
    return <div>...spinner...</div>;
  }

  return (
    <div>
      {/* Logo, title, subtitle */}
      {/* Error message */}
      {/* League list — each button calls setDefaultAndNavigate(league.id) */}
    </div>
  );
}
```

## Notes
- Already fully rebuilt against Supabase — no Base44 dependencies
- Uses `useAuth()` for `currentUser` (Supabase session user)
- Flow:
  1. Load `user_league_memberships` for this user
  2. If 0 leagues → shows empty state (falls through to empty league list)
  3. If 1 league → auto-selects and navigates to `/Schedule`
  4. If already has `default_league_id` set → navigates directly to `/Schedule`
  5. If multiple leagues, no default → shows picker
- Sets `profiles.default_league_id` on selection
- Uses inline styles throughout (no Tailwind)
- No explicit handling for 0 leagues — user sees empty list with no guidance

## Status
✅ Ready — no changes needed for Phase 5 auth flow.
The post-login redirect chain is: `/Login` → auth state change → `AuthenticatedApp` re-renders → `/Login` hits `<Navigate to="/LeagueSelection" replace />` → `LeagueSelection` → `/Schedule`
