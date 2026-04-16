16:export default function GameCard({ game, teams, canManage, onStartGame, onGameUpdated }) {
300:                      onClick={onStartGame}
332:                      onClick={() => navigate(createPageUrl(`LiveBoxScore?gameId=${game.id}`))}
336:                      View Live Box Score
340:                      onClick={onStartGame}
344:                      Continue
