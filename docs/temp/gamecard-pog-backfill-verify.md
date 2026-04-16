13:import { findPlayerOfGame } from "../utils/pogCalculator";
49:  const [pogPlayer, setPogPlayer] = useState(null);
56:    if (game.status !== "final" || !game.player_of_game) {
57:      setPogPlayer(null);
64:      .eq("id", game.player_of_game)
70:  }, [game.status, game.player_of_game]);
72:  // Backfill player_of_game for final games where it was never calculated
74:    if (game.status !== "final" || game.player_of_game) return;
83:      const pogPlayerId = findPlayerOfGame(stats, game, null);
84:      if (!pogPlayerId) return;
89:        .update({ player_of_game: pogPlayerId })
97:        .eq("id", pogPlayerId)
103:  }, [game.id, game.status, game.player_of_game]);
145:    : null;
149:    : null;
