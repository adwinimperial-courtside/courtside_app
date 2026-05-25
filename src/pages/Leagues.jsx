import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";

import LeagueCard from "../components/leagues/LeagueCard";
import CreateLeagueDialog from "../components/leagues/CreateLeagueDialog";

export default function LeaguesPage() {
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();
  const isNarrow = useIsNarrowLayout();

  // Fetch current user's session
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;
  const isAppAdmin = session?.user?.user_metadata?.app_admin === true;

  // Fetch this user's league memberships, joining league details
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["league-memberships", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_league_memberships")
        .select(`
          id,
          role,
          is_active,
          is_billing_admin,
          league:leagues (
            id,
            name,
            slug,
            country,
            timezone,
            sport,
            logo_url,
            is_active,
            created_at
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user's profile to get default_league_id
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("default_league_id")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Set default league
  const setDefaultLeagueMutation = useMutation({
    mutationFn: async (leagueId) => {
      const { error } = await supabase
        .from("profiles")
        .update({ default_league_id: leagueId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  // Auto-set default if user only has one league and none is set
  React.useEffect(() => {
    if (
      memberships.length === 1 &&
      profile &&
      !profile.default_league_id
    ) {
      setDefaultLeagueMutation.mutate(memberships[0].league.id);
    }
  }, [memberships, profile]);

  const userIsLeagueAdmin = memberships.some((m) => m.role === "league_admin");

  return (
    <div className="min-h-screen" style={{ background: "var(--ct-bg-page)" }}>
      <div className={`max-w-7xl mx-auto ${isNarrow ? "px-4 py-4" : "px-4 sm:px-6 lg:px-8 py-8 md:py-12"}`}>

        {/* Header */}
        <div className={isNarrow ? "flex flex-col gap-3 mb-4" : "flex flex-row justify-between items-center gap-6 mb-10"}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-xl flex items-center justify-center flex-shrink-0 ${isNarrow ? "w-10 h-10" : "w-12 h-12"}`}
                style={{ background: "var(--ct-accent-gold)" }}
              >
                <Trophy className={`${isNarrow ? "w-5 h-5" : "w-6 h-6"} text-white`} />
              </div>
              <div className="min-w-0">
                <h1 className={`font-bold leading-tight truncate ${isNarrow ? "text-2xl" : "text-3xl md:text-4xl"}`} style={{ color: "var(--ct-text-primary)" }}>
                  {t("leagues.title", "Leagues")}
                </h1>
                {isNarrow && (
                  <p className="text-xs truncate" style={{ color: "var(--ct-text-muted)" }}>
                    {t("leagues.subtitle", "Manage your basketball leagues")}
                  </p>
                )}
              </div>
            </div>
            {!isNarrow && (
              <p className="mt-2 ml-15" style={{ color: "var(--ct-text-secondary)" }}>
                {t("leagues.subtitle", "Manage your basketball leagues and competitions")}
              </p>
            )}
          </div>

          {(isAppAdmin || userIsLeagueAdmin) && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className={`text-white ${isNarrow ? "w-full h-11 rounded-lg" : "h-12 px-6"}`}
              style={{ background: "var(--ct-accent)", border: "none" }}
            >
              <Plus className={`${isNarrow ? "w-4 h-4" : "w-5 h-5"} mr-1.5`} />
              {t("leagues.createLeague", "Create League")}
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={isNarrow ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-[var(--ct-bg-card)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : memberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-24 h-24 bg-[var(--ct-bg-elevated)] rounded-full flex items-center justify-center mb-6">
              <Trophy className="w-12 h-12 text-[var(--ct-text-muted)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--ct-text-primary)] mb-2">
              {t("leagues.noLeagues", "No Leagues Assigned")}
            </h3>
            <p className="text-[var(--ct-text-secondary)] text-center mb-8 max-w-md">
              {t(
                "leagues.noLeaguesDescription",
                "You haven't been assigned to any leagues yet. Contact an admin to get assigned."
              )}
            </p>
          </div>
        ) : (
          <div className={isNarrow ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {memberships.map((membership) => (
              <LeagueCard
                key={membership.league.id}
                league={membership.league}
                role={membership.role}
                isDefault={profile?.default_league_id === membership.league.id}
                onSetDefault={
                  memberships.length > 1
                    ? () => setDefaultLeagueMutation.mutate(membership.league.id)
                    : null
                }
                multipleLeagues={memberships.length > 1}
              />
            ))}
          </div>
        )}

        <CreateLeagueDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </div>
  );
}
