import { describe, expect, it } from "vitest";
import {
  earningsForHours,
  hoursForTarget,
  validateOffer,
  WEEKS_PER_MONTH,
  type Assumptions,
  type Offer,
} from "./calc";

// Test fixtures use made-up numbers (as in SPEC.md section 4), not real partner data.

function offer(overrides: Partial<Offer>): Offer {
  return {
    id: "test-offer",
    partnerId: "test-partner",
    city: "warszawa",
    settlementType: "fixed",
    weeklyFee: 0,
    carType: "own",
    fuelIncluded: false,
    rideVatRate: 0,
    appsIncluded: ["bolt", "uber"],
    sourceUrl: "https://example.com/offer",
    verifiedAt: "2026-11-21",
    ...overrides,
  };
}

function assumptions(overrides: Partial<Assumptions>): Assumptions {
  return {
    city: "warszawa",
    hourlyTurnover: 50,
    fuelPercent: 0.15,
    appCommission: 0.25,
    rideVatDefault: 0.08,
    sourceUrl: "https://example.com/assumptions",
    date: "2026-11-21",
    ...overrides,
  };
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

describe("SPEC.md section 4 example (c = 0, v = 0)", () => {
  // Target 3000 PLN/month, h = 50 PLN, f = 15%, c = 0, v = 0.
  const a = assumptions({ hourlyTurnover: 50, fuelPercent: 0.15, appCommission: 0, rideVatDefault: 0 });

  it("offer A: own car, F = 50 PLN -> 17.5 h", () => {
    const r = hoursForTarget(offer({ settlementType: "fixed", weeklyFee: 50 }), a, 3000);
    expect(round1(r.weeklyHours)).toBe(17.5);
  });

  it("offer B: rental R = 400 PLN -> 25.7 h", () => {
    const r = hoursForTarget(
      offer({ settlementType: "fixed", weeklyFee: 0, carType: "rental", weeklyRent: 400 }),
      a,
      3000,
    );
    expect(round1(r.weeklyHours)).toBe(25.7);
  });

  it("offer C: 50/50 split, partner pays fuel -> 27.7 h", () => {
    const r = hoursForTarget(
      offer({ settlementType: "split", driverShare: 0.5, fuelIncluded: true, carType: "rental", weeklyRent: 0 }),
      a,
      3000,
    );
    expect(round1(r.weeklyHours)).toBe(27.7);
  });
});

describe("mode A result fed into mode B gives the target back (±1 PLN), with VAT on rides v > 0", () => {
  const a = assumptions({ city: "krakow", hourlyTurnover: 55, fuelPercent: 0.12, appCommission: 0.25, rideVatDefault: 0.08 });

  const cases: Array<[string, Offer]> = [
    ["fixed fee, own car, default VAT 8%", offer({ settlementType: "fixed", weeklyFee: 60, rideVatRate: null })],
    [
      "fixed fee, rental, VAT 5%",
      offer({ settlementType: "fixed", weeklyFee: 40, carType: "rental", weeklyRent: 450, rideVatRate: 0.05 }),
    ],
    ["percent of turnover, VAT 8%", offer({ settlementType: "percent", percent: 0.08, feeBase: "turnover", rideVatRate: 0.08 })],
    [
      "percent after app commission, fuel included, default VAT",
      offer({ settlementType: "percent", percent: 0.1, feeBase: "afterAppCommission", fuelIncluded: true, rideVatRate: null }),
    ],
    [
      "mixed, rental, VAT 8%",
      offer({
        settlementType: "mixed",
        weeklyFee: 30,
        percent: 0.05,
        feeBase: "afterAppCommission",
        carType: "rental",
        weeklyRent: 500,
        rideVatRate: 0.08,
      }),
    ],
    [
      "split, driver pays fuel, car fee R = 150, VAT 8%",
      offer({ settlementType: "split", driverShare: 0.6, carType: "rental", weeklyRent: 150, rideVatRate: 0.08 }),
    ],
    [
      "split, partner pays fuel, no car fee, default VAT",
      offer({ settlementType: "split", driverShare: 0.5, fuelIncluded: true, carType: "rental", weeklyRent: 0, rideVatRate: null }),
    ],
  ];

  for (const target of [2500, 4000, 6000]) {
    for (const [name, o] of cases) {
      it(`${name}, target ${target} PLN`, () => {
        const ra = hoursForTarget(o, a, target);
        expect(ra.weeklyHours).not.toBeNull();
        expect(ra.weekly!.rideVat).toBeGreaterThan(0);
        const rb = earningsForHours(o, a, ra.weeklyHours!);
        expect(Math.abs(rb.monthlyEarnings! - target)).toBeLessThanOrEqual(1);
      });
    }
  }
});

describe("VAT on rides", () => {
  const a = assumptions({ rideVatDefault: 0.08 });

  it("uses the city default and sets vatAssumed when the offer does not state VAT", () => {
    const r = earningsForHours(offer({ rideVatRate: null }), a, 40);
    expect(r.flags.vatAssumed).toBe(true);
    expect(r.weekly!.rideVat).toBeCloseTo(2000 * 0.08);
  });

  it("uses the offer's own VAT rate when stated", () => {
    const r = earningsForHours(offer({ rideVatRate: 0.05 }), a, 40);
    expect(r.flags.vatAssumed).toBe(false);
    expect(r.weekly!.rideVat).toBeCloseTo(2000 * 0.05);
  });
});

describe("split model with car fee R", () => {
  // h = 50, c = 0.25, f = 0.15, v = 0.08, s = 0.55, R = 150
  const a = assumptions({});
  const o = offer({ settlementType: "split", driverShare: 0.55, carType: "rental", weeklyRent: 150, rideVatRate: 0.08 });

  it("mode B subtracts R: O × ((1 − c) × s − f − v) − R", () => {
    const r = earningsForHours(o, a, 40);
    const O = 2000;
    expect(r.weekly!.rent).toBe(150);
    expect(r.weekly!.earnings).toBeCloseTo(O * (0.75 * 0.55 - 0.15 - 0.08) - 150);
  });

  it("mode A adds R to the target: O = (T + R) ÷ ((1 − c) × s − f − v)", () => {
    const r = hoursForTarget(o, a, 3000);
    const expectedO = (3000 / WEEKS_PER_MONTH + 150) / (0.75 * 0.55 - 0.15 - 0.08);
    expect(r.weekly!.turnover).toBeCloseTo(expectedO);
    expect(r.weeklyHours!).toBeCloseTo(expectedO / 50);
  });

  it("needs more hours than the same split without a car fee", () => {
    const withFee = hoursForTarget(o, a, 3000).weeklyHours!;
    const withoutFee = hoursForTarget({ ...o, weeklyRent: 0 }, a, 3000).weeklyHours!;
    expect(withFee).toBeGreaterThan(withoutFee);
  });
});

describe("missing hourly turnover (e.g. Tricity)", () => {
  const a = assumptions({ city: "trojmiasto", hourlyTurnover: null, sourceUrl: null });

  it("sets needsHourlyInput and does not calculate in mode A", () => {
    const r = hoursForTarget(offer({ city: "trojmiasto", weeklyFee: 60 }), a, 3000);
    expect(r.flags.needsHourlyInput).toBe(true);
    expect(r.weeklyHours).toBeNull();
    expect(r.weekly).toBeNull();
  });

  it("sets needsHourlyInput and does not calculate in mode B", () => {
    const r = earningsForHours(offer({ city: "trojmiasto", weeklyFee: 60 }), a, 20);
    expect(r.flags.needsHourlyInput).toBe(true);
    expect(r.monthlyEarnings).toBeNull();
  });

  it("calculates once the driver enters a value", () => {
    const r = hoursForTarget(offer({ city: "trojmiasto", weeklyFee: 60 }), { ...a, hourlyTurnover: 50 }, 3000);
    expect(r.flags.needsHourlyInput).toBe(false);
    expect(r.weeklyHours).not.toBeNull();
  });
});

describe("flags", () => {
  // v = 0 so that the "exactly zero" denominators below stay exact.
  const a = assumptions({ hourlyTurnover: 50, fuelPercent: 0.15, appCommission: 0.25, rideVatDefault: 0 });

  it("marks more than 60 hours per week as unrealistic", () => {
    const r = hoursForTarget(offer({ settlementType: "fixed", weeklyFee: 50 }), a, 12000);
    expect(r.weeklyHours!).toBeGreaterThan(60);
    expect(r.flags.unrealistic).toBe(true);
    expect(r.flags.neverProfitable).toBe(false);
  });

  it("does not mark a normal result as unrealistic", () => {
    const r = hoursForTarget(offer({ settlementType: "fixed", weeklyFee: 50 }), a, 3000);
    expect(r.weeklyHours!).toBeLessThanOrEqual(60);
    expect(r.flags.unrealistic).toBe(false);
  });

  it("marks an offer that never pays off (denominator <= 0) in mode A", () => {
    // 1 - 0.25 - 0.6 - 0.15 - 0 = 0
    const o = offer({ settlementType: "percent", percent: 0.6, feeBase: "turnover" });
    const r = hoursForTarget(o, a, 3000);
    expect(r.flags.neverProfitable).toBe(true);
    expect(r.weeklyHours).toBeNull();
  });

  it("marks a split offer that never pays off in mode A", () => {
    // (1 - 0.25) * 0.2 - 0.15 - 0 = 0
    const o = offer({ settlementType: "split", driverShare: 0.2, carType: "rental", weeklyRent: 0 });
    expect(hoursForTarget(o, a, 3000).flags.neverProfitable).toBe(true);
  });

  it("marks an offer that never pays off in mode B", () => {
    const o = offer({ settlementType: "percent", percent: 0.7, feeBase: "turnover" });
    const r = earningsForHours(o, a, 40);
    expect(r.flags.neverProfitable).toBe(true);
    expect(r.monthlyEarnings!).toBeLessThan(0);
  });

  it("marks an offer with missing data as incomplete instead of guessing", () => {
    const o = offer({ settlementType: "percent", percent: 0.08, feeBase: null });
    const r = hoursForTarget(o, a, 3000);
    expect(r.flags.incomplete).toBe(true);
    expect(r.missingFields).toContain("feeBase");
    expect(r.weeklyHours).toBeNull();
  });
});

describe("loss flag (mode B, weekly earnings < 0)", () => {
  // 8 h, rental 400 PLN, h = 60, c = 0.25, f = 0.12, v = 8% (city default):
  // 480 × (1 − 0.25 − 0.12 − 0.08) − 400 = −136 PLN per week.
  const a = assumptions({ hourlyTurnover: 60, appCommission: 0.25, fuelPercent: 0.12, rideVatDefault: 0.08 });
  const rental = offer({ settlementType: "fixed", weeklyFee: 0, carType: "rental", weeklyRent: 400, rideVatRate: null });

  it("is set when costs exceed earnings", () => {
    const r = earningsForHours(rental, a, 8);
    expect(r.weekly!.earnings).toBeCloseTo(-136);
    expect(r.flags.loss).toBe(true);
    expect(r.flags.neverProfitable).toBe(false);
  });

  it("is not set with enough hours", () => {
    const r = earningsForHours(rental, a, 30);
    expect(r.weekly!.earnings).toBeGreaterThan(0);
    expect(r.flags.loss).toBe(false);
  });

  it("is never set in mode A", () => {
    expect(hoursForTarget(rental, a, 3000).flags.loss).toBe(false);
  });
});

describe("validateOffer", () => {
  it("accepts a valid offer", () => {
    expect(validateOffer(offer({ settlementType: "percent", percent: 0.08, feeBase: "turnover" }))).toEqual([]);
  });

  it("does not treat missing values (null) as errors", () => {
    expect(validateOffer(offer({ weeklyFee: null, rideVatRate: null }))).toEqual([]);
  });

  it("rejects percent = 8 (must be a fraction 0–1)", () => {
    const errors = validateOffer(offer({ settlementType: "percent", percent: 8, feeBase: "turnover" }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Procent/);
  });

  it("rejects driver share and VAT outside 0–1", () => {
    const errors = validateOffer(offer({ settlementType: "split", driverShare: 50, rideVatRate: -0.1 }));
    expect(errors).toHaveLength(2);
  });

  it("rejects negative amounts", () => {
    const errors = validateOffer(offer({ weeklyFee: -10, weeklyRent: -1, deposit: -500, carType: "rental" }));
    expect(errors).toHaveLength(3);
  });

  it("rejects an invalid source URL", () => {
    expect(validateOffer(offer({ sourceUrl: "fobest.pl" }))).toHaveLength(1);
    expect(validateOffer(offer({ sourceUrl: "" }))).toHaveLength(1);
  });

  it("rejects an invalid verification date", () => {
    expect(validateOffer(offer({ verifiedAt: "21.11.2026" }))).toHaveLength(1);
    expect(validateOffer(offer({ verifiedAt: "2026-02-30" }))).toHaveLength(1);
  });

  it("rejects an empty or unknown app list", () => {
    expect(validateOffer(offer({ appsIncluded: [] }))).toHaveLength(1);
    expect(validateOffer(offer({ appsIncluded: ["taxi" as never] }))).toHaveLength(1);
  });
});

describe("mode B breakdown", () => {
  it("adds up: earnings = turnover - all costs", () => {
    const a = assumptions({ hourlyTurnover: 50, fuelPercent: 0.15, appCommission: 0.25, rideVatDefault: 0.08 });
    const o = offer({
      settlementType: "mixed",
      weeklyFee: 50,
      percent: 0.1,
      feeBase: "afterAppCommission",
      carType: "rental",
      weeklyRent: 400,
      rideVatRate: null,
    });
    const r = earningsForHours(o, a, 40);
    const w = r.weekly!;
    expect(w.turnover).toBe(2000);
    expect(w.appCommission).toBeCloseTo(500);
    expect(w.rideVat).toBeCloseTo(160);
    expect(w.partnerPercentFee).toBeCloseTo(150); // 2000 * 0.1 * (1 - 0.25)
    expect(w.fuel).toBeCloseTo(300);
    expect(w.earnings).toBeCloseTo(2000 - 500 - 160 - 150 - 300 - 50 - 400);
    expect(r.monthlyEarnings!).toBeCloseTo(w.earnings * WEEKS_PER_MONTH);
  });
});
