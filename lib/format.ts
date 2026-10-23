import { strings } from "@/lib/strings";
import type { MatchResult } from "@/lib/types";

// Formats a "YYYY-MM-DD" date string as e.g. "12 okt 2026".
// Parsed by hand so the server's time zone can never shift the day.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${strings.months[month - 1]} ${year}`;
}

export function resultOutcome(ourScore: number, theirScore: number) {
  if (ourScore > theirScore) {
    return { short: strings.results.winShort, label: strings.results.win, tone: "win" as const };
  }
  if (ourScore < theirScore) {
    return { short: strings.results.lossShort, label: strings.results.loss, tone: "loss" as const };
  }
  return { short: strings.results.drawShort, label: strings.results.draw, tone: "draw" as const };
}

export function matchScoreLabel(match: Pick<MatchResult, "our_score" | "opponent_score">) {
  return strings.results.score(match.our_score, match.opponent_score);
}
