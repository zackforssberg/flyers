import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DashboardSetting,
  HotPlayer,
  MatchEvent,
  MatchPlayer,
  MatchResult,
  MatchRow,
  PenaltyType,
  Player,
  PlayerStat,
} from "@/lib/types";

// Read helpers. Each takes a client so the public (anon) and admin
// (service role) pages can share them. Errors are thrown and caught by
// app/error.tsx.

export async function fetchPlayers(client: SupabaseClient): Promise<Player[]> {
  const { data, error } = await client
    .from("players")
    .select("id, name, jersey_number, active")
    .order("name");
  if (error) throw error;
  return data as Player[];
}

export async function fetchPlayerStats(client: SupabaseClient): Promise<PlayerStat[]> {
  const { data, error } = await client
    .from("player_stats")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as PlayerStat[];
}

export async function fetchMatches(client: SupabaseClient): Promise<MatchRow[]> {
  const { data, error } = await client
    .from("matches")
    .select("id, played_at, opponent, home_away, opponent_score, player_of_match_id, notes")
    .order("played_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as MatchRow[];
}

export async function fetchResults(
  client: SupabaseClient,
  limit?: number,
): Promise<MatchResult[]> {
  let query = client
    .from("match_results")
    .select("*")
    .order("played_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data as MatchResult[];
}

export async function fetchHotPlayers(
  client: SupabaseClient,
  limit: number,
): Promise<HotPlayer[]> {
  const { data, error } = await client.from("hot_players").select("*").limit(limit);
  if (error) throw error;
  return data as HotPlayer[];
}

export async function fetchDashboardSettings(
  client: SupabaseClient,
): Promise<DashboardSetting[]> {
  const { data, error } = await client
    .from("dashboard_settings")
    .select("key, enabled")
    .order("key");
  if (error) throw error;
  return data as DashboardSetting[];
}

export async function fetchPenaltyTypes(client: SupabaseClient): Promise<PenaltyType[]> {
  const { data, error } = await client
    .from("penalty_types")
    .select("id, name, default_minutes")
    .order("name");
  if (error) throw error;
  return data as PenaltyType[];
}

export async function fetchLineups(client: SupabaseClient): Promise<MatchPlayer[]> {
  const { data, error } = await client
    .from("match_players")
    .select("match_id, player_id, is_goalkeeper");
  if (error) throw error;
  return data as MatchPlayer[];
}

export async function fetchEvents(client: SupabaseClient): Promise<MatchEvent[]> {
  const { data, error } = await client
    .from("match_events")
    .select(
      "id, match_id, type, period, minute, player_id, assist1_player_id, assist2_player_id, penalty_type, penalty_minutes",
    )
    .order("period")
    .order("minute", { nullsFirst: false });
  if (error) throw error;
  return data as MatchEvent[];
}
