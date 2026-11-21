import { describe, expect, it } from "vitest";
import { hoursForTarget, validateOffer } from "./calc";
import { filterOffers, getAssumptions, loadOffers, seedData } from "./data";

describe("seed data (data/seed-offers.json)", () => {
  const loaded = loadOffers();

  it("every offer is valid: no validation errors", () => {
    for (const offer of seedData.offers) {
      expect(validateOffer(offer), offer.id).toEqual([]);
    }
    expect(loaded.rejected).toEqual([]);
    expect(loaded.offers).toHaveLength(seedData.offers.length);
  });

  it("every offer is either complete or marked incomplete with the missing fields", () => {
    for (const item of loaded.offers) {
      expect(item.incomplete, item.offer.id).toBe(item.missingFields.length > 0);
    }
  });

  it("every offer belongs to a known partner and has assumptions for its city", () => {
    const partnerIds = new Set(seedData.partners.map((p) => p.id));
    for (const { offer } of loaded.offers) {
      expect(partnerIds.has(offer.partnerId), offer.id).toBe(true);
      expect(() => getAssumptions(offer.city)).not.toThrow();
    }
  });

  it("Tricity has no default hourly turnover, so results need driver input", () => {
    const a = getAssumptions("trojmiasto");
    expect(a.hourlyTurnover).toBeNull();
    const tricity = loaded.offers.filter(({ offer }) => offer.city === "trojmiasto");
    expect(tricity.length).toBeGreaterThan(0);
    for (const { offer } of tricity) {
      const r = hoursForTarget(offer, a, 3000);
      expect(r.flags.needsHourlyInput, offer.id).toBe(true);
      expect(r.weeklyHours).toBeNull();
    }
  });

  it("rejects an offer with invalid data instead of loading it", () => {
    const broken = { ...seedData.offers[0], id: "broken", percent: 8 };
    const result = loadOffers({ ...seedData, offers: [broken] });
    expect(result.offers).toHaveLength(0);
    expect(result.rejected[0].id).toBe("broken");
  });
});

describe("filterOffers", () => {
  const { offers } = loadOffers();

  it("filters by city", () => {
    const krakow = filterOffers(offers, { city: "krakow", car: "any", multiApp: false });
    expect(krakow.length).toBeGreaterThan(0);
    expect(krakow.every(({ offer }) => offer.city === "krakow")).toBe(true);
  });

  it("own car excludes rentals and shift (split) offers", () => {
    const own = filterOffers(offers, { city: "warszawa", car: "own", multiApp: false });
    expect(own.length).toBeGreaterThan(0);
    expect(own.every(({ offer }) => offer.carType === "own" && offer.settlementType !== "split")).toBe(true);
  });

  it("car in shifts returns only split offers", () => {
    const split = filterOffers(offers, { city: "krakow", car: "split", multiApp: false });
    expect(split.length).toBeGreaterThan(0);
    expect(split.every(({ offer }) => offer.settlementType === "split")).toBe(true);
  });

  it("several apps at once excludes single-app offers", () => {
    const all = filterOffers(offers, { city: "warszawa", car: "own", multiApp: false });
    const multi = filterOffers(offers, { city: "warszawa", car: "own", multiApp: true });
    expect(multi.length).toBeLessThan(all.length);
    expect(multi.every(({ offer }) => offer.appsIncluded.length >= 2)).toBe(true);
  });
});
