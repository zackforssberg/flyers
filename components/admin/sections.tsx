import type { ReactNode } from "react";
import { deleteMatch, login, saveDashboardSettings, savePenaltyType, savePlayer } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import type { DashboardSetting, MatchRow, PenaltyType, Player } from "@/lib/types";

const input =
  "w-full rounded-lg border border-flyers-line bg-white px-3 py-2 text-base text-flyers-ink focus:border-flyers-blue focus:outline-none";
const label = "mb-1 block text-sm font-medium";
const button =
  "rounded-lg bg-flyers-blue px-4 py-2 font-semibold text-white";
const card = "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-flyers-line";

export function Notice({ kind, children }: { kind: "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`mb-4 rounded-lg p-3 text-sm ring-1 ${
        kind === "error"
          ? "bg-red-50 text-red-800 ring-red-200"
          : "bg-green-50 text-green-800 ring-green-200"
      }`}
    >
      {children}
    </p>
  );
}

export function LoginSection({ error }: { error?: string }) {
  return (
    <section className={`${card} mx-auto max-w-sm`}>
      <h2 className="mb-4 text-lg font-semibold text-flyers-blue">{strings.admin.loginTitle}</h2>
      {error && <Notice kind="error">{error}</Notice>}
      <form action={login} className="space-y-3">
        <div>
          <label htmlFor="password" className={label}>{strings.admin.passwordLabel}</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
        </div>
        <button type="submit" className={`${button} w-full py-3`}>
          {strings.admin.loginButton}
        </button>
      </form>
    </section>
  );
}

export function SettingsSection({ settings }: { settings: DashboardSetting[] }) {
  const enabled = (key: string) => settings.find((s) => s.key === key)?.enabled ?? true;

  return (
    <section className={card}>
      <h2 className="mb-1 font-semibold text-flyers-blue">{strings.admin.tabs.settings}</h2>
      <p className="mb-4 text-sm text-flyers-muted">{strings.admin.settingsHelp}</p>
      <form action={saveDashboardSettings} className="space-y-3">
        {Object.entries(strings.admin.widgetLabels).map(([key, text]) => (
          <label key={key} className="flex items-center justify-between gap-3 py-1">
            <span>{text}</span>
            <input
              type="checkbox"
              name={key}
              defaultChecked={enabled(key)}
              className="h-6 w-6 accent-flyers-blue"
            />
          </label>
        ))}
        <button type="submit" className={button}>{strings.admin.saveButton}</button>
      </form>
    </section>
  );
}

export function PlayersSection({ players }: { players: Player[] }) {
  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="mb-3 font-semibold text-flyers-blue">{strings.admin.players.add}</h2>
        <PlayerForm />
      </section>

      {players.length === 0 ? (
        <EmptyState>{strings.common.noPlayers}</EmptyState>
      ) : (
        players.map((player) => (
          <section key={player.id} className={card}>
            <PlayerForm player={player} />
          </section>
        ))
      )}
    </div>
  );
}

function PlayerForm({ player }: { player?: Player }) {
  return (
    <form action={savePlayer} className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto_auto]">
      {player && <input type="hidden" name="id" value={player.id} />}
      <div>
        <label className={label}>{strings.admin.players.nameLabel}</label>
        <input name="name" required defaultValue={player?.name ?? ""} className={input} />
      </div>
      <div>
        <label className={label}>{strings.admin.players.jerseyLabel}</label>
        <input
          name="jersey_number"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          defaultValue={player?.jersey_number ?? ""}
          className={input}
        />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={player?.active ?? true} className="h-5 w-5 accent-flyers-blue" />
        {strings.admin.players.activeLabel}
      </label>
      <button type="submit" className={button}>
        {player ? strings.admin.saveButton : strings.admin.players.save}
      </button>
    </form>
  );
}

export function PenaltyTypesSection({ penaltyTypes }: { penaltyTypes: PenaltyType[] }) {
  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="mb-3 font-semibold text-flyers-blue">{strings.admin.penalties.add}</h2>
        <PenaltyTypeForm />
      </section>
      {penaltyTypes.map((type) => (
        <section key={type.id} className={card}>
          <PenaltyTypeForm type={type} />
        </section>
      ))}
    </div>
  );
}

function PenaltyTypeForm({ type }: { type?: PenaltyType }) {
  return (
    <form action={savePenaltyType} className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto]">
      {type && <input type="hidden" name="id" value={type.id} />}
      <div>
        <label className={label}>{strings.admin.penalties.nameLabel}</label>
        <input name="name" required defaultValue={type?.name ?? ""} className={input} />
      </div>
      <div>
        <label className={label}>{strings.admin.penalties.minutesLabel}</label>
        <input
          name="default_minutes"
          type="number"
          inputMode="numeric"
          min={0}
          required
          defaultValue={type?.default_minutes ?? 2}
          className={input}
        />
      </div>
      <button type="submit" className={button}>
        {type ? strings.admin.saveButton : strings.admin.penalties.save}
      </button>
    </form>
  );
}

export function MatchesSection({
  matches,
  adminPath,
  scores,
}: {
  matches: MatchRow[];
  adminPath: string;
  scores: Record<string, number>;
}) {
  if (matches.length === 0) {
    return <EmptyState>{strings.admin.matches.empty}</EmptyState>;
  }

  return (
    <ul className="space-y-3">
      {matches.map((match) => {
        const date = formatDate(match.played_at);
        return (
          <li key={match.id} className={`${card} flex flex-wrap items-center gap-3`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{match.opponent}</p>
              <p className="text-xs text-flyers-muted">
                {date} ·{" "}
                {match.home_away === "home" ? strings.results.homeLabel : strings.results.awayLabel} ·{" "}
                <span className="font-mono">
                  {scores[match.id] ?? 0}–{match.opponent_score}
                </span>
              </p>
            </div>
            <a
              href={`${adminPath}?tab=log&match=${match.id}`}
              className="rounded-lg border border-flyers-blue px-3 py-2 text-sm font-semibold text-flyers-blue"
            >
              {strings.admin.matches.edit}
            </a>
            <form action={deleteMatch}>
              <input type="hidden" name="id" value={match.id} />
              <ConfirmSubmit
                message={strings.admin.matches.deleteConfirm(match.opponent, date)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 underline"
              >
                {strings.admin.matches.delete}
              </ConfirmSubmit>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
