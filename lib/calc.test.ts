import { describe, expect, it } from "vitest";
import {
  earningsForHours,
  hoursForTarget,
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
    sourceUrl: "https://example.com/offer",
    verifiedAt: "2026-11-21",
    ...overrides,
  };
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

describe("SPEC.md section 4 example", () => {
  // Target 3000 PLN/month, h = 50 PLN, f = 15%, c = 0.
  const assumptions: Assumptions = {
    city: "warszawa",
    hourlyTurnover: 50,
    fuelPercent: 0.15,
    appCommission: 0,
    sourceUrl: "https://example.com/assumptions",
    date: "2026-11-21",
  };

  it("offer A: own car, F = 50 PLN -> 17.5 h", () => {
    const r = hoursForTarget(offer({ settlementType: "fixed", weeklyFee: 50 }), assumptions, 3000);
    expect(round1(r.weeklyHours)).toBe(17.5);
  });

  it("offer B: rental R = 400 PLN -> 25.7 h", () => {
    const r = hoursForTarget(
      offer({ settlementType: "fixed", weeklyFee: 0, carType: "rental", weeklyRent: 400 }),
      assumptions,
      3000,
    );
    expect(round1(r.weeklyHours)).toBe(25.7);
  });

  it("offer C: 50/50 split, partner pays fuel -> 27.7 h", () => {
    const r = hoursForTarget(
      offer({ settlementType: "split", driverShare: 0.5, fuelIncluded: true }),
      assumptions,
      3000,
    );
    expect(round1(r.weeklyHours)).toBe(27.7);
  });
});

describe("mode A result fed into mode B gives the target back (±1 PLN)", () => {
  const assumptions: Assumptions = {
    city: "krakow",
    hourlyTurnover: 55,
    fuelPercent: 0.12,
    appCommission: 0.25,
    sourceUrl: "https://example.com/assumptions",
    date: "2026-11-21",
  };

  const cases: Array<[string, Offer]> = [
    ["fixed fee, own car", offer({ settlementType: "fixed", weeklyFee: 60 })],
    ["fixed fee, rental", offer({ settlementType: "fixed", weeklyFee: 40, carType: "rental", weeklyRent: 450 })],
    ["percent of turnover", offer({ settlementType: "percent", percent: 0.08, feeBase: "turnover" })],
    [
      "percent after app commission, fuel included",
      offer({ settlementType: "percent", percent: 0.1, feeBase: "afterAppCommission", fuelIncluded: true }),
    ],
    [
      "mixed, rental",
      offer({
        settlementType: "mixed",
        weeklyFee: 30,
        percent: 0.05,
        feeBase: "afterAppCommission",
        carType: "rental",
        weeklyRent: 500,
      }),
    ],
    ["split, driver pays fuel", offer({ settlementType: "split", driverShare: 0.6 })],
    ["split, partner pays fuel", offer({ settlementType: "split", driverShare: 0.5, fuelIncluded: true })],
  ];

  for (const target of [2500, 4000, 6000]) {
    for (const [name, o] of cases) {
      it(`${name}, target ${target} PLN`, () => {
        const a = hoursForTarget(o, assumptions, target);
        expect(a.weeklyHours).not.toBeNull();
        const b = earningsForHours(o, assumptions, a.weeklyHours!);
        expect(Math.abs(b.monthlyEarnings! - target)).toBeLessThanOrEqual(1);
      });
    }
  }
});

describe("flags", () => {
  const assumptions: Assumptions = {
    city: "trojmiasto",
    hourlyTurnover: 50,
    fuelPercent: 0.15,
    appCommission: 0.25,
    sourceUrl: "https://example.com/assumptions",
    date: "2026-11-21",
  };

  it("marks more than 60 hours per week as unrealistic", () => {
    const r = hoursForTarget(offer({ settlementType: "fixed", weeklyFee: 50 }), assumptions, 12000);
    expect(r.weeklyHours!).toBeGreaterThan(60);
    expect(r.flags.unrealistic).toBe(true);
    expect(r.flags.neverProfitable).toBe(false);
  });

  it("does not mark a normal result as unrealistic", () => {
    const r = hoursForTarget(offer({ settlementType: "fixed", weeklyFee: 50 }), assumptions, 3000);
    expect(r.weeklyHours!).toBeLessThanOrEqual(60);
    expect(r.flags.unrealistic).toBe(false);
  });

  it("marks an offer that never pays off (denominator <= 0) in mode A", () => {
    // 1 - 0.25 - 0.6 - 0.15 = 0
    const o = offer({ settlementType: "percent", percent: 0.6, feeBase: "turnover" });
    const r = hoursForTarget(o, assumptions, 3000);
    expect(r.flags.neverProfitable).toBe(true);
    expect(r.weeklyHours).toBeNull();
  });

  it("marks a split offer that never pays off in mode A", () => {
    // (1 - 0.25) * 0.2 - 0.15 = 0
    const r = hoursForTarget(offer({ settlementType: "split", driverShare: 0.2 }), assumptions, 3000);
    expect(r.flags.neverProfitable).toBe(true);
  });

  it("marks an offer that never pays off in mode B", () => {
    const o = offer({ settlementType: "percent", percent: 0.7, feeBase: "turnover" });
    const r = earningsForHours(o, assumptions, 40);
    expect(r.flags.neverProfitable).toBe(true);
    expect(r.monthlyEarnings!).toBeLessThan(0);
  });

  it("marks an offer with missing data as incomplete instead of guessing", () => {
    const o = offer({ settlementType: "percent", percent: 0.08, feeBase: null });
    const r = hoursForTarget(o, assumptions, 3000);
    expect(r.flags.incomplete).toBe(true);
    expect(r.missingFields).toContain("feeBase");
    expect(r.weeklyHours).toBeNull();
  });
});

describe("mode B breakdown", () => {
  it("adds up: earnings = turnover - all costs", () => {
    const assumptions: Assumptions = {
      city: "warszawa",
      hourlyTurnover: 50,
      fuelPercent: 0.15,
      appCommission: 0.25,
      sourceUrl: "https://example.com/assumptions",
      date: "2026-11-21",
    };
    const o = offer({
      settlementType: "mixed",
      weeklyFee: 50,
      percent: 0.1,
      feeBase: "afterAppCommission",
      carType: "rental",
      weeklyRent: 400,
    });
    const r = earningsForHours(o, assumptions, 40);
    const w = r.weekly!;
    expect(w.turnover).toBe(2000);
    expect(w.appCommission).toBeCloseTo(500);
    expect(w.partnerPercentFee).toBeCloseTo(150); // 2000 * 0.1 * (1 - 0.25)
    expect(w.fuel).toBeCloseTo(300);
    expect(w.earnings).toBeCloseTo(2000 - 500 - 150 - 300 - 50 - 400);
    expect(r.monthlyEarnings!).toBeCloseTo(w.earnings * WEEKS_PER_MONTH);
  });
});
