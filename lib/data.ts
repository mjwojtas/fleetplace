/**
 * Seed data loading, validation and filtering (SPEC.md sections 2, 5 and 12).
 *
 * Offers with validation errors are rejected (they never reach the ranking).
 * Incomplete offers are kept, but marked, so the UI can show them without a result.
 */
import seedJson from "../data/seed-offers.json";
import {
  findMissingFields,
  validateOffer,
  type Assumptions,
  type City,
  type Offer,
  type RideApp,
} from "./calc";

export interface Partner {
  id: string;
  name: string;
  cities: City[];
  apps: RideApp[];
  www: string;
  status: "draft" | "verified" | "archived";
}

export interface SeedData {
  meta: { version: number; collectedAt: string; status: string; note?: string };
  assumptions: Assumptions[];
  partners: Partner[];
  offers: Offer[];
}

export interface LoadedOffer {
  offer: Offer;
  /** Required data is missing; show the offer without a calculated result. */
  incomplete: boolean;
  missingFields: string[];
}

export interface RejectedOffer {
  id: string;
  errors: string[];
}

export interface LoadedData {
  offers: LoadedOffer[];
  rejected: RejectedOffer[];
  assumptions: Assumptions[];
  partners: Partner[];
}

/** The bundled seed file. JSON imports are typed loosely, so the shape is asserted here and checked by validateOffer. */
export const seedData = seedJson as unknown as SeedData;

/** Validates every offer: invalid ones are rejected, incomplete ones are kept and marked. */
export function loadOffers(data: SeedData = seedData): LoadedData {
  const offers: LoadedOffer[] = [];
  const rejected: RejectedOffer[] = [];
  for (const offer of data.offers) {
    const errors = validateOffer(offer);
    if (errors.length > 0) {
      rejected.push({ id: offer.id, errors });
      continue;
    }
    const missingFields = findMissingFields(offer);
    offers.push({ offer, incomplete: missingFields.length > 0, missingFields });
  }
  return { offers, rejected, assumptions: data.assumptions, partners: data.partners };
}

export function getAssumptions(city: City, data: SeedData = seedData): Assumptions {
  const found = data.assumptions.find((a) => a.city === city);
  if (!found) throw new Error(`No assumptions for city: ${city}`);
  return found;
}

/**
 * Car answer from interview question 4 (SPEC.md section 2):
 * own = own car, rental = car rented only for the driver, split = car shared in shifts
 * (split settlement), any = "I don't know yet" (no filter).
 */
export type CarChoice = "own" | "rental" | "split" | "any";

export interface OfferFilters {
  city: City;
  car: CarChoice;
  /** "Several apps at once" priority: a hard filter on offers covering 2 or more apps. */
  multiApp: boolean;
}

function matchesCar(offer: Offer, car: CarChoice): boolean {
  const isSplit = offer.settlementType === "split";
  switch (car) {
    case "own":
      return offer.carType === "own" && !isSplit;
    case "rental":
      return offer.carType === "rental" && !isSplit;
    case "split":
      return isSplit;
    case "any":
      return true;
  }
}

/** Applies the hard filters from the interview: city, car and apps. */
export function filterOffers<T extends { offer: Offer }>(items: T[], filters: OfferFilters): T[] {
  return items.filter(
    ({ offer }) =>
      offer.city === filters.city &&
      matchesCar(offer, filters.car) &&
      (!filters.multiApp || offer.appsIncluded.length >= 2),
  );
}
