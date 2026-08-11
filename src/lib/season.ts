export type Season = "spring" | "summer" | "autumn" | "winter";

export type SeasonTheme = {
  season: Season;
  label: string;
  hemisphere: "north" | "south" | "unknown";
  basedOn: string;
};

const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

function monthToNorthernSeason(month: number): Season {
  // month is 1-12
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

function flipSeason(season: Season): Season {
  switch (season) {
    case "spring":
      return "autumn";
    case "summer":
      return "winter";
    case "autumn":
      return "spring";
    case "winter":
      return "summer";
  }
}

function midpointDate(start: string | null, end: string | null): Date | null {
  if (start && end) {
    const a = new Date(`${start}T12:00:00Z`).getTime();
    const b = new Date(`${end}T12:00:00Z`).getTime();
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return new Date((a + b) / 2);
    }
  }
  if (start) return new Date(`${start}T12:00:00Z`);
  if (end) return new Date(`${end}T12:00:00Z`);
  return null;
}

async function geocodeLatitude(place: string): Promise<number | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`,
      { next: { revalidate: 86400 } },
    );
    const geo = await geoRes.json();
    const lat = geo?.results?.[0]?.latitude;
    return typeof lat === "number" ? lat : null;
  } catch {
    return null;
  }
}

/** Infer trip season from travel dates + destination hemisphere. */
export async function resolveTripSeason(input: {
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
}): Promise<SeasonTheme> {
  const mid = midpointDate(input.startDate, input.endDate);
  const month = mid ? mid.getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
  let northern = monthToNorthernSeason(month);

  let hemisphere: SeasonTheme["hemisphere"] = "unknown";
  let basedOn = input.destinations[0] || "your dates";

  // Average latitude across destinations when possible
  const places = input.destinations.map((d) => d.trim()).filter(Boolean);
  if (places.length) {
    const lats = (
      await Promise.all(places.slice(0, 4).map((p) => geocodeLatitude(p)))
    ).filter((n): n is number => n != null);
    if (lats.length) {
      const avg = lats.reduce((a, b) => a + b, 0) / lats.length;
      hemisphere = avg >= 0 ? "north" : "south";
      basedOn = places[0];
      if (hemisphere === "south") northern = flipSeason(northern);
    }
  }

  return {
    season: northern,
    label: SEASON_LABELS[northern],
    hemisphere,
    basedOn,
  };
}
