/**
 * Driver ranking (SPEC.md section 2, step 3).
 *
 * Order depends only on offer terms and the driver's own answers/assumptions
 * (CLAUDE.md rule 5). Paid promotion is never an input here.
 *
 * Mode A (minimum monthly target X given): hours needed per offer, compared with
 * available hours H. Offers that fit in H come first, then ascending by hours.
 * Mode B ("I don't know"): monthly earnings at H hours, descending.
 * Offers that never pay off come after that, incomplete offers last.
 */
import {
  earningsForHours,
  hoursForTarget,
  type Assumptions,
  type CalcResult,
  type City,
  type Offer,
} from "./calc";
import { filterOffers, type CarChoice, type LoadedOffer, type Partner } from "./data";

export const PRIORITIES = ["multiApp", "noDeposit", "fastPayout", "language", "noIdleFee"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Answers from the interview. Kept only in page state, never stored. */
export interface DriverAnswers {
  city: City;
  /** Available hours per week, H. */
  hours: number;
  /** Minimum monthly earnings X; null = "I don't know" (mode B). */
  target: number | null;
  car: CarChoice;
  /** Any number. "multiApp" is a hard filter, the rest are marks and tie-breakers. */
  priorities: Priority[];
}

export type MarkStatus = "yes" | "no" | "unknown";

export interface PriorityMark {
  priority: Priority;
  status: MarkStatus;
}

export type RankGroup = "ranked" | "neverProfitable" | "needsHourlyInput" | "incomplete";

export interface RankedOffer {
  offer: Offer;
  partner: Partner | undefined;
  result: CalcResult;
  group: RankGroup;
  /** Mode A only: whether the needed hours fit in H. */
  fitsHours: boolean | null;
  /** Mode A only: hours above H (0 when it fits). */
  extraHours: number | null;
  /**
   * Money at the driver's available hours H (mode B calculation), shown on every card
   * so the driver always sees earnings in PLN. Null when the offer cannot be calculated.
   */
  earningsAtHours: CalcResult | null;
  marks: PriorityMark[];
}

export interface RankingResult {
  mode: "A" | "B";
  items: RankedOffer[];
  /** Number of offers matching the filters (before ranking). 0 = nothing matches. */
  matchCount: number;
}

// ---------------------------------------------------------------------------
// Priority marks
// ---------------------------------------------------------------------------

/** How an offer meets one priority. "unknown" when the source does not say. */
export function priorityStatus(offer: Offer, priority: Priority): MarkStatus {
  switch (priority) {
    case "multiApp":
      return offer.appsIncluded.length >= 2 ? "yes" : "no";
    case "noDeposit":
      if (offer.deposit === null || offer.deposit === undefined) return "unknown";
      return offer.deposit === 0 ? "yes" : "no";
    case "fastPayout":
      // Only daily payouts count as fast; anything else is not known to be fast.
      return offer.payoutFrequency === "daily" ? "yes" : "unknown";
    case "language": {
      const langs = offer.languages ?? [];
      if (langs.length === 0) return "unknown";
      return langs.some((l) => l === "uk" || l === "en") ? "yes" : "no";
    }
    case "noIdleFee":
      if (offer.noFeeIdleWeek === null || offer.noFeeIdleWeek === undefined) return "unknown";
      return offer.noFeeIdleWeek ? "yes" : "no";
  }
}

function priorityScore(marks: PriorityMark[]): number {
  return marks.filter((m) => m.status === "yes").length;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

function groupOf(result: CalcResult): RankGroup {
  if (result.flags.incomplete) return "incomplete";
  if (result.flags.needsHourlyInput) return "needsHourlyInput";
  if (result.flags.neverProfitable) return "neverProfitable";
  return "ranked";
}

const GROUP_ORDER: Record<RankGroup, number> = {
  ranked: 0,
  neverProfitable: 1,
  needsHourlyInput: 2,
  incomplete: 3,
};

/** Rounded value used for ordering, so that tiny differences count as a tie. */
function sortKey(item: RankedOffer, mode: "A" | "B"): number {
  if (mode === "A") return Math.round((item.result.weeklyHours ?? Infinity) * 10) / 10;
  // Mode B: higher earnings first, ties within 10 PLN.
  return -Math.round((item.result.monthlyEarnings ?? -Infinity) / 10);
}

export function compareRanked(a: RankedOffer, b: RankedOffer, mode: "A" | "B"): number {
  if (a.group !== b.group) return GROUP_ORDER[a.group] - GROUP_ORDER[b.group];
  if (a.group === "ranked") {
    if (mode === "A" && a.fitsHours !== b.fitsHours) return a.fitsHours ? -1 : 1;
    const diff = sortKey(a, mode) - sortKey(b, mode);
    if (diff !== 0) return diff;
  }
  // Tie: the driver's priorities decide, then a stable order by id.
  const score = priorityScore(b.marks) - priorityScore(a.marks);
  if (score !== 0) return score;
  return a.offer.id.localeCompare(b.offer.id);
}

export function rankOffers(
  offers: LoadedOffer[],
  partners: Partner[],
  answers: DriverAnswers,
  assumptions: Assumptions,
): RankingResult {
  const mode: "A" | "B" = answers.target === null ? "B" : "A";
  const matching = filterOffers(offers, {
    city: answers.city,
    car: answers.car,
    multiApp: answers.priorities.includes("multiApp"),
  });

  const items: RankedOffer[] = matching.map(({ offer }) => {
    const result =
      mode === "A"
        ? hoursForTarget(offer, assumptions, answers.target as number)
        : earningsForHours(offer, assumptions, answers.hours);
    const group = groupOf(result);
    let fitsHours: boolean | null = null;
    let extraHours: number | null = null;
    if (mode === "A" && group === "ranked" && result.weeklyHours !== null) {
      // Compare at the displayed precision (0.1 h).
      const needed = Math.round(result.weeklyHours * 10) / 10;
      fitsHours = needed <= answers.hours;
      extraHours = fitsHours ? 0 : Math.round((needed - answers.hours) * 10) / 10;
    }
    const earningsAtHours =
      group === "incomplete" || group === "needsHourlyInput"
        ? null
        : mode === "B"
          ? result
          : earningsForHours(offer, assumptions, answers.hours);
    return {
      offer,
      partner: partners.find((p) => p.id === offer.partnerId),
      result,
      group,
      fitsHours,
      extraHours,
      earningsAtHours,
      marks: answers.priorities.map((priority) => ({ priority, status: priorityStatus(offer, priority) })),
    };
  });

  items.sort((a, b) => compareRanked(a, b, mode));
  return { mode, items, matchCount: matching.length };
}

// ---------------------------------------------------------------------------
// Empty result: which filter to loosen
// ---------------------------------------------------------------------------

export type Relaxation = "car" | "multiApp" | "carAndMultiApp";

export interface RelaxationSuggestion {
  relax: Relaxation;
  /** Number of offers that would match. */
  count: number;
  /** Answers with the filter loosened, ready to apply. */
  answers: DriverAnswers;
}

/**
 * When nothing matches, finds which filter to loosen. The city is never changed.
 * Returns suggestions that bring back at least one offer, best first
 * (single changes before both, then by number of offers).
 */
export function suggestRelaxations(offers: LoadedOffer[], answers: DriverAnswers): RelaxationSuggestion[] {
  const withoutMultiApp = answers.priorities.filter((p) => p !== "multiApp");
  const candidates: Array<{ relax: Relaxation; answers: DriverAnswers }> = [];
  const hasCar = answers.car !== "any";
  const hasMultiApp = answers.priorities.includes("multiApp");

  if (hasCar) candidates.push({ relax: "car", answers: { ...answers, car: "any" } });
  if (hasMultiApp) candidates.push({ relax: "multiApp", answers: { ...answers, priorities: withoutMultiApp } });
  if (hasCar && hasMultiApp) {
    candidates.push({ relax: "carAndMultiApp", answers: { ...answers, car: "any", priorities: withoutMultiApp } });
  }

  const order: Record<Relaxation, number> = { car: 0, multiApp: 0, carAndMultiApp: 1 };
  return candidates
    .map((c) => ({
      ...c,
      count: filterOffers(offers, {
        city: c.answers.city,
        car: c.answers.car,
        multiApp: c.answers.priorities.includes("multiApp"),
      }).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => order[a.relax] - order[b.relax] || b.count - a.count);
}
