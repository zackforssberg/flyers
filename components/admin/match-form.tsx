"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveMatch } from "@/app/admin/actions";
import { strings } from "@/lib/strings";
import type {
  EventInput,
  HomeAway,
  LineupInput,
  MatchInput,
  PenaltyType,
  Player,
} from "@/lib/types";

const input =
  "w-full rounded-lg border border-flyers-line bg-white px-3 py-2 text-base text-flyers-ink focus:border-flyers-blue focus:outline-none";
const label = "mb-1 block text-sm font-medium text-flyers-ink";
const button =
  "rounded-lg bg-flyers-blue px-4 py-2 font-semibold text-white disabled:opacity-60";
const buttonGhost =
  "rounded-lg border border-flyers-blue px-4 py-2 font-semibold text-flyers-blue";

type Props = {
  adminPath: string;
  defaultDate: string;
  players: Player[];
  penaltyTypes: PenaltyType[];
  initial: MatchInput | null;
};

// Returns "" for blank, otherwise the number (NaN if not numeric; the server rejects it).
function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  return Number(value);
}

export function MatchForm({ adminPath, defaultDate, players, penaltyTypes, initial }: Props) {
  const router = useRouter();
  const [playedAt, setPlayedAt] = useState(initial?.playedAt ?? defaultDate);
  const [opponent, setOpponent] = useState(initial?.opponent ?? "");
  const [homeAway, setHomeAway] = useState<HomeAway>(initial?.homeAway ?? "home");
  const [opponentScore, setOpponentScore] = useState(String(initial?.opponentScore ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lineup, setLineup] = useState<LineupInput[]>(initial?.lineup ?? []);
  const [playerOfMatchId, setPlayerOfMatchId] = useState(initial?.playerOfMatchId ?? "");
  const [events, setEvents] = useState<EventInput[]>(initial?.events ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Goal draft
  const [goalPeriod, setGoalPeriod] = useState("1");
  const [goalMinute, setGoalMinute] = useState("");
  const [goalScorer, setGoalScorer] = useState("");
  const [goalAssist1, setGoalAssist1] = useState("");
  const [goalAssist2, setGoalAssist2] = useState("");

  // Penalty draft
  const [penaltyPeriod, setPenaltyPeriod] = useState("1");
  const [penaltyMinute, setPenaltyMinute] = useState("");
  const [penaltyPlayer, setPenaltyPlayer] = useState("");
  const [penaltyTypeName, setPenaltyTypeName] = useState(penaltyTypes[0]?.name ?? "");
  const [penaltyMinutes, setPenaltyMinutes] = useState(
    String(penaltyTypes[0]?.default_minutes ?? 2),
  );

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showPenaltyForm, setShowPenaltyForm] = useState(false);

  const nameOf = new Map(players.map((player) => [player.id, player.name]));
  const name = (id: string | null | undefined) => (id ? nameOf.get(id) ?? "" : "");

  const lineupIds = new Set(lineup.map((row) => row.playerId));
  const lineupPlayers = players
    .filter((player) => lineupIds.has(player.id))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  const ourScore = events.filter((event) => event.type === "goal").length;

  const sortedPlayers = [...players].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "sv"),
  );

  function toggleLineup(playerId: string) {
    if (lineupIds.has(playerId)) {
      setLineup(lineup.filter((row) => row.playerId !== playerId));
      if (playerOfMatchId === playerId) setPlayerOfMatchId("");
    } else {
      setLineup([...lineup, { playerId, isGoalkeeper: false }]);
    }
  }

  function toggleGoalkeeper(playerId: string) {
    setLineup(
      lineup.map((row) =>
        row.playerId === playerId ? { ...row, isGoalkeeper: !row.isGoalkeeper } : row,
      ),
    );
  }

  function addGoal() {
    const minute = parseNumber(goalMinute);
    if (Number.isNaN(minute)) return setError(strings.errors.minuteInvalid);
    if (!goalScorer) return setError(strings.errors.scorerRequired);
    if (goalAssist1 === goalScorer || goalAssist2 === goalScorer) {
      return setError(strings.errors.assistSameAsScorer);
    }
    if (goalAssist2 && !goalAssist1) return setError(strings.errors.assist2NeedsAssist1);
    if (goalAssist2 && goalAssist2 === goalAssist1) return setError(strings.errors.assistsSame);

    setEvents([
      ...events,
      {
        type: "goal",
        period: Number(goalPeriod),
        minute,
        playerId: goalScorer,
        assist1PlayerId: goalAssist1 || null,
        assist2PlayerId: goalAssist2 || null,
      },
    ]);
    setError(null);
    setGoalMinute("");
    setGoalScorer("");
    setGoalAssist1("");
    setGoalAssist2("");
  }

  function addPenalty() {
    const minute = parseNumber(penaltyMinute);
    if (Number.isNaN(minute)) return setError(strings.errors.minuteInvalid);
    if (!penaltyPlayer) return setError(strings.errors.playerNotInLineup);
    if (!penaltyTypeName) return setError(strings.errors.penaltyTypeRequired);
    const minutes = Number(penaltyMinutes);
    if (!Number.isInteger(minutes) || minutes < 0) {
      return setError(strings.errors.penaltyMinutesInvalid);
    }

    setEvents([
      ...events,
      {
        type: "penalty",
        period: Number(penaltyPeriod),
        minute,
        playerId: penaltyPlayer,
        penaltyType: penaltyTypeName,
        penaltyMinutes: minutes,
      },
    ]);
    setError(null);
    setPenaltyMinute("");
    setPenaltyPlayer("");
  }

  function describe(event: EventInput): string {
    const when = [
      strings.matches.periodLabel(event.period),
      event.minute === null ? null : strings.matches.minuteLabel(event.minute),
    ]
      .filter(Boolean)
      .join(", ");

    if (event.type === "goal") {
      const assists = [event.assist1PlayerId, event.assist2PlayerId]
        .filter((id): id is string => Boolean(id))
        .map((id) => name(id));
      return strings.admin.log.goalSummary(name(event.playerId), assists) + ` (${when})`;
    }
    return `${strings.matches.penalty}: ${name(event.playerId)}, ${strings.matches.penaltyLabel(
      event.penaltyType,
      event.penaltyMinutes,
    )} (${when})`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const result = await saveMatch({
      id: initial?.id ?? null,
      playedAt,
      opponent,
      homeAway,
      opponentScore: Number(opponentScore.trim() === "" ? NaN : opponentScore),
      playerOfMatchId: playerOfMatchId || null,
      notes: notes.trim() || null,
      lineup,
      events,
    });

    setSaving(false);
    if (result.ok) {
      router.push(`${adminPath}?tab=matches&saved=1`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-flyers-line">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="played_at" className={label}>{strings.admin.log.dateLabel}</label>
            <input
              id="played_at"
              type="date"
              required
              className={input}
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="home_away" className={label}>{strings.admin.log.homeAwayLabel}</label>
            <select
              id="home_away"
              className={input}
              value={homeAway}
              onChange={(e) => setHomeAway(e.target.value as HomeAway)}
            >
              <option value="home">{strings.admin.log.home}</option>
              <option value="away">{strings.admin.log.away}</option>
            </select>
          </div>
          <div>
            <label htmlFor="opponent" className={label}>{strings.admin.log.opponentLabel}</label>
            <input
              id="opponent"
              required
              className={input}
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="opponent_score" className={label}>
              {strings.admin.log.opponentScoreLabel}
            </label>
            <input
              id="opponent_score"
              type="number"
              inputMode="numeric"
              min={0}
              required
              className={input}
              value={opponentScore}
              onChange={(e) => setOpponentScore(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className={label}>{strings.admin.log.notesLabel}</label>
          <textarea
            id="notes"
            rows={2}
            className={input}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <p className="text-lg font-bold text-flyers-blue" aria-live="polite">
          {strings.admin.log.liveScore}: {strings.results.score(ourScore, Number(opponentScore) || 0)}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-flyers-line">
        <h2 className="mb-1 font-semibold text-flyers-blue">{strings.admin.log.lineupTitle}</h2>
        <p className="mb-3 text-xs text-flyers-muted">{strings.admin.log.lineupHelp}</p>
        {players.length === 0 ? (
          <p className="text-sm text-flyers-muted">{strings.admin.log.noActivePlayers}</p>
        ) : (
          <ul className="divide-y divide-flyers-line">
            {sortedPlayers.map((player) => {
              const selected = lineupIds.has(player.id);
              const row = lineup.find((entry) => entry.playerId === player.id);
              return (
                <li key={player.id} className="flex items-center gap-3 py-2">
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-flyers-blue"
                      checked={selected}
                      onChange={() => toggleLineup(player.id)}
                    />
                    <span className={player.active ? "" : "text-flyers-muted"}>
                      {player.name}
                      {!player.active && ` (${strings.admin.players.inactive.toLowerCase()})`}
                    </span>
                  </label>
                  {selected && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-flyers-blue"
                        checked={row?.isGoalkeeper ?? false}
                        onChange={() => toggleGoalkeeper(player.id)}
                      />
                      {strings.admin.log.goalkeeperLabel}
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-flyers-line">
        <h2 className="font-semibold text-flyers-blue">{strings.admin.log.eventsTitle}</h2>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={button}
            onClick={() => {
              setShowGoalForm(!showGoalForm);
              setShowPenaltyForm(false);
            }}
            disabled={lineupPlayers.length === 0}
          >
            {strings.admin.log.addGoal}
          </button>
          <button
            type="button"
            className={buttonGhost}
            onClick={() => {
              setShowPenaltyForm(!showPenaltyForm);
              setShowGoalForm(false);
            }}
            disabled={lineupPlayers.length === 0}
          >
            {strings.admin.log.addPenalty}
          </button>
        </div>

        {showGoalForm && (
          <div className="grid gap-3 rounded-xl bg-flyers-ice p-3 sm:grid-cols-3">
            <div>
              <label className={label}>{strings.admin.log.periodLabel}</label>
              <PeriodSelect value={goalPeriod} onChange={setGoalPeriod} />
            </div>
            <div>
              <label className={label}>{strings.admin.log.minuteLabel}</label>
              <input type="number" inputMode="numeric" min={0} max={99} className={input}
                value={goalMinute} onChange={(e) => setGoalMinute(e.target.value)} />
            </div>
            <div>
              <label className={label}>{strings.admin.log.scorerLabel}</label>
              <PlayerSelect players={lineupPlayers} value={goalScorer} onChange={setGoalScorer} />
            </div>
            <div>
              <label className={label}>{strings.admin.log.assist1Label}</label>
              <PlayerSelect players={lineupPlayers} value={goalAssist1} onChange={setGoalAssist1} optional />
            </div>
            <div>
              <label className={label}>{strings.admin.log.assist2Label}</label>
              <PlayerSelect players={lineupPlayers} value={goalAssist2} onChange={setGoalAssist2} optional />
            </div>
            <div className="flex items-end">
              <button type="button" className={`${button} w-full`} onClick={addGoal}>
                {strings.admin.log.addEvent}
              </button>
            </div>
          </div>
        )}

        {showPenaltyForm && (
          <div className="grid gap-3 rounded-xl bg-flyers-ice p-3 sm:grid-cols-3">
            <div>
              <label className={label}>{strings.admin.log.periodLabel}</label>
              <PeriodSelect value={penaltyPeriod} onChange={setPenaltyPeriod} />
            </div>
            <div>
              <label className={label}>{strings.admin.log.minuteLabel}</label>
              <input type="number" inputMode="numeric" min={0} max={99} className={input}
                value={penaltyMinute} onChange={(e) => setPenaltyMinute(e.target.value)} />
            </div>
            <div>
              <label className={label}>{strings.admin.log.playerLabel}</label>
              <PlayerSelect players={lineupPlayers} value={penaltyPlayer} onChange={setPenaltyPlayer} />
            </div>
            <div>
              <label className={label}>{strings.admin.log.penaltyTypeLabel}</label>
              <select
                className={input}
                value={penaltyTypeName}
                onChange={(e) => {
                  setPenaltyTypeName(e.target.value);
                  const type = penaltyTypes.find((t) => t.name === e.target.value);
                  if (type) setPenaltyMinutes(String(type.default_minutes));
                }}
              >
                {penaltyTypes.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>{strings.admin.log.penaltyMinutesLabel}</label>
              <input type="number" inputMode="numeric" min={0} className={input}
                value={penaltyMinutes} onChange={(e) => setPenaltyMinutes(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="button" className={`${button} w-full`} onClick={addPenalty}>
                {strings.admin.log.addEvent}
              </button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-flyers-muted">{strings.admin.log.noEvents}</p>
        ) : (
          <ol className="divide-y divide-flyers-line">
            {events.map((event, index) => (
              <li key={index} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span>{describe(event)}</span>
                <button
                  type="button"
                  className="shrink-0 text-red-700 underline"
                  onClick={() => setEvents(events.filter((_, i) => i !== index))}
                >
                  {strings.admin.log.removeEvent}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-flyers-line">
        <label htmlFor="motm" className={label}>{strings.admin.log.motmLabel}</label>
        <select
          id="motm"
          className={input}
          value={playerOfMatchId}
          onChange={(e) => setPlayerOfMatchId(e.target.value)}
        >
          <option value="">{strings.admin.log.motmNone}</option>
          {lineupPlayers.map((player) => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className={`${button} flex-1 py-3 text-lg`}>
          {saving ? strings.admin.log.saving : strings.admin.log.saveMatch}
        </button>
        {initial && (
          <a href={`${adminPath}?tab=log`} className={`${buttonGhost} py-3`}>
            {strings.admin.log.cancelEdit}
          </a>
        )}
      </div>
    </form>
  );
}

function PeriodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
      {[1, 2, 3, 4].map((period) => (
        <option key={period} value={period}>{strings.matches.periodLabel(period)}</option>
      ))}
    </select>
  );
}

function PlayerSelect({
  players,
  value,
  onChange,
  optional,
}: {
  players: Player[];
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{optional ? strings.admin.log.noAssist : "–"}</option>
      {players.map((player) => (
        <option key={player.id} value={player.id}>{player.name}</option>
      ))}
    </select>
  );
}
