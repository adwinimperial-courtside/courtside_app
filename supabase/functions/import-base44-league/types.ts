// =============================================================================
// types.ts — Request/response types for the Base44 → Supabase league importer
// =============================================================================
// Mirrors the Base44 backup JSON shape (input) and the typed result envelopes
// returned by the Edge Function. Field nullability follows the mapping doc:
//   docs/temp/base44-to-supabase-mapping.md
// =============================================================================

// ─── Base44 entity shapes (as they appear in the backup JSON) ────────────────

export interface Base44League {
  id: string;                     // 24-char hex
  name: string;
  season: string | null;
  description: string | null;
  is_sample: boolean;
  created_date: string;           // ISO 8601
  updated_date: string;
  created_by_id: string | null;
  created_by: string | null;      // email
}

export interface Base44Team {
  id: string;
  league_id: string;
  name: string;
  color: string | null;
  logo_url: string | null;
  wins: number | null;
  losses: number | null;
  head_coach: string | null;
  manager: string | null;
  team_captain: string | null;
  bracket: string | null;
  is_sample: boolean;
  created_date: string;
  updated_date: string;
  created_by_id: string | null;
  created_by: string | null;
}

export interface Base44Player {
  id: string;
  team_id: string | null;
  name: string;
  jersey_number: number | null;
  position: string | null;
  is_sample: boolean;
  created_date: string;
  updated_date: string;
  created_by_id: string | null;
  created_by: string | null;
}

export interface Base44Game {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  home_team_fouls: Record<string, number> | null;
  away_team_fouls: Record<string, number> | null;
  home_timeouts: number | null;
  away_timeouts: number | null;
  clock_running: boolean | null;
  clock_started_at: string | null;
  clock_time_left: number | null;
  clock_period: number | null;
  period_count: number | null;
  period_minutes: number | null;
  overtime_minutes: number | null;
  period_type: string | null;
  status: string;
  period_status: string | null;
  game_stage: string | null;
  game_mode: string | null;
  entry_type: string | null;
  is_default_result: boolean | null;
  default_winner_team_id: string | null;
  default_loser_team_id: string | null;
  default_reason: string | null;
  exclude_from_awards: boolean | null;
  exclude_from_player_stats: boolean | null;
  exclude_from_pog: boolean | null;
  game_rules: Record<string, unknown> | null;
  player_of_game: string | null;
  location: string | null;
  possession: string | null;
  game_date: string | null;
  edited: boolean | null;
  result_type: string | null;
  result_updated_at: string | null;
  result_updated_by: string | null;
  is_sample: boolean;
  created_date: string;
  updated_date: string;
  created_by_id: string | null;
  created_by: string | null;
}

export interface Base44PlayerStats {
  id: string;
  game_id: string;
  player_id: string;
  team_id: string;
  points_2: number | null;
  points_3: number | null;
  free_throws: number | null;
  free_throws_missed: number | null;
  offensive_rebounds: number | null;
  defensive_rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fouls: number | null;
  technical_fouls: number | null;
  unsportsmanlike_fouls: number | null;
  is_starter: boolean | null;
  is_active: boolean | null;
  did_play: boolean | null;
  minutes_played: number | null;
  is_sample: boolean;
  created_date: string;
  updated_date: string;
  created_by_id: string | null;
  created_by: string | null;
}

export interface Base44GameLog {
  id: string;
  game_id: string;
  team_id: string | null;
  player_id: string | null;
  player_stat_id: string | null;
  stat_type: string;
  stat_label: string | null;
  stat_points: number | null;
  stat_color: string | null;
  old_home_score: number | null;
  old_away_score: number | null;
  old_value: unknown;       // any — int for stats, object for substitutions
  new_value: unknown;
  logged_by: string | null;
  device_name: string | null;
  is_sample: boolean;
  created_date: string;
  updated_date: string;
  created_by_id: string | null;
  created_by: string | null;
}

// ─── Payload envelopes ───────────────────────────────────────────────────────

export interface ImportPayload {
  league: Base44League;
  teams: Base44Team[];
  players: Base44Player[];
  games: Base44Game[];
  player_stats: Base44PlayerStats[];
  game_logs: Base44GameLog[];
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface ImportResult {
  success: true;
  league_id: string;            // new Supabase UUID
  legacy_base44_id: string;     // original Base44 id
  slug: string;
  counts: Record<string, number>;
  warnings: string[];
  duration_ms: number;
}

export interface ImportError {
  success: false;
  error: string;
  rolled_back: boolean;
}

// ─── Supabase-shaped insert records (what we send to Postgres) ───────────────

export interface SupabaseLeagueRow {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  sport: string;
  is_active: boolean;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
  legacy_base44_id: string;
  legacy_created_by_email: string | null;
  legacy_extras: Record<string, unknown>;
}

export interface SupabaseTeamRow {
  id: string;
  league_id: string;
  name: string;
  color: string | null;
  logo_url: string | null;
  head_coach: string | null;
  manager: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  legacy_base44_id: string;
  legacy_created_by_email: string | null;
  legacy_extras: Record<string, unknown>;
}

export interface SupabasePlayerRow {
  id: string;
  league_id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  is_active: boolean;
  is_captain: boolean;
  created_at: string;
  updated_at: string;
  legacy_base44_id: string;
  legacy_created_by_email: string | null;
  legacy_extras: Record<string, unknown>;
}

export interface SupabaseGameRow {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string | null;
  status: string;
  home_score: number;
  away_score: number;
  venue: string | null;
  game_stage: string;
  exclude_from_awards: boolean;
  is_default_result: boolean;
  default_winner_team_id: string | null;
  default_loser_team_id: string | null;
  default_reason: string | null;
  game_mode: string;
  period_type: string | null;
  period_count: number | null;
  period_minutes: number | null;
  overtime_minutes: number | null;
  player_of_game: string | null;
  clock_running: boolean;
  clock_started_at: string | null;
  clock_time_left: number | null;
  clock_period: number;
  period_status: string | null;
  possession: string | null;
  home_team_fouls: Record<string, unknown>;
  away_team_fouls: Record<string, unknown>;
  home_timeouts: Record<string, unknown>;
  away_timeouts: Record<string, unknown>;
  game_rules: Record<string, unknown> | null;
  entry_type: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
  legacy_base44_id: string;
  legacy_created_by_email: string | null;
  legacy_extras: Record<string, unknown>;
}

export interface SupabasePlayerStatsRow {
  id: string;
  league_id: string;
  game_id: string;
  player_id: string;
  team_id: string;
  points: number;
  field_goals_made: number;
  field_goals_attempted: number;
  three_pointers_made: number;
  three_pointers_attempted: number;
  free_throws_made: number;
  free_throws_attempted: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes_played: number | null;
  is_starter: boolean;
  points_2: number;
  points_3: number;
  free_throws: number;
  free_throws_missed: number;
  technical_fouls: number;
  unsportsmanlike_fouls: number;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  legacy_base44_id: string;
  legacy_created_by_email: string | null;
  legacy_extras: Record<string, unknown>;
}

export interface SupabaseGameLogRow {
  id: string;
  game_id: string;
  league_id: string;
  player_id: string | null;
  team_id: string | null;
  player_stat_id: string | null;
  stat_type: string;
  stat_label: string | null;
  stat_points: number;
  stat_color: string | null;
  old_value: number | null;
  new_value: number | null;
  old_home_score: number | null;
  old_away_score: number | null;
  undone: boolean;
  clock_time: number | null;
  period: number | null;
  logged_by: string | null;
  device_name: string | null;
  created_at: string;
  updated_at: string;
  legacy_base44_id: string;
  legacy_created_by_email: string | null;
  legacy_extras: Record<string, unknown>;
}

export interface IdMappingRow {
  entity_type: string;
  base44_id: string;
  supabase_id: string;
}
