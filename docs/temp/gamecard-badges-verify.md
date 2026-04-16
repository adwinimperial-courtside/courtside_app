41:// Inline pill badge — avoids shadcn Badge className conflicts
60:export default function GameCard({ game, teams, leagueName, canManage, onStartGame, onGameUpdated }) {
258:            {leagueName && (
259:              <Pill className="bg-gray-100 text-gray-700">{leagueName}</Pill>
261:            {game.game_stage && game.game_stage !== "regular" && (
263:                {STAGE_LABELS[game.game_stage] || game.game_stage}
267:              <Pill className="bg-green-100 text-green-700">Completed</Pill>
281:            {game.entry_type && (
283:                {ENTRY_TYPE_LABELS[game.entry_type] || game.entry_type}
291:            {game.exclude_from_awards && (
