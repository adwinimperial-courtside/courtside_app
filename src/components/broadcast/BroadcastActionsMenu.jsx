import { useQuery } from "@tanstack/react-query";
import { MoreVertical, Link } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function BroadcastActionsMenu({ gameId, leagueId }) {
  const { currentUser, isAppAdmin } = useAuth();
  const userId = currentUser?.id;

  const { data: membership } = useQuery({
    queryKey: ["my-league-role", leagueId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_league_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("league_id", leagueId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!userId && !!leagueId && !isAppAdmin,
    staleTime: 60000,
  });

  const isLeagueAdmin = membership?.role === "league_admin";

  if (!isAppAdmin && !isLeagueAdmin) return null;

  const handleCopyOverlayLink = async () => {
    const url = `${window.location.origin}/overlay/${gameId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Overlay link copied" });
    } catch (err) {
      toast({ title: "Couldn't copy link", description: err.message, variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center rounded-md w-7 h-7 transition-colors"
          style={{ color: "var(--ct-text-muted)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--ct-bg-elevated)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          aria-label="Broadcast actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Phase 3 will add additional items here: Open broadcast control, Toggle overlay visibility. */}
        <DropdownMenuItem onClick={handleCopyOverlayLink}>
          <Link className="w-4 h-4 mr-2" />
          Copy overlay link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
