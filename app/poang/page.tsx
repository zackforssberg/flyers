import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Loading, PageTitle } from "@/components/ui";
import { strings } from "@/lib/strings";
import { getPublicClient } from "@/lib/supabase";
import { fetchPlayerStats } from "@/lib/queries";
import type { PlayerStat } from "@/lib/types";

type Stat = "points" | "goals" | "assists";

const FILTERS: { key: Stat; label: string }[] = [
  { key: "points", label: strings.points.filterAll },
  { key: "goals", label: strings.points.filterGoals },
  { key: "assists", label: strings.points.filterAssists },
];

export default function PointsPage({
  searchParams,
}: {
  searchParams: Promise<{ stat?: string }>;
}) {
  return (
    <>
      <PageTitle>{strings.points.title}</PageTitle>
      <Suspense fallback={<Loading />}>
        <PointsTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PointsTable({
  searchParams,
}: {
  searchParams: Promise<{ stat?: string }>;
}) {
  const { stat: statParam } = await searchParams;
  const stat: Stat = FILTERS.some((filter) => filter.key === statParam)
    ? (statParam as Stat)
    : "points";

  const stats = await fetchPlayerStats(getPublicClient());
  const sorted = [...stats].sort(
    (a, b) =>
      b[stat] - a[stat] ||
      b.points - a.points ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name, "sv"),
  );

  const label = FILTERS.find((filter) => filter.key === stat)?.label ?? "";

  return (
    <>
      <nav aria-label={strings.points.title} className="mb-4">
        <ul className="inline-flex rounded-full bg-white p-1 text-sm font-medium shadow-sm ring-1 ring-flyers-line">
          {FILTERS.map((filter) => (
            <li key={filter.key}>
              <Link
                href={`/poang?stat=${filter.key}`}
                aria-current={filter.key === stat ? "page" : undefined}
                className={`block rounded-full px-4 py-2 transition-colors ${
                  filter.key === stat
                    ? "bg-flyers-blue text-white"
                    : "text-flyers-blue hover:bg-flyers-ice"
                }`}
              >
                {filter.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {stats.length === 0 ? (
        <EmptyState>{strings.common.noPlayers}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-flyers-line">
          <p className="px-4 pt-3 text-xs text-flyers-muted">
            {strings.points.sortedBy(label)}
          </p>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-flyers-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{strings.common.player}</th>
                <Th>{strings.common.games}</Th>
                <Th active={stat === "goals"}>{strings.common.goals}</Th>
                <Th active={stat === "assists"}>{strings.common.assists}</Th>
                <Th active={stat === "points"}>{strings.common.pointsColumn}</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, index) => (
                <Row key={player.player_id} player={player} rank={index + 1} stat={stat} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Th({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <th
      className={`px-2 py-2 text-right font-medium ${active ? "text-flyers-blue" : ""}`}
    >
      {children}
    </th>
  );
}

function Row({ player, rank, stat }: { player: PlayerStat; rank: number; stat: Stat }) {
  const cell = (key: Stat, value: number) => (
    <td
      className={`px-2 py-2 text-right font-mono ${
        stat === key ? "font-semibold text-flyers-blue" : ""
      }`}
    >
      {value}
    </td>
  );

  return (
    <tr className="border-t border-flyers-line">
      <td className="px-4 py-2">
        <span className="mr-2 text-flyers-muted">{rank}.</span>
        <span className={player.active ? "" : "text-flyers-muted"}>{player.name}</span>
      </td>
      <td className="px-2 py-2 text-right font-mono">{player.games_played}</td>
      {cell("goals", player.goals)}
      {cell("assists", player.assists)}
      {cell("points", player.points)}
    </tr>
  );
}
