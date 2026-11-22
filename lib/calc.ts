/**
 * Earnings calculations for FleetPlace (SPEC.md, sections 4 and 5).
 *
 * Mode B (time -> earnings): weekly hours -> monthly earnings.
 * Mode A (target -> time):   monthly earnings target -> weekly hours.
 *
 * "Earnings" follows SPEC.md section 2a: turnover minus app commission, VAT on rides,
 * partner fees, car rental and fuel. Income tax and social security are NOT deducted.
 * Tips and bonuses are NOT included.
 *
 * VAT (SPEC.md section 9, item 7):
 * - VAT on partner fees is not calculated here: offer amounts are entered as the driver
 *   actually pays them. `vatBasis` is only used to cross-check the source.
 * - VAT on rides ("v") is a separate offer field; when the offer does not state it,
 *   the city default is used and the result is flagged with `vatAssumed`.
 *
 * All percentages are fractions (0.25 = 25%). All money amounts are in PLN.
 */

// ---------------------------------------------------------------------------
// Data model (SPEC.md section 5)
// ---------------------------------------------------------------------------

export const CITIES = ["warszawa", "krakow", "trojmiasto"] as const;
export type City = (typeof CITIES)[number];

export const RIDE_APPS = ["bolt", "uber", "freenow"] as const;
export type RideApp = (typeof RIDE_APPS)[number];

/** typ_rozliczenia: fixed weekly fee / percentage / both / revenue split. */
export const SETTLEMENT_TYPES = ["fixed", "percent", "mixed", "split"] as const;
export type SettlementType = (typeof SETTLEMENT_TYPES)[number];

/** podstawa_naliczania: partner percentage taken from turnover or from turnover after app commission. */
export type FeeBase = "turnover" | "afterAppCommission";

/** vat_od: whether fees are quoted net or gross. Used only to cross-check the source. */
export type VatBasis = "net" | "gross";

/** typ_auta: driver's own car or a car provided by the partner. */
export const CAR_TYPES = ["own", "rental"] as const;
export type CarType = (typeof CAR_TYPES)[number];

export type PayoutFrequency = "daily" | "weekly" | "biweekly" | "monthly";

/** Period in which the source quotes the fixed fee. */
export type FeePeriod = "week" | "month";

export interface Offer {
  id: string;
  partnerId: string;
  city: City;
  settlementType: SettlementType;
  /** opłata_stała_tyg: fixed weekly fee (PLN), used in calculations. */
  weeklyFee?: number | null;
  /** Fixed fee exactly as quoted by the source (PLN per `feeQuotedPeriod`), for display. */
  feeQuotedAmount?: number | null;
  /** Period of `feeQuotedAmount`: a monthly fee is converted to weekly as amount × 12 ÷ 52. */
  feeQuotedPeriod?: FeePeriod | null;
  /** procent: partner percentage (fraction). */
  percent?: number | null;
  /** podstawa_naliczania */
  feeBase?: FeeBase | null;
  /** vat_od */
  vatBasis?: VatBasis | null;
  /** udział_kierowcy: driver's share in the split model (fraction, e.g. 0.5). */
  driverShare?: number | null;
  /** wynajem_tyg: weekly car rental or car fee (PLN), also in the split model. */
  weeklyRent?: number | null;
  /** typ_auta */
  carType: CarType;
  /** paliwo_w_cenie: true when the partner pays for fuel. */
  fuelIncluded: boolean;
  /** vat_od_przejazdów: VAT on rides paid by the driver (fraction of turnover); null = not stated. */
  rideVatRate?: number | null;
  /** aplikacje_w_cenie: apps covered by this offer's price. */
  appsIncluded: RideApp[];
  /** brak_opłaty_bez_jazdy: no fee in a week without rides; null = not stated. */
  noFeeIdleWeek?: boolean | null;
  /** kaucja: deposit (PLN). */
  deposit?: number | null;
  /** częstotliwość_wypłat */
  payoutFrequency?: PayoutFrequency | null;
  /** języki */
  languages?: string[];
  /** źródło_url: public source of the offer terms. */
  sourceUrl: string;
  /** data_weryfikacji: ISO date (YYYY-MM-DD) of the last verification. */
  verifiedAt: string;
  /** uwagi */
  notes?: string | null;
}

export interface Assumptions {
  city: City;
  /** obrót_na_godz_domyślny: turnover per hour (PLN), "h". Null = no public source, the driver enters it. */
  hourlyTurnover: number | null;
  /** Lower bound of turnover per hour (PLN), to show earnings as a range. Null = no range. */
  hourlyTurnoverLow?: number | null;
  /** Upper bound of turnover per hour (PLN). The base value must lie within the range. */
  hourlyTurnoverHigh?: number | null;
  /** paliwo_proc_domyślne: fuel cost as a fraction of turnover, "f". */
  fuelPercent: number;
  /** prowizja_aplikacji: app commission as a fraction of turnover, "c". */
  appCommission: number;
  /** vat_od_przejazdów_domyślny: default VAT on rides, used when an offer does not state it. */
  rideVatDefault: number;
  sourceUrl: string | null;
  /** ISO date */
  date: string;
  notes?: string | null;
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
  rideVat: number;
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
  /** Mode B: weekly earnings below zero ("strata"). Always false in mode A. */
  loss: boolean;
  /** Required offer data is missing ("niepełna"). */
  incomplete: boolean;
  /** The offer does not state VAT on rides; the city default was used. */
  vatAssumed: boolean;
  /** No default turnover per hour for the city; the driver must enter it. */
  needsHourlyInput: boolean;
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

/** Converts a fee quoted per week or per month into a weekly amount (month: × 12 ÷ 52). */
export function weeklyFromQuoted(amount: number, period: FeePeriod): number {
  return period === "month" ? amount / WEEKS_PER_MONTH : amount;
}

// ---------------------------------------------------------------------------
// Validation (SPEC.md section 9, item 8)
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): boolean {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Checks that offer data is well-formed. Returns a list of errors (in Polish, for the admin);
 * an empty list means the offer is valid. Missing values (null) are not errors here:
 * they make the offer incomplete, see `findMissingFields`.
 * Offers with errors must not enter the ranking.
 */
export function validateOffer(offer: Offer): string[] {
  const errors: string[] = [];

  const fraction = (name: string, value: number | null | undefined) => {
    if (value === null || value === undefined) return;
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
      errors.push(`${name} musi być ułamkiem od 0 do 1 (podano ${value})`);
    }
  };
  const amount = (name: string, value: number | null | undefined) => {
    if (value === null || value === undefined) return;
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      errors.push(`${name} musi być kwotą 0 lub większą (podano ${value})`);
    }
  };

  if (!offer.id) errors.push("Brak identyfikatora oferty");
  if (!offer.partnerId) errors.push("Brak identyfikatora partnera");
  if (!CITIES.includes(offer.city)) errors.push(`Nieznane miasto: ${offer.city}`);
  if (!SETTLEMENT_TYPES.includes(offer.settlementType)) {
    errors.push(`Nieznany typ rozliczenia: ${offer.settlementType}`);
  }
  if (!CAR_TYPES.includes(offer.carType)) errors.push(`Nieznany typ auta: ${offer.carType}`);

  fraction("Procent", offer.percent);
  fraction("Udział kierowcy", offer.driverShare);
  fraction("VAT od przejazdów", offer.rideVatRate);
  amount("Opłata stała", offer.weeklyFee);
  amount("Wynajem", offer.weeklyRent);
  amount("Kaucja", offer.deposit);
  amount("Opłata ze źródła", offer.feeQuotedAmount);

  if (offer.feeQuotedPeriod != null && offer.feeQuotedPeriod !== "week" && offer.feeQuotedPeriod !== "month") {
    errors.push(`Nieznany okres opłaty: ${offer.feeQuotedPeriod}`);
  }
  if (typeof offer.feeQuotedAmount === "number" && offer.feeQuotedPeriod == null) {
    errors.push("Podano kwotę opłaty ze źródła bez okresu (tydzień albo miesiąc)");
  }
  if (
    typeof offer.weeklyFee === "number" &&
    typeof offer.feeQuotedAmount === "number" &&
    (offer.feeQuotedPeriod === "week" || offer.feeQuotedPeriod === "month")
  ) {
    const expected = weeklyFromQuoted(offer.feeQuotedAmount, offer.feeQuotedPeriod);
    if (Math.abs(expected - offer.weeklyFee) > 0.01) {
      errors.push(
        `Opłata tygodniowa (${offer.weeklyFee}) nie zgadza się z kwotą ze źródła (${offer.feeQuotedAmount} zł/${offer.feeQuotedPeriod === "month" ? "mies." : "tydz."})`,
      );
    }
  }

  if (!Array.isArray(offer.appsIncluded) || offer.appsIncluded.length === 0) {
    errors.push("Brak listy aplikacji objętych ofertą");
  } else {
    for (const app of offer.appsIncluded) {
      if (!RIDE_APPS.includes(app)) errors.push(`Nieznana aplikacja: ${app}`);
    }
  }
  if (!isHttpUrl(offer.sourceUrl)) errors.push(`Niepoprawny adres źródła: ${offer.sourceUrl}`);
  if (!isValidIsoDate(offer.verifiedAt)) {
    errors.push(`Niepoprawna data weryfikacji (oczekiwano RRRR-MM-DD): ${offer.verifiedAt}`);
  }
  return errors;
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
  v: number;
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
  if (offer.carType === "rental" && isMissing(offer.weeklyRent)) missing.push("weeklyRent");
  return missing;
}

function assertValidAssumptions(a: Assumptions): void {
  if (a.hourlyTurnover !== null && !(a.hourlyTurnover > 0)) {
    throw new RangeError("hourlyTurnover must be greater than 0 or null");
  }
  if (!(a.fuelPercent >= 0 && a.fuelPercent < 1)) throw new RangeError("fuelPercent must be in [0, 1)");
  if (!(a.appCommission >= 0 && a.appCommission < 1)) throw new RangeError("appCommission must be in [0, 1)");
  if (!(a.rideVatDefault >= 0 && a.rideVatDefault < 1)) throw new RangeError("rideVatDefault must be in [0, 1)");
}

function resolveParams(offer: Offer, a: Assumptions, h: number): Params {
  const c = a.appCommission;
  const f = offer.fuelIncluded ? 0 : a.fuelPercent;
  const v = isMissing(offer.rideVatRate) ? a.rideVatDefault : (offer.rideVatRate as number);
  const R = offer.carType === "rental" ? (offer.weeklyRent ?? 0) : 0;

  if (offer.settlementType === "split") {
    return { model: "split", c, p: 0, b: 1, F: 0, R, f, v, s: offer.driverShare ?? 0, h };
  }

  const usesPercent = offer.settlementType === "percent" || offer.settlementType === "mixed";
  const usesFixed = offer.settlementType === "fixed" || offer.settlementType === "mixed";
  return {
    model: "fees",
    c,
    p: usesPercent ? (offer.percent ?? 0) : 0,
    b: offer.feeBase === "afterAppCommission" ? 1 - c : 1,
    F: usesFixed ? (offer.weeklyFee ?? 0) : 0,
    R,
    f,
    v,
    s: 1,
    h,
  };
}

/**
 * Share of each extra złoty of turnover that the driver keeps.
 * Fees model: 1 − c − p·b − f − v. Split model: (1 − c)·s − f − v.
 * This is the denominator of the mode A formula; <= 0 means the offer never pays off.
 */
function marginRate(x: Params): number {
  return x.model === "fees" ? 1 - x.c - x.p * x.b - x.f - x.v : (1 - x.c) * x.s - x.f - x.v;
}

/** Fixed weekly costs that do not depend on turnover: F + R (in the split model F = 0). */
function fixedWeeklyCosts(x: Params): number {
  return x.F + x.R;
}

function weeklyBreakdown(turnover: number, x: Params): WeeklyBreakdown {
  const O = turnover;
  const appCommission = O * x.c;
  const rideVat = O * x.v;
  const fuel = O * x.f;
  if (x.model === "split") {
    return {
      turnover: O,
      appCommission,
      rideVat,
      partnerPercentFee: 0,
      partnerFixedFee: 0,
      partnerSplitShare: O * (1 - x.c) * (1 - x.s),
      rent: x.R,
      fuel,
      earnings: O * ((1 - x.c) * x.s - x.f - x.v) - x.R,
    };
  }
  const partnerPercentFee = O * x.p * x.b;
  return {
    turnover: O,
    appCommission,
    rideVat,
    partnerPercentFee,
    partnerFixedFee: x.F,
    partnerSplitShare: 0,
    rent: x.R,
    fuel,
    earnings: O - appCommission - rideVat - partnerPercentFee - fuel - x.F - x.R,
  };
}

function baseFlags(offer: Offer): CalcFlags {
  return {
    unrealistic: false,
    neverProfitable: false,
    loss: false,
    incomplete: false,
    vatAssumed: isMissing(offer.rideVatRate),
    needsHourlyInput: false,
  };
}

/**
 * Returns a result without numbers when the offer is incomplete or the hourly turnover
 * is unknown; otherwise returns null and the calculation continues.
 */
function blockedResult(
  mode: "A" | "B",
  offer: Offer,
  assumptions: Assumptions,
  hours: number | null,
  monthly: number | null,
): CalcResult | null {
  const missing = findMissingFields(offer);
  const needsHourlyInput = assumptions.hourlyTurnover === null;
  if (missing.length === 0 && !needsHourlyInput) return null;
  return {
    mode,
    offerId: offer.id,
    weeklyHours: hours,
    monthlyEarnings: monthly,
    weekly: null,
    flags: { ...baseFlags(offer), incomplete: missing.length > 0, needsHourlyInput },
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

  const blocked = blockedResult("B", offer, assumptions, weeklyHours, null);
  if (blocked) return blocked;

  const x = resolveParams(offer, assumptions, assumptions.hourlyTurnover as number);
  const weekly = weeklyBreakdown(weeklyHours * x.h, x);
  return {
    mode: "B",
    offerId: offer.id,
    weeklyHours,
    monthlyEarnings: weekly.earnings * WEEKS_PER_MONTH,
    weekly,
    flags: {
      ...baseFlags(offer),
      unrealistic: weeklyHours > UNREALISTIC_HOURS_PER_WEEK,
      neverProfitable: marginRate(x) <= MARGIN_EPSILON,
      loss: weekly.earnings < 0,
    },
    missingFields: [],
  };
}

/** Mode A: monthly earnings target (before tax) -> weekly hours needed. */
export function hoursForTarget(offer: Offer, assumptions: Assumptions, monthlyTarget: number): CalcResult {
  assertValidAssumptions(assumptions);
  if (!(monthlyTarget >= 0)) throw new RangeError("monthlyTarget must be 0 or more");

  const blocked = blockedResult("A", offer, assumptions, null, monthlyTarget);
  if (blocked) return blocked;

  const x = resolveParams(offer, assumptions, assumptions.hourlyTurnover as number);
  const denominator = marginRate(x);
  if (denominator <= MARGIN_EPSILON) {
    return {
      mode: "A",
      offerId: offer.id,
      weeklyHours: null,
      monthlyEarnings: monthlyTarget,
      weekly: null,
      flags: { ...baseFlags(offer), neverProfitable: true },
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
    flags: { ...baseFlags(offer), unrealistic: weeklyHours > UNREALISTIC_HOURS_PER_WEEK },
    missingFields: [],
  };
}
