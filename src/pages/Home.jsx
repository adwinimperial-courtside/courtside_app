import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';

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
        // Process any pending invite from before login
        const pendingToken = localStorage.getItem("pendingInviteToken");
        if (pendingToken) {
          const { data: invite } = await supabase
            .from("league_invitations")
            .select("*, league:leagues!league_id(id, name)")
            .eq("token", pendingToken)
            .eq("status", "pending")
            .maybeSingle();

          if (invite && new Date(invite.expires_at) >= new Date()) {
            const { data: existing } = await supabase
              .from("user_league_memberships")
              .select("id")
              .eq("user_id", currentUser.id)
              .eq("league_id", invite.league_id)
              .maybeSingle();

            if (!existing) {
              await supabase.from("user_league_memberships").insert({
                user_id: currentUser.id,
                league_id: invite.league_id,
                role: invite.role,
                is_active: true,
              });
            }

            await supabase.from("league_invitations").update({
              status: "accepted",
              accepted_at: new Date().toISOString(),
              accepted_by: currentUser.id,
            }).eq("id", invite.id);

            toast({ title: `You've joined ${invite.league?.name}!` });
          }

          localStorage.removeItem("pendingInviteToken");
        }

        // Check for active memberships
        const { data: memberships, error: memError } = await supabase
          .from('user_league_memberships')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
          .limit(1);

        console.log('[Home] memberships result:', memberships, 'error:', memError);

        if (memberships && memberships.length > 0) {
          console.log('[Home] navigating to: /LeagueSelection');
          navigate('/LeagueSelection', { replace: true });
          return;
        }

        // Check latest application
        const { data: applications, error: appError } = await supabase
          .from('league_applications')
          .select('id, status')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('[Home] applications result:', applications, 'error:', appError);

        if (applications && applications.length > 0) {
          const latest = applications[0];
          if (latest.status === 'pending') {
            console.log('[Home] navigating to: /PendingApproval');
            navigate('/PendingApproval', { replace: true });
            return;
          }
        }

        // No memberships, no pending application (none at all, or only rejected)
        console.log('[Home] navigating to: /RoleSelection');
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
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "var(--color-bg-page)" }}
      >
        <div
          className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: "var(--ct-border)", borderTopColor: "var(--ct-accent)" }}
        />
      </div>
    );
  }

  return null;
}
