import type { MatchInput, PenaltyType, Player } from "@/lib/types";
import type { strings } from "@/lib/strings";

// Returns the key of the Swedish error message to show, or null when valid.
export type ErrorKey = keyof typeof strings.errors;

export function validateMatchInput(
  input: MatchInput,
  players: Player[],
  penaltyTypes: PenaltyType[],
): ErrorKey | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.playedAt) || Number.isNaN(Date.parse(input.playedAt))) {
    return "dateInvalid";
  }
  if (input.opponent.trim() === "") return "opponentRequired";
  if (input.homeAway !== "home" && input.homeAway !== "away") return "homeAwayInvalid";
  if (!Number.isInteger(input.opponentScore) || input.opponentScore < 0) {
    return "opponentScoreInvalid";
  }

  if (input.lineup.length === 0) return "lineupRequired";

  const knownPlayerIds = new Set(players.map((player) => player.id));
  const lineupIds = new Set(input.lineup.map((row) => row.playerId));
  if (lineupIds.size !== input.lineup.length) return "lineupDuplicate";
  if (input.lineup.some((row) => !knownPlayerIds.has(row.playerId))) return "playerUnknown";

  if (input.playerOfMatchId && !lineupIds.has(input.playerOfMatchId)) {
    return "motmNotInLineup";
  }

  const penaltyTypeNames = new Set(penaltyTypes.map((type) => type.name));

  for (const event of input.events) {
    if (!Number.isInteger(event.period) || event.period < 1 || event.period > 4) {
      return "periodInvalid";
    }
    if (event.minute !== null && (!Number.isInteger(event.minute) || event.minute < 0 || event.minute > 99)) {
      return "minuteInvalid";
    }
    if (!lineupIds.has(event.playerId)) return "playerNotInLineup";

    if (event.type === "goal") {
      const { assist1PlayerId, assist2PlayerId } = event;
      if (assist1PlayerId === event.playerId || assist2PlayerId === event.playerId) {
        return "assistSameAsScorer";
      }
      if (assist2PlayerId && !assist1PlayerId) return "assist2NeedsAssist1";
      if (assist2PlayerId && assist2PlayerId === assist1PlayerId) return "assistsSame";
      if (assist1PlayerId && !lineupIds.has(assist1PlayerId)) return "playerNotInLineup";
      if (assist2PlayerId && !lineupIds.has(assist2PlayerId)) return "playerNotInLineup";
    } else if (event.type === "penalty") {
      if (event.penaltyType.trim() === "") return "penaltyTypeRequired";
      if (!penaltyTypeNames.has(event.penaltyType)) return "penaltyTypeUnknown";
      if (!Number.isInteger(event.penaltyMinutes) || event.penaltyMinutes < 0) {
        return "penaltyMinutesInvalid";
      }
    } else {
      return "saveFailed";
    }
  }

  return null;
}
