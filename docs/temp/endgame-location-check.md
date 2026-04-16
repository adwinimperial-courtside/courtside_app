914:  // ─── End Game ─────────────────────────────────────────────────────────────
934:  const handleEndGameFromModal = async () => {
950:    if (gameErr) { console.error('[handleEndGameFromModal]', gameErr); return; }
970:  const handleEndGame = async () => {
973:      await handleEndGameFromModal();
975:      console.error('[handleEndGame]', err);
1304:          <Button onClick={handleEndGame}
1306:            <Trophy className="w-4 h-4 mr-1" />End Game
1315:          onEndGame={handleEndGameFromModal}
1337:          <Button onClick={handleEndGame}
1339:            <Trophy className="w-5 h-5 mr-2" />End Game
1349:            onEndGame={handleEndGameFromModal}
1445:        onEndGame={handleEndGameFromModal}
1462:              Click <span className="font-bold text-green-600">End Game</span> if the game is finished. Otherwise you can exit — the game will stay <span className="font-bold text-indigo-600">LIVE</span>.
