3:import { supabase } from "@/lib/supabaseClient";
237:              <SortTh label="PPG"  col="ppg"  {...thProps} />
262:                        {player.jersey_number ?? "—"}
293:// ─── Tab 3: League Leaders ────────────────────────────────────────────────────
296:  { key: "ppg",  label: "PPG Leaders",  icon: "🏀" },
332:                {row.jersey_number ?? "—"}
391:        <span className="font-semibold text-slate-900">League Leaders</span>
421:      supabase.from("leagues").select("*").eq("is_active", true)
434:      supabase.from("teams").select("*").eq("league_id", selectedLeagueId).eq("is_active", true)
445:      supabase.from("players").select("*").in("team_id", teamIds)
454:      supabase.from("games").select("*").eq("league_id", selectedLeagueId).eq("status", "final")
465:      supabase.from("player_stats").select("*").in("game_id", gameIds)
475:    { id: "leaders", label: "League Leaders" },
