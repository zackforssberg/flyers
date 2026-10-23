// Row types for the tables and views in supabase/migrations.
// Plain types (no server-only imports) so client components can use them.

export type HomeAway = "home" | "away";
export type EventType = "goal" | "penalty";

export type Player = {
  id: string;
  name: string;
  jersey_number: number | null;
  active: boolean;
};

export type PlayerStat = {
  player_id: string;
  name: string;
  jersey_number: number | null;
  active: boolean;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_count: number;
  penalty_minutes: number;
};

export type MatchResult = {
  match_id: string;
  played_at: string;
  opponent: string;
  home_away: HomeAway;
  opponent_score: number;
  our_score: number;
  player_of_match_id: string | null;
};

export type MatchRow = {
  id: string;
  played_at: string;
  opponent: string;
  home_away: HomeAway;
  opponent_score: number;
  player_of_match_id: string | null;
  notes: string | null;
};

export type HotPlayer = {
  player_id: string;
  name: string;
  goals: number;
  assists: number;
  points: number;
};

export type PenaltyType = {
  id: string;
  name: string;
  default_minutes: number;
};

export type DashboardSetting = {
  key: string;
  enabled: boolean;
};

export type MatchPlayer = {
  match_id: string;
  player_id: string;
  is_goalkeeper: boolean;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  type: EventType;
  period: number;
  minute: number | null;
  player_id: string;
  assist1_player_id: string | null;
  assist2_player_id: string | null;
  penalty_type: string | null;
  penalty_minutes: number | null;
};

// Form payloads sent from the admin UI to the save action.
export type LineupInput = { playerId: string; isGoalkeeper: boolean };

export type EventInput =
  | {
      type: "goal";
      period: number;
      minute: number | null;
      playerId: string;
      assist1PlayerId: string | null;
      assist2PlayerId: string | null;
    }
  | {
      type: "penalty";
      period: number;
      minute: number | null;
      playerId: string;
      penaltyType: string;
      penaltyMinutes: number;
    };

export type MatchInput = {
  id: string | null;
  playedAt: string;
  opponent: string;
  homeAway: HomeAway;
  opponentScore: number;
  playerOfMatchId: string | null;
  notes: string | null;
  lineup: LineupInput[];
  events: EventInput[];
};

export type SaveResult = { ok: true; matchId: string } | { ok: false; error: string };
