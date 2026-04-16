# src/pages/Home.jsx — current contents
**Date:** 2026-04-16

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const { isAuthenticated, isLoadingAuth, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      navigate('/Landing', { replace: true });
      return;
    }

    if (!currentUser) return;

    const route = async () => {
      setIsRouting(true);
      try {
        // Check for active memberships
        const { data: memberships } = await supabase
          .from('user_league_memberships')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
          .limit(1);

        if (memberships && memberships.length > 0) {
          navigate('/LeagueSelection', { replace: true });
          return;
        }

        // Check latest application
        const { data: applications } = await supabase
          .from('league_applications')
          .select('id, status')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (applications && applications.length > 0) {
          const latest = applications[0];
          if (latest.status === 'pending') {
            navigate('/PendingApproval', { replace: true });
            return;
          }
        }

        // No memberships, no pending application (none at all, or only rejected)
        navigate('/RoleSelection', { replace: true });
      } catch (err) {
        console.error('[Home] routing error', err);
        navigate('/RoleSelection', { replace: true });
      } finally {
        setIsRouting(false);
      }
    };

    route();
  }, [isAuthenticated, isLoadingAuth, currentUser, navigate]);

  // Show spinner while auth is loading or routing queries are in flight
  if (isLoadingAuth || isRouting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return null;
}
```

## Routing logic

| Condition | Destination |
|-----------|-------------|
| Not authenticated | `/Landing` |
| Has active `user_league_memberships` row | `/LeagueSelection` |
| Latest `league_applications` row is `pending` | `/PendingApproval` |
| No applications, or all rejected | `/RoleSelection` |
| Error during queries | `/RoleSelection` (fallback) |

## Notes
- Spinner shown during `isLoadingAuth` AND while async routing queries are in flight (`isRouting`)
- Returns `null` after routing completes — component never visibly renders content
- Auto-registered at `/Home` via pagesConfig; also serves as the `/` root via `MainPage` in App.jsx
