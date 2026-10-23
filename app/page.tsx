import { Suspense } from "react";
import { Card, EmptyState, Loading } from "@/components/ui";
import { formatDate, matchScoreLabel, resultOutcome } from "@/lib/format";
import { strings } from "@/lib/strings";
import { getPublicClient } from "@/lib/supabase";
import {
  fetchDashboardSettings,
  fetchHotPlayers,
  fetchPlayerStats,
  fetchResults,
} from "@/lib/queries";

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const client = getPublicClient();
  const [settingRows, results, stats, hotPlayers] = await Promise.all([
    fetchDashboardSettings(client),
    fetchResults(client),
    fetchPlayerStats(client),
    fetchHotPlayers(client, 3),
  ]);

  const enabled = (key: string) =>
    settingRows.find((setting) => setting.key === key)?.enabled ?? true;

  const namesById = new Map(stats.map((stat) => [stat.player_id, stat.name]));

  const topScorers = stats
    .filter((stat) => stat.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "sv"))
    .slice(0, 3);

  const pointLeaders = stats
    .filter((stat) => stat.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points || b.goals - a.goals || a.name.localeCompare(b.name, "sv"),
    )
    .slice(0, 5);

  const assistLeaders = stats
    .filter((stat) => stat.assists > 0)
    .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name, "sv"))
    .slice(0, 5);

  const badBoys = stats
    .filter((stat) => stat.penalty_minutes > 0)
    .sort(
      (a, b) =>
        b.penalty_minutes - a.penalty_minutes || a.name.localeCompare(b.name, "sv"),
    )
    .slice(0, 3);

  const latestMotmMatch = results.find((result) => result.player_of_match_id);
  const motmName = latestMotmMatch?.player_of_match_id
    ? namesById.get(latestMotmMatch.player_of_match_id)
    : undefined;

  const widgets = [
    enabled("latest_results") && (
      <Card key="results" title={strings.home.latestResults} href="/matcher">
        {results.length === 0 ? (
          <EmptyState>{strings.home.noMatchesRecent}</EmptyState>
        ) : (
          <ul className="divide-y divide-flyers-line">
            {results.slice(0, 5).map((match) => {
              const outcome = resultOutcome(match.our_score, match.opponent_score);
              return (
                <li key={match.match_id} className="flex items-center gap-3 py-2 text-sm">
                  <span
                    title={outcome.label}
                    aria-label={outcome.label}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
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
                    <p className="truncate font-medium">{match.opponent}</p>
                    <p className="text-xs text-flyers-muted">
                      {formatDate(match.played_at)} ·{" "}
                      {match.home_away === "home"
                        ? strings.results.homeLabel
                        : strings.results.awayLabel}
                    </p>
                  </div>
                  <span className="font-mono font-semibold">{matchScoreLabel({
                    our_score: match.our_score,
                    opponent_score: match.opponent_score,
                  })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    ),

    enabled("top_scorer") && (
      <Card key="top_scorer" title={strings.home.topScorer} href="/poang?stat=goals">
        {topScorers.length === 0 ? (
          <EmptyState>{strings.home.noScorers}</EmptyState>
        ) : (
          <RankedList
            rows={topScorers.map((stat) => ({
              id: stat.player_id,
              name: stat.name,
              value: `${stat.goals} ${strings.common.goalsWord}`,
            }))}
          />
        )}
      </Card>
    ),

    enabled("points_league") && (
      <Card key="points" title={strings.home.points} href="/poang">
        {pointLeaders.length === 0 ? (
          <EmptyState>{strings.common.noData}</EmptyState>
        ) : (
          <RankedList
            rows={pointLeaders.map((stat) => ({
              id: stat.player_id,
              name: stat.name,
              value: strings.common.points(stat.points),
              detail: `${stat.goals}+${stat.assists}`,
            }))}
          />
        )}
      </Card>
    ),

    enabled("assists_league") && (
      <Card key="assists" title={strings.home.assists} href="/poang?stat=assists">
        {assistLeaders.length === 0 ? (
          <EmptyState>{strings.home.noAssists}</EmptyState>
        ) : (
          <RankedList
            rows={assistLeaders.map((stat) => ({
              id: stat.player_id,
              name: stat.name,
              value: `${stat.assists} ${strings.common.assistsWord}`,
            }))}
          />
        )}
      </Card>
    ),

    enabled("latest_motm") && (
      <Card key="motm" title={strings.home.motm} href="/matcher">
        {latestMotmMatch && motmName ? (
          <div>
            <p className="text-xl font-bold">{motmName}</p>
            <p className="text-sm text-flyers-muted">
              {strings.home.motmSubtitle(
                latestMotmMatch.opponent,
                formatDate(latestMotmMatch.played_at),
              )}
            </p>
          </div>
        ) : (
          <EmptyState>{strings.home.noMotm}</EmptyState>
        )}
      </Card>
    ),

    enabled("bad_boys") && (
      <Card key="bad_boys" title={strings.home.badBoys} href="/utvisningar">
        {badBoys.length === 0 ? (
          <EmptyState>{strings.home.noPenalties}</EmptyState>
        ) : (
          <RankedList
            rows={badBoys.map((stat) => ({
              id: stat.player_id,
              name: stat.name,
              value: strings.common.minutes(stat.penalty_minutes),
            }))}
          />
        )}
      </Card>
    ),

    enabled("hot_players") && (
      <Card
        key="hot"
        title={strings.home.hot}
        subtitle={strings.home.hotSubtitle}
        href="/poang"
      >
        {hotPlayers.length === 0 ? (
          <EmptyState>
            {results.length === 0 ? strings.home.noMatchesRecent : strings.home.hotEmpty}
          </EmptyState>
        ) : (
          <RankedList
            rows={hotPlayers.map((player) => ({
              id: player.player_id,
              name: player.name,
              value: strings.common.points(player.points),
              detail: strings.home.pointsDetail(player.goals, player.assists),
            }))}
          />
        )}
      </Card>
    ),
  ].filter(Boolean);

  if (widgets.length === 0) {
    return <EmptyState>{strings.home.widgetDisabled}</EmptyState>;
  }

  return <div className="grid gap-4 sm:grid-cols-2">{widgets}</div>;
}

function RankedList({
  rows,
}: {
  rows: { id: string; name: string; value: string; detail?: string }[];
}) {
  return (
    <ol className="space-y-1">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${
            index === 0 ? "bg-flyers-ice font-semibold" : ""
          }`}
        >
          <span className="w-5 text-center text-flyers-muted">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate">{row.name}</span>
          {row.detail && (
            <span className="text-xs text-flyers-muted">{row.detail}</span>
          )}
          <span className="font-mono">{row.value}</span>
        </li>
      ))}
    </ol>
  );
}
