"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  endAdminSession,
  isAdminAuthenticated,
  passwordMatches,
  startAdminSession,
} from "@/lib/admin-auth";
import { fetchPenaltyTypes, fetchPlayers } from "@/lib/queries";
import { getAdminClient } from "@/lib/supabase";
import { strings } from "@/lib/strings";
import { validateMatchInput, type ErrorKey } from "@/lib/match-validation";
import type { MatchInput, SaveResult } from "@/lib/types";

// The admin page is only reachable through the secret path.
function adminHref(query = "") {
  return `/${process.env.ADMIN_PATH_SECRET ?? ""}${query}`;
}

function errorRedirect(key: ErrorKey, tab?: string): never {
  const params = new URLSearchParams({ error: key });
  if (tab) params.set("tab", tab);
  redirect(adminHref(`?${params.toString()}`));
}

function savedRedirect(tab: string): never {
  redirect(adminHref(`?tab=${tab}&saved=1`));
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdminOrRedirect(tab?: string) {
  if (!(await isAdminAuthenticated())) {
    errorRedirect("unauthorized", tab);
  }
}

export async function login(formData: FormData) {
  if (!passwordMatches(text(formData, "password"))) {
    redirect(adminHref("?error=wrongPassword"));
  }
  await startAdminSession();
  redirect(adminHref());
}

export async function logout() {
  await endAdminSession();
  redirect(adminHref());
}

export async function saveDashboardSettings(formData: FormData) {
  await requireAdminOrRedirect("settings");

  const rows = Object.keys(strings.admin.widgetLabels).map((key) => ({
    key,
    enabled: formData.get(key) === "on",
  }));

  const { error } = await getAdminClient()
    .from("dashboard_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) {
    console.error(error);
    errorRedirect("saveFailed", "settings");
  }

  revalidatePath("/", "layout");
  savedRedirect("settings");
}

export async function savePlayer(formData: FormData) {
  await requireAdminOrRedirect("players");

  const id = text(formData, "id") || null;
  const name = text(formData, "name");
  const jerseyRaw = text(formData, "jersey_number");
  const active = formData.get("active") === "on";

  if (name === "") errorRedirect("nameRequired", "players");

  const jersey = jerseyRaw === "" ? null : Number(jerseyRaw);
  if (jersey !== null && (!Number.isInteger(jersey) || jersey < 0 || jersey > 99)) {
    errorRedirect("jerseyInvalid", "players");
  }

  const client = getAdminClient();

  const { data: sameName } = await client
    .from("players")
    .select("id")
    .ilike("name", name)
    .neq("id", id ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);
  if (sameName && sameName.length > 0) errorRedirect("playerNameTaken", "players");

  const { error } = id
    ? await client.from("players").update({ name, jersey_number: jersey, active }).eq("id", id)
    : await client.from("players").insert({ name, jersey_number: jersey, active });
  if (error) {
    console.error(error);
    errorRedirect("saveFailed", "players");
  }

  revalidatePath("/", "layout");
  savedRedirect("players");
}

export async function savePenaltyType(formData: FormData) {
  await requireAdminOrRedirect("penalties");

  const id = text(formData, "id") || null;
  const name = text(formData, "name");
  const minutesRaw = text(formData, "default_minutes");
  const minutes = Number(minutesRaw);

  if (name === "") errorRedirect("nameRequired", "penalties");
  if (!Number.isInteger(minutes) || minutes < 0) {
    errorRedirect("penaltyMinutesInvalid", "penalties");
  }

  const client = getAdminClient();

  const { data: sameName } = await client
    .from("penalty_types")
    .select("id")
    .eq("name", name)
    .neq("id", id ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);
  if (sameName && sameName.length > 0) errorRedirect("penaltyTypeNameTaken", "penalties");

  const { error } = id
    ? await client.from("penalty_types").update({ name, default_minutes: minutes }).eq("id", id)
    : await client.from("penalty_types").insert({ name, default_minutes: minutes });
  if (error) {
    console.error(error);
    errorRedirect("saveFailed", "penalties");
  }

  revalidatePath("/", "layout");
  savedRedirect("penalties");
}

// Called from the match form (client component), so it returns a result
// instead of redirecting. The form handles navigation on success.
export async function saveMatch(input: MatchInput): Promise<SaveResult> {
  if (!(await isAdminAuthenticated())) {
    return { ok: false, error: strings.errors.unauthorized };
  }

  const client = getAdminClient();
  const [players, penaltyTypes] = await Promise.all([
    fetchPlayers(client),
    fetchPenaltyTypes(client),
  ]);

  const problem = validateMatchInput(input, players, penaltyTypes);
  if (problem) {
    return { ok: false, error: strings.errors[problem] };
  }

  const { data, error } = await client.rpc("save_match", {
    p_match_id: input.id,
    p_match: {
      played_at: input.playedAt,
      opponent: input.opponent.trim(),
      home_away: input.homeAway,
      opponent_score: input.opponentScore,
      player_of_match_id: input.playerOfMatchId,
      notes: input.notes?.trim() || null,
    },
    p_lineup: input.lineup.map((row) => ({
      player_id: row.playerId,
      is_goalkeeper: row.isGoalkeeper,
    })),
    p_events: input.events.map((event) =>
      event.type === "goal"
        ? {
            type: "goal",
            period: event.period,
            minute: event.minute,
            player_id: event.playerId,
            assist1_player_id: event.assist1PlayerId,
            assist2_player_id: event.assist2PlayerId,
          }
        : {
            type: "penalty",
            period: event.period,
            minute: event.minute,
            player_id: event.playerId,
            penalty_type: event.penaltyType,
            penalty_minutes: event.penaltyMinutes,
          },
    ),
  });

  if (error) {
    console.error(error);
    const message =
      error.code === "P0002" ? strings.errors.matchNotFound : strings.errors.saveFailed;
    return { ok: false, error: message };
  }

  revalidatePath("/", "layout");
  return { ok: true, matchId: data as string };
}

export async function deleteMatch(formData: FormData) {
  await requireAdminOrRedirect("matches");

  const id = text(formData, "id");
  if (!id) errorRedirect("matchNotFound", "matches");

  const { error } = await getAdminClient().from("matches").delete().eq("id", id);
  if (error) {
    console.error(error);
    errorRedirect("saveFailed", "matches");
  }

  revalidatePath("/", "layout");
  savedRedirect("matches");
}
