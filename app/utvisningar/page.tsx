import { Suspense } from "react";
import { EmptyState, Loading, PageTitle } from "@/components/ui";
import { strings } from "@/lib/strings";
import { getPublicClient } from "@/lib/supabase";
import { fetchEvents, fetchPlayerStats } from "@/lib/queries";

export default function PenaltiesPage() {
  return (
    <>
      <PageTitle>{strings.penalties.title}</PageTitle>
      <p className="mb-4 text-sm text-flyers-muted">{strings.penalties.subtitle}</p>
      <Suspense fallback={<Loading />}>
        <PenaltyTable />
      </Suspense>
    </>
  );
}

async function PenaltyTable() {
  const client = getPublicClient();
  const [stats, events] = await Promise.all([fetchPlayerStats(client), fetchEvents(client)]);

  // Most common penalty type per player, from their penalty events.
  const typeCounts = new Map<string, Map<string, number>>();
  for (const event of events) {
    if (event.type !== "penalty" || !event.penalty_type) continue;
    const counts = typeCounts.get(event.player_id) ?? new Map<string, number>();
    counts.set(event.penalty_type, (counts.get(event.penalty_type) ?? 0) + 1);
    typeCounts.set(event.player_id, counts);
  }

  const favourite = (playerId: string): string => {
    const counts = typeCounts.get(playerId);
    if (!counts) return "";
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  const rows = [...stats].sort(
    (a, b) =>
      b.penalty_minutes - a.penalty_minutes ||
      b.penalty_count - a.penalty_count ||
      a.name.localeCompare(b.name, "sv"),
  );

  if (rows.length === 0) {
    return <EmptyState>{strings.common.noPlayers}</EmptyState>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-flyers-line">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-flyers-muted">
          <tr>
            <th className="px-4 py-2 font-medium">{strings.penalties.columnPlayer}</th>
            <th className="px-2 py-2 text-right font-medium">{strings.common.penaltyCountColumn}</th>
            <th className="px-2 py-2 text-right font-medium">{strings.common.penaltyMinutesColumn}</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">{strings.penalties.favourite}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player, index) => (
            <tr key={player.player_id} className="border-t border-flyers-line">
              <td className="px-4 py-2">
                <span className="mr-2 text-flyers-muted">{index + 1}.</span>
                <span className={player.active ? "" : "text-flyers-muted"}>{player.name}</span>
                <span className="block text-xs text-flyers-muted sm:hidden">
                  {favourite(player.player_id)}
                </span>
              </td>
              <td className="px-2 py-2 text-right font-mono">{player.penalty_count}</td>
              <td className="px-2 py-2 text-right font-mono font-semibold">
                {player.penalty_minutes}
              </td>
              <td className="hidden px-4 py-2 text-flyers-muted sm:table-cell">
                {favourite(player.player_id)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
