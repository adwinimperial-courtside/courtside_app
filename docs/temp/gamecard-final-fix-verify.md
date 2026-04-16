8:import { Calendar, MapPin, Play, Settings, AlertTriangle, BarChart3, Trophy } from "lucide-react";
55:    if (game.status !== "final" || !game.player_of_game) {
63:      .eq("id", game.player_of_game)
69:  }, [game.status, game.player_of_game]);
152:              <TableHead className="text-center">UNSPO</TableHead>
364:                    <Trophy className="w-4 h-4 text-amber-500" />
372:                {/* View Stats button for final games */}
381:                    {isExpanded ? "Hide Stats" : "View Stats"}
