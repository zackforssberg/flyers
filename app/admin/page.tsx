import { Suspense } from "react";
import { connection } from "next/server";
import { EmptyState, Loading, PageTitle } from "@/components/ui";
import { MatchForm } from "@/components/admin/match-form";
import {
  LoginSection,
  MatchesSection,
  Notice,
  PenaltyTypesSection,
  PlayersSection,
  SettingsSection,
} from "@/components/admin/sections";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { strings } from "@/lib/strings";
import { getAdminClient } from "@/lib/supabase";
import {
  fetchDashboardSettings,
  fetchEvents,
  fetchLineups,
  fetchMatches,
  fetchPenaltyTypes,
  fetchPlayers,
} from "@/lib/queries";
import type { EventInput, MatchInput } from "@/lib/types";
import { logout } from "./actions";

type SearchParams = {
  tab?: string;
  match?: string;
  error?: string;
  saved?: string;
};

const TABS = ["settings", "players", "log", "matches", "penalties"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // Session expiry depends on the current time, so this must render per request.
  await connection();
  const params = await searchParams;
  const adminPath = `/${process.env.ADMIN_PATH_SECRET ?? ""}`;
  const errorMessage = params.error
    ? (strings.errors as Record<string, string>)[params.error]
    : undefined;

  if (!(await isAdminAuthenticated())) {
    return <LoginSection error={errorMessage} />;
  }

  const client = getAdminClient();
  const [players, penaltyTypes, settings, matches, lineups, events] = await Promise.all([
    fetchPlayers(client),
    fetchPenaltyTypes(client),
    fetchDashboardSettings(client),
    fetchMatches(client),
    fetchLineups(client),
    fetchEvents(client),
  ]);

  const tab: Tab = (TABS as readonly string[]).includes(params.tab ?? "")
    ? (params.tab as Tab)
    : "log";

  const notice = errorMessage
    ? { kind: "error" as const, text: errorMessage }
    : params.saved
      ? { kind: "ok" as const, text: strings.admin.saved }
      : undefined;

  let body: React.ReactNode;
  if (tab === "settings") {
    body = <SettingsSection settings={settings} />;
  } else if (tab === "players") {
    body = <PlayersSection players={players} />;
  } else if (tab === "penalties") {
    body = <PenaltyTypesSection penaltyTypes={penaltyTypes} />;
  } else if (tab === "matches") {
    const scores: Record<string, number> = {};
    for (const event of events) {
      if (event.type === "goal") {
        scores[event.match_id] = (scores[event.match_id] ?? 0) + 1;
      }
    }
    body = <MatchesSection matches={matches} adminPath={adminPath} scores={scores} />;
  } else {
    const editing = params.match ? matches.find((match) => match.id === params.match) : undefined;
    const initial = editing
      ? toMatchInput(
          editing,
          lineups.filter((row) => row.match_id === editing.id),
          events.filter((event) => event.match_id === editing.id),
        )
      : null;

    body = (
      <>
        <h2 className="mb-3 text-lg font-semibold text-flyers-blue">
          {initial ? strings.admin.log.titleEdit : strings.admin.log.titleNew}
        </h2>
        {players.length === 0 ? (
          <EmptyState>{strings.admin.log.noActivePlayers}</EmptyState>
        ) : (
          <MatchForm
            key={initial?.id ?? "new"}
            adminPath={adminPath}
            defaultDate={new Date().toISOString().slice(0, 10)}
            players={players}
            penaltyTypes={penaltyTypes}
            initial={initial}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageTitle>{strings.admin.pageTitle}</PageTitle>
        <form action={logout}>
          <button type="submit" className="text-sm font-medium text-flyers-blue underline">
            {strings.admin.logoutButton}
          </button>
        </form>
      </div>

      <nav aria-label={strings.admin.pageTitle} className="mb-6 -mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 text-sm font-medium">
          {TABS.map((key) => (
            <li key={key}>
              <a
                href={`${adminPath}?tab=${key}`}
                aria-current={key === tab ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2 ring-1 ring-flyers-line ${
                  key === tab ? "bg-flyers-blue text-white" : "bg-white text-flyers-blue"
                }`}
              >
                {strings.admin.tabs[key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {body}
    </>
  );
}

// Turns a saved match (plus its lineup and events) into the form's input shape.
function toMatchInput(
  match: {
    id: string;
    played_at: string;
    opponent: string;
    home_away: "home" | "away";
    opponent_score: number;
    player_of_match_id: string | null;
    notes: string | null;
  },
  lineup: { player_id: string; is_goalkeeper: boolean }[],
  events: {
    type: "goal" | "penalty";
    period: number;
    minute: number | null;
    player_id: string;
    assist1_player_id: string | null;
    assist2_player_id: string | null;
    penalty_type: string | null;
    penalty_minutes: number | null;
  }[],
): MatchInput {
  const mapped: EventInput[] = events.map((event) =>
    event.type === "goal"
      ? {
          type: "goal",
          period: event.period,
          minute: event.minute,
          playerId: event.player_id,
          assist1PlayerId: event.assist1_player_id,
          assist2PlayerId: event.assist2_player_id,
        }
      : {
          type: "penalty",
          period: event.period,
          minute: event.minute,
          playerId: event.player_id,
          penaltyType: event.penalty_type ?? "",
          penaltyMinutes: event.penalty_minutes ?? 0,
        },
  );

  return {
    id: match.id,
    playedAt: match.played_at,
    opponent: match.opponent,
    homeAway: match.home_away,
    opponentScore: match.opponent_score,
    playerOfMatchId: match.player_of_match_id,
    notes: match.notes,
    lineup: lineup.map((row) => ({ playerId: row.player_id, isGoalkeeper: row.is_goalkeeper })),
    events: mapped,
  };
}
