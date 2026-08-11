import type { Trip } from "./types";

function cleanList(values: string[] | null | undefined) {
  return [...new Set((values || []).map((v) => v.trim()).filter(Boolean))];
}

function hasSplitLocations(
  trip: Pick<Trip, "cities" | "countries">,
) {
  return cleanList(trip.cities).length > 0 || cleanList(trip.countries).length > 0;
}

export function tripCountries(
  trip: Pick<Trip, "countries" | "cities" | "destinations">,
) {
  const countries = cleanList(trip.countries);
  if (countries.length) return countries;
  // True legacy rows only had destinations — treat those as countries
  if (!hasSplitLocations(trip)) {
    return cleanList(trip.destinations);
  }
  return [];
}

export function tripCities(
  trip: Pick<Trip, "cities" | "countries" | "destinations">,
) {
  const cities = cleanList(trip.cities);
  if (cities.length) return cities;
  // Do NOT fall back to destinations when countries exist — that wrongly
  // showed country names in the cities field.
  return [];
}

/** Places used for weather / season geocoding (cities first, then countries). */
export function tripPlaces(
  trip: Pick<Trip, "cities" | "countries" | "destinations">,
) {
  const cities = tripCities(trip);
  const countries = tripCountries(trip);
  if (cities.length || countries.length) {
    return [...cities, ...countries];
  }
  return cleanList(trip.destinations);
}

export function formatTripLocations(
  trip: Pick<Trip, "cities" | "countries" | "destinations">,
) {
  const countries = tripCountries(trip);
  const cities = tripCities(trip);

  if (!countries.length && !cities.length) {
    return "";
  }

  const parts: string[] = [];
  if (countries.length) parts.push(`Countries: ${countries.join(", ")}`);
  if (cities.length) parts.push(`Cities: ${cities.join(", ")}`);
  return parts.join(" · ");
}

export function parseCommaList(raw: string) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
