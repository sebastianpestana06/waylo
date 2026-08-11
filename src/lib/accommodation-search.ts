import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AccommodationSearch,
  AccommodationSiteLink,
  RankedBookingSite,
} from "@/lib/types";

export type AccommodationSearchInput = {
  city: string;
  checkIn: string;
  checkOut: string;
  maxStationKm?: number | null;
  budgetPerPersonNight: number;
  currency?: string;
  adults?: number;
  /** Rooms when the OTA supports it (Booking, Hotels.com, Expedia, Agoda, Kayak). */
  rooms?: number;
  notes?: string;
  preferredSites?: string[];
};

/** Parse guest count safely — never silently fall back when a valid number was given. */
export function parseGuestCount(value: unknown, fallback = 2): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(16, Math.floor(n));
}

/** Parse room count (1–8). Falls back when missing/invalid. */
export function parseRoomCount(value: unknown, fallback = 1): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(8, Math.floor(n));
}

/** Prefer explicit rooms; otherwise 1 room per ~2 adults. */
export function resolveRoomCount(
  rooms: unknown,
  adults: unknown,
): number {
  const guestFallback = Math.max(1, Math.ceil(parseGuestCount(adults) / 2));
  if (rooms === undefined || rooms === null || rooms === "") {
    return guestFallback;
  }
  return parseRoomCount(rooms, guestFallback);
}

/** Coerce DB/form dates to YYYY-MM-DD (Booking etc. reject timestamps). */
export function normalizeIsoDate(value: unknown): string {
  const s = String(value ?? "").trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(`${checkIn}T12:00:00Z`).getTime();
  const b = new Date(`${checkOut}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

function clampScore(n: number) {
  return Math.max(1, Math.min(10, Math.round(n)));
}

function qs(
  base: string,
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

type SiteLinkOpts = {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  nights: number;
  currency: string;
  stayBudget: number;
};

/** City slug for path-based URLs (Airbnb / Kayak). */
function cityPathSegment(city: string) {
  return encodeURIComponent(city.trim().replace(/\s+/g, "-"));
}

/** City / dates / guests deep links (no specific hotel names). */
function buildSiteUrls(opts: SiteLinkOpts): AccommodationSiteLink[] {
  const {
    destination,
    checkIn,
    checkOut,
    adults,
    rooms,
    nights,
    currency,
    stayBudget,
  } = opts;
  const dest = destination.trim();
  const inDate = normalizeIsoDate(checkIn);
  const outDate = normalizeIsoDate(checkOut);
  const citySlug = cityPathSegment(dest);

  return [
    {
      label: "Booking.com",
      href: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest)}&checkin=${inDate}&checkout=${outDate}&group_adults=${adults}&group_children=0&no_rooms=${rooms}&selected_currency=${encodeURIComponent(currency)}`,
    },
    {
      label: "Airbnb",
      // Minimal path+dates — extra tracking params can break Airbnb’s search UI
      href: qs(`https://www.airbnb.com/s/${citySlug}/homes`, {
        checkin: inDate,
        checkout: outDate,
        adults,
        ...(Number.isFinite(stayBudget) && stayBudget > 0
          ? { price_max: Math.round(stayBudget) }
          : {}),
      }),
    },
    {
      label: "Google Hotels",
      // Google Travel ignores bare `dates=` — putting ISO dates in `q` seeds the picker
      href: qs("https://www.google.com/travel/search", {
        q: `Hotels in ${dest} from ${inDate} to ${outDate}`,
        dates: `${inDate},${outDate}`,
        adults,
      }),
    },
    {
      label: "Kayak",
      // Path keeps dates + guests; rooms when >1 (Kayak accepts /Nrooms)
      href: `https://www.kayak.com/hotels/${citySlug}/${inDate}/${outDate}/${adults}adults/${rooms}rooms?sort=rank_a`,
    },
    {
      label: "Hotels.com",
      // Hotel-Search (not legacy search.do) wants ISO on startDate/endDate + d1/d2
      href: qs("https://www.hotels.com/Hotel-Search", {
        destination: dest,
        startDate: inDate,
        endDate: outDate,
        d1: inDate,
        d2: outDate,
        adults,
        rooms,
        flexibility: "0_DAY",
        sort: "RECOMMENDED",
      }),
    },
    {
      label: "Expedia",
      href: qs("https://www.expedia.com/Hotel-Search", {
        destination: dest,
        startDate: inDate,
        endDate: outDate,
        d1: inDate,
        d2: outDate,
        InDate: inDate,
        OutDate: outDate,
        adults,
        rooms,
        flexibility: "0_DAY",
        sort: "RECOMMENDED",
        langid: 1033,
      }),
    },
    {
      label: "Agoda",
      // Needs numeric city id for dates to stick; go route resolves it at click-time.
      // Fallback: city-name search (dates may need a second confirm on Agoda).
      href: qs("https://www.agoda.com/search", {
        city: dest,
        checkIn: inDate,
        checkOut: outDate,
        los: nights,
        rooms,
        adults,
        children: 0,
        currencyCode: currency,
      }),
    },
    {
      label: "Vrbo",
      href: qs("https://www.vrbo.com/search", {
        destination: dest,
        startDate: inDate,
        endDate: outDate,
        d1: inDate,
        d2: outDate,
        adults,
        children: 0,
      }),
    },
  ];
}

/** Agoda only applies dates when `city` is a numeric ObjectId from suggest. */
export async function resolveAgodaCityId(
  city: string,
): Promise<number | null> {
  const text = city.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);

  const suggestUrl =
    `https://www.agoda.com/api/cronos/search/GetUnifiedSuggestResult/3/1/1/0/en-us/` +
    `?searchText=${encodeURIComponent(text)}&origin=US`;

  try {
    const res = await fetch(suggestUrl, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ViewModelList?: Array<{
        ObjectId?: number;
        CityId?: number;
        PageTypeId?: number;
        SearchType?: number;
        NoOfHotels?: number;
        IsDefault?: boolean;
        Name?: string;
      }>;
      ViewModels?: Array<{
        ObjectId?: number;
        CityId?: number;
        PageTypeId?: number;
        SearchType?: number;
        NoOfHotels?: number;
        IsDefault?: boolean;
        Name?: string;
      }>;
    };
    const views = data.ViewModelList || data.ViewModels || [];
    // Prefer city hits (PageTypeId 5 / SearchType 1), then most hotels
    const cities = views
      .filter(
        (v) =>
          (v.PageTypeId === 5 || v.SearchType === 1) &&
          Number(v.ObjectId || v.CityId) > 0,
      )
      .sort(
        (a, b) =>
          Number(b.NoOfHotels || 0) - Number(a.NoOfHotels || 0) ||
          Number(b.IsDefault) - Number(a.IsDefault),
      );
    const hit =
      cities[0] || views.find((v) => Number(v.ObjectId || v.CityId) > 0);
    const id = Number(hit?.ObjectId || hit?.CityId);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Filtered site search URLs from Waylo filters. */
export function buildAccommodationSiteLinks(
  input: AccommodationSearchInput,
): AccommodationSiteLink[] {
  const city = input.city.trim();
  const checkIn = normalizeIsoDate(input.checkIn);
  const checkOut = normalizeIsoDate(input.checkOut);
  const adults = parseGuestCount(input.adults);
  const rooms = resolveRoomCount(input.rooms, adults);
  const nights =
    checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 1;
  const budgetRaw = Number(input.budgetPerPersonNight);
  const budget = Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : 80;
  const currency = (input.currency || "EUR").toUpperCase().slice(0, 3);
  const roomBudget = Math.max(budget, budget * Math.min(adults, 2));

  if (!city || !checkIn || !checkOut) return [];

  return buildSiteUrls({
    destination: city,
    checkIn,
    checkOut,
    adults,
    rooms,
    nights,
    currency,
    stayBudget: roomBudget * nights,
  });
}

/** Resolve one site’s filtered search URL (used by /api/accommodation/go). */
export async function buildSiteSearchHref(
  siteLabel: string,
  input: AccommodationSearchInput,
): Promise<string | null> {
  const label = siteLabel.trim().toLowerCase();
  const links = buildAccommodationSiteLinks(input);
  const hit = links.find((l) => l.label.toLowerCase() === label);
  if (!hit) return null;

  // Agoda requires a numeric city ObjectId or dates are dropped.
  if (label === "agoda") {
    const cityId = await resolveAgodaCityId(input.city);
    if (cityId) {
      const checkIn = normalizeIsoDate(input.checkIn);
      const checkOut = normalizeIsoDate(input.checkOut);
      const adults = parseGuestCount(input.adults);
      const rooms = resolveRoomCount(input.rooms, adults);
      const nights =
        checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 1;
      const currency = (input.currency || "EUR").toUpperCase().slice(0, 3);
      return qs("https://www.agoda.com/search", {
        city: cityId,
        checkIn,
        checkOut,
        los: nights,
        rooms,
        adults,
        children: 0,
        currencyCode: currency,
      });
    }
  }

  return hit.href;
}

/** Client helper: Waylo redirect that rebuilds filters on every click. */
export function wayloSiteOpenPath(
  siteLabel: string,
  input: AccommodationSearchInput,
): string {
  const params = new URLSearchParams({
    site: siteLabel,
    city: input.city.trim(),
    checkIn: normalizeIsoDate(input.checkIn),
    checkOut: normalizeIsoDate(input.checkOut),
    adults: String(parseGuestCount(input.adults)),
    rooms: String(resolveRoomCount(input.rooms, input.adults)),
    currency: (input.currency || "EUR").toUpperCase().slice(0, 3),
    budget: String(
      Number.isFinite(Number(input.budgetPerPersonNight))
        ? Number(input.budgetPerPersonNight)
        : 80,
    ),
  });
  return `/api/accommodation/go?${params.toString()}`;
}

function asiaHint(city: string) {
  return /tokyo|osaka|kyoto|bangkok|singapore|seoul|taipei|hong kong|bali|jakarta|kuala|manila|hanoi|saigon|ho chi|phuket|chiang|beijing|shanghai|dubai|abu dhabi/i.test(
    city,
  );
}

/** Heuristic 1–10 fit scores for each booking site given Waylo filters. */
export function rankSitesHeuristic(
  input: AccommodationSearchInput,
  links: AccommodationSiteLink[],
): RankedBookingSite[] {
  const adults = parseGuestCount(input.adults);
  const budget = input.budgetPerPersonNight;
  const notes = (input.notes || "").toLowerCase();
  const city = input.city;
  const wantsApartment =
    /apartment|flat|kitchen|whole place|airbnb|house|cottage/i.test(notes);
  const wantsHotel = /hotel|resort|breakfast|spa|pool|stars/i.test(notes);
  const wantsBudget = budget < 60 || /budget|cheap|hostel|backpack/i.test(notes);
  const wantsPremium = budget > 180 || /luxury|boutique|suite/i.test(notes);
  const wantsTransit = (input.maxStationKm != null && input.maxStationKm > 0) ||
    /station|train|metro|transit/i.test(notes);
  const asia = asiaHint(city);
  const preferred = new Set(
    (input.preferredSites || []).map((s) => s.toLowerCase()),
  );
  const group = adults >= 4;

  const base: Record<
    string,
    { score: number; why: string; strengths: string[]; caveats: string[] }
  > = {
    "Booking.com": {
      score: 9,
      why: "Best deep-link support for your dates and guests; huge hotel inventory worldwide.",
      strengths: ["Reliable filters", "Hotels & apartments", "Free cancellation options"],
      caveats: ["Can be pricier than niche sites"],
    },
    Airbnb: {
      score: wantsApartment || group ? 9 : 7,
      why: wantsApartment || group
        ? "Strong fit for apartments / groups with your guest count and stay length."
        : "Good for homes and apartments; hotels are secondary.",
      strengths: ["Entire homes", "Kitchens", "Group stays"],
      caveats: ["Host rules vary", "Cleaning fees"],
    },
    "Google Hotels": {
      score: 8,
      why: "Meta-search across many sites using your city, dates and guests — great to compare.",
      strengths: ["Price comparison", "Map view", "Multiple providers"],
      caveats: ["You still book on a third-party site"],
    },
    Kayak: {
      score: 7,
      why: "Solid aggregator for hotels with your destination and dates pre-filled.",
      strengths: ["Compare deals", "Price alerts"],
      caveats: ["Redirects to partner sites to book"],
    },
    "Hotels.com": {
      score: wantsHotel ? 7 : 6,
      why: "Classic hotel inventory with your stay filters applied.",
      strengths: ["Loyalty rewards", "Hotel focus"],
      caveats: ["Weaker for private apartments"],
    },
    Expedia: {
      score: wantsPremium || wantsHotel ? 7 : 5,
      why: "Packages and hotels; useful if you may add flights or cars later.",
      strengths: ["Packages", "Hotels"],
      caveats: ["Deep links are less reliable than Booking"],
    },
    Agoda: {
      score: asia ? 9 : 5,
      why: asia
        ? "Often strong prices and inventory in Asia for your city and dates."
        : "Better known for Asia; still searchable for your filters.",
      strengths: asia ? ["Asia inventory", "Member deals"] : ["Global coverage"],
      caveats: asia ? [] : ["Usually better value in Asia"],
    },
    Vrbo: {
      score: wantsApartment || group ? 8 : 4,
      why: wantsApartment || group
        ? "Vacation homes that fit groups / longer stays with your guest count."
        : "Mostly holiday homes — less ideal for a simple hotel night.",
      strengths: ["Homes", "Families / groups"],
      caveats: ["Fewer city hotels"],
    },
  };

  return links
    .map((link) => {
      const meta = base[link.label] || {
        score: 5,
        why: "Searchable with your Waylo filters.",
        strengths: [] as string[],
        caveats: [] as string[],
      };
      let score = meta.score;

      if (wantsBudget && (link.label === "Airbnb" || link.label === "Agoda")) {
        score += 1;
      }
      if (wantsBudget && (link.label === "Expedia" || link.label === "Hotels.com")) {
        score -= 1;
      }
      if (wantsTransit && link.label === "Booking.com") score += 1;
      if (wantsTransit && link.label === "Google Hotels") score += 1;
      if (
        preferred.has(link.label.toLowerCase()) ||
        [...preferred].some((p) => link.label.toLowerCase().includes(p))
      ) {
        score += 1;
      }

      return {
        label: link.label,
        href: link.href,
        fit_score: clampScore(score),
        why_fit: meta.why,
        strengths: meta.strengths,
        caveats: meta.caveats,
      } satisfies RankedBookingSite;
    })
    .sort((a, b) => b.fit_score - a.fit_score || a.label.localeCompare(b.label));
}

function isRankedSite(value: unknown): value is RankedBookingSite {
  if (!value || typeof value !== "object") return false;
  const v = value as RankedBookingSite;
  return (
    typeof v.label === "string" &&
    typeof v.href === "string" &&
    typeof v.fit_score === "number"
  );
}

/** Normalize saved results into ranked sites (rebuilds hrefs from current filters). */
export function normalizeRankedSites(
  results: AccommodationSearch["results"] | null | undefined,
  input: AccommodationSearchInput,
): RankedBookingSite[] {
  const links = buildAccommodationSiteLinks(input);
  const fresh = rankSitesHeuristic(input, links);
  const byLabel = new Map(
    (results || []).filter(isRankedSite).map((r) => [r.label, r] as const),
  );

  // Prefer fresh hrefs; keep AI/heuristic why text from saved rank when present
  return fresh
    .map((site) => {
      const saved = byLabel.get(site.label);
      if (!saved) return site;
      return {
        ...site,
        fit_score: clampScore(saved.fit_score || site.fit_score),
        why_fit: saved.why_fit || site.why_fit,
        strengths: saved.strengths?.length ? saved.strengths : site.strengths,
        caveats: saved.caveats?.length ? saved.caveats : site.caveats,
      };
    })
    .sort((a, b) => b.fit_score - a.fit_score || a.label.localeCompare(b.label));
}

async function refineRanksWithAI(
  input: AccommodationSearchInput,
  ranked: RankedBookingSite[],
): Promise<{ summary: string; ranked: RankedBookingSite[] }> {
  const key = process.env.GEMINI_API_KEY;
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const labels = ranked.map((r) => r.label);

  if (!key) {
    return {
      summary: `Sites ranked for ${input.city} · ${input.checkIn} → ${input.checkOut} · ${parseGuestCount(input.adults)} guests · ${resolveRoomCount(input.rooms, input.adults)} room(s) · ${input.budgetPerPersonNight} ${input.currency || "EUR"}/person/night. Open a site to search with your filters applied.`,
      ranked,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const prompt = `You rank booking WEBSITES (not hotels) for a trip. Score each site 1-10 for how well it fits these filters.

Filters:
- City: ${input.city}
- Dates: ${input.checkIn} → ${input.checkOut} (${nights} nights)
- Guests: ${parseGuestCount(input.adults)}
- Rooms: ${resolveRoomCount(input.rooms, input.adults)}
- Budget per person per night: ${input.budgetPerPersonNight} ${input.currency || "EUR"}
- Max km to train station: ${input.maxStationKm ?? "not set"}
- Notes: ${input.notes || "none"}
- Sites to score (only these labels): ${JSON.stringify(labels)}

Return ONLY JSON:
{
  "summary": string,
  "sites": [
    { "label": string, "fit_score": number, "why_fit": string, "strengths": string[], "caveats": string[] }
  ]
}

Rules:
- fit_score must be integer 1-10
- Include every label from the list exactly once
- Prefer sites that match destination region, budget, group size, and notes
- Do not invent hotel names`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { summary: "", ranked };

    const parsed = JSON.parse(match[0]) as {
      summary?: string;
      sites?: Array<{
        label?: string;
        fit_score?: number;
        why_fit?: string;
        strengths?: string[];
        caveats?: string[];
      }>;
    };

    const aiByLabel = new Map(
      (parsed.sites || [])
        .filter((s) => s.label)
        .map((s) => [String(s.label), s] as const),
    );

    const merged = ranked
      .map((site) => {
        const ai = aiByLabel.get(site.label);
        if (!ai) return site;
        return {
          ...site,
          fit_score: clampScore(Number(ai.fit_score) || site.fit_score),
          why_fit: String(ai.why_fit || site.why_fit),
          strengths: ai.strengths?.length
            ? ai.strengths.map(String)
            : site.strengths,
          caveats: ai.caveats?.length ? ai.caveats.map(String) : site.caveats,
        };
      })
      .sort(
        (a, b) => b.fit_score - a.fit_score || a.label.localeCompare(b.label),
      );

    return {
      summary:
        parsed.summary ||
        `Best sites for ${input.city} with your filters — open any link to search with dates and guests filled in.`,
      ranked: merged,
    };
  } catch {
    return { summary: "", ranked };
  }
}

export async function searchAccommodationsWithAI(
  input: AccommodationSearchInput,
): Promise<{
  summary: string;
  results: RankedBookingSite[];
  site_links: AccommodationSiteLink[];
}> {
  const site_links = buildAccommodationSiteLinks(input);
  const heuristic = rankSitesHeuristic(input, site_links);
  const refined = await refineRanksWithAI(input, heuristic);

  return {
    summary:
      refined.summary ||
      `Sites ranked best → worst for ${input.city}. Each link opens with your Waylo filters applied.`,
    results: refined.ranked,
    site_links: refined.ranked.map((r) => ({ label: r.label, href: r.href })),
  };
}

export type SavedAccommodationSearch = AccommodationSearch;
