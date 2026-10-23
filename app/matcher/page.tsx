import { Suspense } from "react";
import { EmptyState, Loading, PageTitle } from "@/components/ui";
import { formatDate, matchScoreLabel, resultOutcome } from "@/lib/format";
import { strings } from "@/lib/strings";
import { getPublicClient } from "@/lib/supabase";
import {
  fetchEvents,
  fetchLineups,
  fetchPlayers,
  fetchResults,
} from "@/lib/queries";
import type { MatchEvent } from "@/lib/types";

export default function MatchesPage() {
  return (
    <>
      <PageTitle>{strings.matches.title}</PageTitle>
      <Suspense fallback={<Loading />}>
        <MatchList />
      </Suspense>
    </>
  );
}

async function MatchList() {
  const client = getPublicClient();
  const [results, lineups, events, players] = await Promise.all([
    fetchResults(client),
    fetchLineups(client),
    fetchEvents(client),
    fetchPlayers(client),
  ]);

  if (results.length === 0) {
    return <EmptyState>{strings.common.noMatches}</EmptyState>;
  }

  const nameOf = new Map(players.map((player) => [player.id, player.name]));
  const name = (id: string | null) => (id ? nameOf.get(id) ?? "" : "");

  return (
    <ul className="space-y-3">
      {results.map((match) => {
        const outcome = resultOutcome(match.our_score, match.opponent_score);
        const matchLineup = lineups.filter((row) => row.match_id === match.match_id);
        const matchEvents = events.filter((event) => event.match_id === match.match_id);

        return (
          <li key={match.match_id}>
            <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-flyers-line">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-4 [&::-webkit-details-marker]:hidden">
                <span
                  aria-label={outcome.label}
                  title={outcome.label}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
                    outcome.tone === "win"
                      ? "bg-flyers-blue"
                      : outcome.tone === "draw"
                        ? "bg-flyers-muted"
                        : "bg-red-600"
                  }`}
                >
                  {outcome.short}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{match.opponent}</p>
                  <p className="text-xs text-flyers-muted">
                    {formatDate(match.played_at)} ·{" "}
                    {match.home_away === "home"
                      ? strings.results.homeLabel
                      : strings.results.awayLabel}
                  </p>
                </div>
                <span className="font-mono text-lg font-bold">
                  {matchScoreLabel(match)}
                </span>
                <span
                  aria-hidden
                  className="text-flyers-blue transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>

              <div className="space-y-4 border-t border-flyers-line p-4 text-sm">
                <section>
                  <h3 className="mb-1 font-semibold text-flyers-blue">
                    {strings.matches.lineup}
                  </h3>
                  {matchLineup.length === 0 ? (
                    <p className="text-flyers-muted">{strings.matches.noLineup}</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {matchLineup.map((row) => (
                        <li
                          key={row.player_id}
                          className="rounded-full bg-flyers-ice px-3 py-1"
                        >
                          {name(row.player_id)}
                          {row.is_goalkeeper && (
                            <span className="ml-1 text-xs text-flyers-muted">
                              ({strings.matches.goalkeeper})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {match.player_of_match_id && (
                  <p>
                    <span className="font-semibold text-flyers-blue">
                      {strings.matches.playerOfMatch}:
                    </span>{" "}
                    {name(match.player_of_match_id)}
                  </p>
                )}

                <section>
                  <h3 className="mb-1 font-semibold text-flyers-blue">
                    {strings.matches.timeline}
                  </h3>
                  {matchEvents.length === 0 ? (
                    <p className="text-flyers-muted">{strings.matches.noEvents}</p>
                  ) : (
                    <ol className="space-y-2">
                      {matchEvents.map((event) => (
                        <li key={event.id}>
                          <Event event={event} name={name} />
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

function Event({ event, name }: { event: MatchEvent; name: (id: string | null) => string }) {
  const when = [
    strings.matches.periodLabel(event.period),
    strings.matches.minuteLabel(event.minute),
  ]
    .filter(Boolean)
    .join(", ");

  if (event.type === "goal") {
    const assists = [event.assist1_player_id, event.assist2_player_id]
      .filter((id): id is string => Boolean(id))
      .map((id) => name(id));
    return (
      <div>
        <span className="text-xs text-flyers-muted">{when}</span>
        <p>
          <span className="font-semibold">{strings.matches.goal}:</span>{" "}
          {name(event.player_id)}
          {assists.length > 0 && (
            <span className="text-flyers-muted">
              {" "}
              ({strings.matches.assistShort.toLowerCase()}: {assists.join(", ")})
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="text-xs text-flyers-muted">{when}</span>
      <p>
        <span className="font-semibold">{strings.matches.penalty}:</span>{" "}
        {name(event.player_id)}{" "}
        <span className="text-flyers-muted">
          ({strings.matches.penaltyLabel(event.penalty_type ?? "", event.penalty_minutes ?? 0)})
        </span>
      </p>
    </div>
  );
}
