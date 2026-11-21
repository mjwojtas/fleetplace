import { describe, expect, it } from "vitest";
import type { Assumptions, Offer } from "./calc";
import { offersCount, relaxationHint, summarySentence } from "./copy";
import { getAssumptions, loadOffers, seedData, type LoadedOffer, type Partner } from "./data";
import { priorityStatus, rankOffers, suggestRelaxations, type DriverAnswers } from "./ranking";

// Made-up fixtures (not real partners).
function offer(id: string, overrides: Partial<Offer>): Offer {
  return {
    id,
    partnerId: "p",
    city: "krakow",
    settlementType: "fixed",
    weeklyFee: 0,
    carType: "own",
    fuelIncluded: false,
    rideVatRate: 0.08,
    appsIncluded: ["bolt", "uber"],
    sourceUrl: "https://example.com/offer",
    verifiedAt: "2026-11-21",
    ...overrides,
  };
}

const loaded = (offers: Offer[]): LoadedOffer[] =>
  offers.map((o) => ({ offer: o, incomplete: false, missingFields: [] }));

const partners: Partner[] = [
  { id: "p", name: "Test", cities: ["krakow"], apps: ["bolt", "uber"], www: "https://example.com", status: "draft" },
];

const a: Assumptions = {
  city: "krakow",
  hourlyTurnover: 50,
  fuelPercent: 0.12,
  appCommission: 0.25,
  rideVatDefault: 0.08,
  sourceUrl: "https://example.com/a",
  date: "2026-11-21",
};

const answers = (o: Partial<DriverAnswers>): DriverAnswers => ({
  city: "krakow",
  hours: 20,
  target: 3000,
  car: "any",
  priorities: [],
  ...o,
});

const ids = (r: ReturnType<typeof rankOffers>) => r.items.map((i) => i.offer.id);

describe("mode A ranking order", () => {
  const offers = loaded([
    offer("cheap", { weeklyFee: 10 }),
    offer("expensive", { weeklyFee: 300 }),
    offer("middle", { weeklyFee: 100 }),
    offer("rental", { carType: "rental", weeklyRent: 600 }),
    offer("never", { settlementType: "percent", percent: 0.6, feeBase: "turnover" }),
    offer("incomplete", { settlementType: "percent", percent: 0.1, feeBase: null }),
  ]);

  it("puts offers that fit in H first, then ascending hours, never-profitable and incomplete last", () => {
    // 3000 PLN target, h = 50: cheap ≈ 25.6 h, middle ≈ 28.3 h, expensive ≈ 33.9 h, rental ≈ 43.1 h
    const r = rankOffers(offers, partners, answers({ hours: 30 }), a);
    expect(r.mode).toBe("A");
    expect(ids(r)).toEqual(["cheap", "middle", "expensive", "rental", "never", "incomplete"]);
    expect(r.items.slice(0, 2).every((i) => i.fitsHours)).toBe(true);
    expect(r.items[2].fitsHours).toBe(false);
  });

  it("does not depend on the input order", () => {
    const reversed = [...offers].reverse();
    expect(ids(rankOffers(reversed, partners, answers({ hours: 30 }), a))).toEqual(
      ids(rankOffers(offers, partners, answers({ hours: 30 }), a)),
    );
  });
});

describe("✅ / ⚠ marks against available hours", () => {
  const offers = loaded([offer("cheap", { weeklyFee: 10 }), offer("expensive", { weeklyFee: 300 })]);

  it("marks an offer that fits (✅) and one that needs more hours (⚠) with the difference", () => {
    const r = rankOffers(offers, partners, answers({ hours: 30 }), a);
    const cheap = r.items.find((i) => i.offer.id === "cheap")!;
    const expensive = r.items.find((i) => i.offer.id === "expensive")!;
    expect(cheap.fitsHours).toBe(true);
    expect(cheap.extraHours).toBe(0);
    expect(expensive.fitsHours).toBe(false);
    const needed = Math.round(expensive.result.weeklyHours! * 10) / 10;
    expect(expensive.extraHours).toBeCloseTo(needed - 30, 5);
  });

  it("an offer needing exactly H hours (at 0.1 h precision) fits", () => {
    const r = rankOffers(offers, partners, answers({ hours: 30 }), a);
    const needed = Math.round(r.items[0].result.weeklyHours! * 10) / 10;
    const exact = rankOffers(offers, partners, answers({ hours: needed }), a);
    expect(exact.items[0].fitsHours).toBe(true);
  });

  it("an offer that fits ranks above one that does not, even when everything is above H", () => {
    const r = rankOffers(offers, partners, answers({ hours: 12 }), a);
    expect(r.items.every((i) => i.fitsHours === false)).toBe(true);
    expect(ids(r)).toEqual(["cheap", "expensive"]);
  });
});

describe("mode B ranking", () => {
  it("orders by monthly earnings at H hours, descending", () => {
    const offers = loaded([
      offer("expensive", { weeklyFee: 300 }),
      offer("cheap", { weeklyFee: 10 }),
      offer("rental", { carType: "rental", weeklyRent: 600 }),
    ]);
    const r = rankOffers(offers, partners, answers({ target: null, hours: 20 }), a);
    expect(r.mode).toBe("B");
    expect(ids(r)).toEqual(["cheap", "expensive", "rental"]);
    expect(r.items[2].result.flags.loss).toBe(true);
    expect(r.items.every((i) => i.fitsHours === null)).toBe(true);
  });
});

describe("priorities", () => {
  it("break ties only, never override the result", () => {
    const offers = loaded([
      offer("tie-a", { weeklyFee: 50, deposit: 600 }),
      offer("tie-b", { weeklyFee: 50, deposit: 0 }),
      offer("better-with-deposit", { weeklyFee: 10, deposit: 600 }),
    ]);
    const r = rankOffers(offers, partners, answers({ priorities: ["noDeposit"] }), a);
    expect(ids(r)).toEqual(["better-with-deposit", "tie-b", "tie-a"]);
  });

  it("several apps at once is a hard filter", () => {
    const offers = loaded([offer("one-app", { appsIncluded: ["bolt"] }), offer("two-apps", {})]);
    const r = rankOffers(offers, partners, answers({ priorities: ["multiApp"] }), a);
    expect(ids(r)).toEqual(["two-apps"]);
  });

  it("reports unknown when the source does not say", () => {
    const o = offer("x", { deposit: null, noFeeIdleWeek: null, payoutFrequency: "weekly" });
    expect(priorityStatus(o, "noDeposit")).toBe("unknown");
    expect(priorityStatus(o, "noIdleFee")).toBe("unknown");
    expect(priorityStatus(o, "fastPayout")).toBe("unknown");
    expect(priorityStatus(o, "language")).toBe("unknown");
    expect(priorityStatus({ ...o, deposit: 0, noFeeIdleWeek: true }, "noDeposit")).toBe("yes");
    expect(priorityStatus({ ...o, deposit: 0, noFeeIdleWeek: true }, "noIdleFee")).toBe("yes");
  });
});

describe("empty result with a hint", () => {
  const offers = loaded([
    offer("own-one-app", { appsIncluded: ["bolt"] }),
    offer("rental-two-apps", { carType: "rental", weeklyRent: 400 }),
  ]);

  it("returns no offers when nothing matches", () => {
    const r = rankOffers(offers, partners, answers({ car: "own", priorities: ["multiApp"] }), a);
    expect(r.matchCount).toBe(0);
    expect(r.items).toEqual([]);
  });

  it("suggests loosening the car filter or the apps filter, and how many offers that brings back", () => {
    const s = suggestRelaxations(offers, answers({ car: "own", priorities: ["multiApp"] }));
    expect(s.map((x) => [x.relax, x.count])).toEqual([
      ["car", 1],
      ["multiApp", 1],
      ["carAndMultiApp", 2],
    ]);
    expect(relaxationHint("multiApp", 1)).toBe("Odznacz „Kilka aplikacji naraz”: znajdziesz 1 ofertę.");
  });

  it("applying a suggestion gives a non-empty ranking", () => {
    const [first] = suggestRelaxations(offers, answers({ car: "own", priorities: ["multiApp"] }));
    expect(rankOffers(offers, partners, first.answers, a).items.length).toBeGreaterThan(0);
  });

  it("never changes the city", () => {
    const s = suggestRelaxations(offers, answers({ city: "warszawa", car: "own" }));
    expect(s).toEqual([]);
  });
});

describe("copy helpers", () => {
  it("builds the summary sentence from the SPEC example", () => {
    expect(summarySentence(answers({ city: "krakow", hours: 20, target: 3000, car: "own" }))).toBe(
      "Szukamy partnera dla kierowcy z Krakowa, który chce zarobić minimum 3000 zł miesięcznie, jeżdżąc około 20 godzin tygodniowo własnym autem.",
    );
  });

  it("uses Polish plural forms", () => {
    expect([1, 2, 4, 5, 12, 22, 25].map(offersCount)).toEqual([
      "1 ofertę",
      "2 oferty",
      "4 oferty",
      "5 ofert",
      "12 ofert",
      "22 oferty",
      "25 ofert",
    ]);
  });
});

describe("seed data: Kraków, half-time, 3000 PLN, own car, several apps", () => {
  it("ranks complete offers first and incomplete ones last", () => {
    const { offers, partners: seedPartners } = loadOffers();
    const r = rankOffers(
      offers,
      seedPartners,
      answers({ city: "krakow", hours: 20, target: 3000, car: "own", priorities: ["multiApp"] }),
      getAssumptions("krakow"),
    );
    expect(r.items.length).toBeGreaterThan(0);
    const groups = r.items.map((i) => i.group);
    expect(groups.indexOf("incomplete")).toBeGreaterThan(groups.lastIndexOf("ranked"));
    expect(seedData.offers.length).toBe(26);
  });
});
