/**
 * Earnings calculations for FleetPlace (SPEC.md, sections 4 and 5).
 *
 * Mode B (time -> earnings): weekly hours -> monthly earnings.
 * Mode A (target -> time):   monthly earnings target -> weekly hours.
 *
 * "Earnings" follows SPEC.md section 2a: turnover minus app commission, partner fees,
 * car rental and fuel. Income tax and social security are NOT deducted. Tips and bonuses
 * are NOT included. VAT is not applied yet (open decision, see SPEC.md section 9).
 *
 * All percentages are fractions (0.25 = 25%). All money amounts are in PLN.
 */

// ---------------------------------------------------------------------------
// Data model (SPEC.md section 5)
// ---------------------------------------------------------------------------

export type City = "warszawa" | "krakow" | "trojmiasto";

/** typ_rozliczenia: fixed weekly fee / percentage / both / revenue split. */
export type SettlementType = "fixed" | "percent" | "mixed" | "split";

/** podstawa_naliczania: partner percentage taken from turnover or from turnover after app commission. */
export type FeeBase = "turnover" | "afterAppCommission";

/** vat_od: whether fees are quoted net or gross. Stored, not yet used in calculations. */
export type VatBasis = "net" | "gross";

/** typ_auta: driver's own car or a car rented from the partner. */
export type CarType = "own" | "rental";

export type PayoutFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface Offer {
  id: string;
  partnerId: string;
  city: City;
  settlementType: SettlementType;
  /** opłata_stała_tyg: fixed weekly fee (PLN). */
  weeklyFee?: number | null;
  /** procent: partner percentage (fraction). */
  percent?: number | null;
  /** podstawa_naliczania */
  feeBase?: FeeBase | null;
  /** vat_od */
  vatBasis?: VatBasis | null;
  /** udział_kierowcy: driver's share in the split model (fraction, e.g. 0.5). */
  driverShare?: number | null;
  /** wynajem_tyg: weekly car rental (PLN). */
  weeklyRent?: number | null;
  /** typ_auta */
  carType: CarType;
  /** paliwo_w_cenie: true when the partner pays for fuel. */
  fuelIncluded: boolean;
  /** kaucja: deposit (PLN). */
  deposit?: number | null;
  /** częstotliwość_wypłat */
  payoutFrequency?: PayoutFrequency | null;
  /** języki */
  languages?: string[];
  /** źródło_url: public source of the offer terms. */
  sourceUrl: string;
  /** data_weryfikacji: ISO date of the last verification. */
  verifiedAt: string;
  /** uwagi */
  notes?: string | null;
}

export interface Assumptions {
  city: City;
  /** obrót_na_godz_domyślny: turnover per hour (PLN), "h" in SPEC section 4. */
  hourlyTurnover: number;
  /** paliwo_proc_domyślne: fuel cost as a fraction of turnover, "f". */
  fuelPercent: number;
  /** prowizja_aplikacji: app commission as a fraction of turnover, "c". */
  appCommission: number;
  sourceUrl: string;
  /** ISO date */
  date: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Weeks per month: 52 weeks / 12 months (about 4.33). */
export const WEEKS_PER_MONTH = 52 / 12;

/** Results above this many hours per week are flagged as unrealistic. */
export const UNREALISTIC_HOURS_PER_WEEK = 60;

/**
 * Tolerance for "denominator <= 0". Floating-point arithmetic can turn an exact zero
 * (e.g. 1 - 0.25 - 0.6 - 0.15) into a tiny positive number, which would otherwise
 * produce an absurd result instead of the "never pays off" flag.
 */
const MARGIN_EPSILON = 1e-9;

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/** Weekly cost breakdown (PLN per week). */
export interface WeeklyBreakdown {
  turnover: number;
  appCommission: number;
  partnerPercentFee: number;
  partnerFixedFee: number;
  /** Partner's part of the split (split model only). */
  partnerSplitShare: number;
  rent: number;
  fuel: number;
  earnings: number;
}

export interface CalcFlags {
  /** More than 60 hours per week ("nierealne"). */
  unrealistic: boolean;
  /** Denominator <= 0: the offer never pays off ("nigdy się nie opłaca"). */
  neverProfitable: boolean;
  /** Required offer data is missing ("niepełna"). */
  incomplete: boolean;
}

export interface CalcResult {
  mode: "A" | "B";
  offerId: string;
  /** Weekly hours: input in mode B, result in mode A. Null if it cannot be computed. */
  weeklyHours: number | null;
  /** Monthly earnings before tax: result in mode B, the target in mode A. */
  monthlyEarnings: number | null;
  weekly: WeeklyBreakdown | null;
  flags: CalcFlags;
  /** Names of missing offer fields when the offer is incomplete. */
  missingFields: string[];
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Resolved offer parameters using the symbols from SPEC section 4. */
interface Params {
  model: "fees" | "split";
  c: number;
  p: number;
  b: number;
  F: number;
  R: number;
  f: number;
  s: number;
  h: number;
}

function isMissing(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

/** Lists offer fields that the calculation needs but that are missing. */
export function findMissingFields(offer: Offer): string[] {
  const missing: string[] = [];
  const needsFixed = offer.settlementType === "fixed" || offer.settlementType === "mixed";
  const needsPercent = offer.settlementType === "percent" || offer.settlementType === "mixed";

  if (needsFixed && isMissing(offer.weeklyFee)) missing.push("weeklyFee");
  if (needsPercent && isMissing(offer.percent)) missing.push("percent");
  if (needsPercent && !offer.feeBase) missing.push("feeBase");
  if (offer.settlementType === "split" && isMissing(offer.driverShare)) missing.push("driverShare");
  if (offer.settlementType !== "split" && offer.carType === "rental" && isMissing(offer.weeklyRent)) {
    missing.push("weeklyRent");
  }
  return missing;
}

function assertValidAssumptions(a: Assumptions): void {
  if (!(a.hourlyTurnover > 0)) throw new RangeError("hourlyTurnover must be greater than 0");
  if (a.fuelPercent < 0 || a.fuelPercent >= 1) throw new RangeError("fuelPercent must be in [0, 1)");
  if (a.appCommission < 0 || a.appCommission >= 1) throw new RangeError("appCommission must be in [0, 1)");
}

function resolveParams(offer: Offer, a: Assumptions): Params {
  const c = a.appCommission;
  const f = offer.fuelIncluded ? 0 : a.fuelPercent;
  const h = a.hourlyTurnover;

  if (offer.settlementType === "split") {
    return { model: "split", c, p: 0, b: 1, F: 0, R: 0, f, s: offer.driverShare ?? 0, h };
  }

  const usesPercent = offer.settlementType === "percent" || offer.settlementType === "mixed";
  const usesFixed = offer.settlementType === "fixed" || offer.settlementType === "mixed";
  return {
    model: "fees",
    c,
    p: usesPercent ? (offer.percent ?? 0) : 0,
    b: offer.feeBase === "afterAppCommission" ? 1 - c : 1,
    F: usesFixed ? (offer.weeklyFee ?? 0) : 0,
    R: offer.carType === "rental" ? (offer.weeklyRent ?? 0) : 0,
    f,
    s: 1,
    h,
  };
}

/**
 * Share of each extra złoty of turnover that the driver keeps.
 * Fees model: 1 − c − p·b − f. Split model: (1 − c)·s − f.
 * This is the denominator of the mode A formula; <= 0 means the offer never pays off.
 */
function marginRate(x: Params): number {
  return x.model === "fees" ? 1 - x.c - x.p * x.b - x.f : (1 - x.c) * x.s - x.f;
}

/** Fixed weekly costs that do not depend on turnover: F + R (fees model only). */
function fixedWeeklyCosts(x: Params): number {
  return x.model === "fees" ? x.F + x.R : 0;
}

function weeklyBreakdown(turnover: number, x: Params): WeeklyBreakdown {
  const O = turnover;
  const appCommission = O * x.c;
  const fuel = O * x.f;
  if (x.model === "split") {
    const partnerSplitShare = O * (1 - x.c) * (1 - x.s);
    return {
      turnover: O,
      appCommission,
      partnerPercentFee: 0,
      partnerFixedFee: 0,
      partnerSplitShare,
      rent: 0,
      fuel,
      earnings: O * (1 - x.c) * x.s - fuel,
    };
  }
  const partnerPercentFee = O * x.p * x.b;
  return {
    turnover: O,
    appCommission,
    partnerPercentFee,
    partnerFixedFee: x.F,
    partnerSplitShare: 0,
    rent: x.R,
    fuel,
    earnings: O - appCommission - partnerPercentFee - fuel - x.F - x.R,
  };
}

function incompleteResult(mode: "A" | "B", offer: Offer, missing: string[], hours: number | null, monthly: number | null): CalcResult {
  return {
    mode,
    offerId: offer.id,
    weeklyHours: hours,
    monthlyEarnings: monthly,
    weekly: null,
    flags: { unrealistic: false, neverProfitable: false, incomplete: true },
    missingFields: missing,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Mode B: weekly hours -> monthly earnings (before tax). */
export function earningsForHours(offer: Offer, assumptions: Assumptions, weeklyHours: number): CalcResult {
  assertValidAssumptions(assumptions);
  if (!(weeklyHours >= 0)) throw new RangeError("weeklyHours must be 0 or more");

  const missing = findMissingFields(offer);
  if (missing.length > 0) return incompleteResult("B", offer, missing, weeklyHours, null);

  const x = resolveParams(offer, assumptions);
  const weekly = weeklyBreakdown(weeklyHours * x.h, x);
  return {
    mode: "B",
    offerId: offer.id,
    weeklyHours,
    monthlyEarnings: weekly.earnings * WEEKS_PER_MONTH,
    weekly,
    flags: {
      unrealistic: weeklyHours > UNREALISTIC_HOURS_PER_WEEK,
      neverProfitable: marginRate(x) <= MARGIN_EPSILON,
      incomplete: false,
    },
    missingFields: [],
  };
}

/** Mode A: monthly earnings target (before tax) -> weekly hours needed. */
export function hoursForTarget(offer: Offer, assumptions: Assumptions, monthlyTarget: number): CalcResult {
  assertValidAssumptions(assumptions);
  if (!(monthlyTarget >= 0)) throw new RangeError("monthlyTarget must be 0 or more");

  const missing = findMissingFields(offer);
  if (missing.length > 0) return incompleteResult("A", offer, missing, null, monthlyTarget);

  const x = resolveParams(offer, assumptions);
  const denominator = marginRate(x);
  if (denominator <= MARGIN_EPSILON) {
    return {
      mode: "A",
      offerId: offer.id,
      weeklyHours: null,
      monthlyEarnings: monthlyTarget,
      weekly: null,
      flags: { unrealistic: false, neverProfitable: true, incomplete: false },
      missingFields: [],
    };
  }

  const weeklyTarget = monthlyTarget / WEEKS_PER_MONTH; // T
  const turnover = (weeklyTarget + fixedWeeklyCosts(x)) / denominator; // O
  const weeklyHours = turnover / x.h;
  return {
    mode: "A",
    offerId: offer.id,
    weeklyHours,
    monthlyEarnings: monthlyTarget,
    weekly: weeklyBreakdown(turnover, x),
    flags: {
      unrealistic: weeklyHours > UNREALISTIC_HOURS_PER_WEEK,
      neverProfitable: false,
      incomplete: false,
    },
    missingFields: [],
  };
}
