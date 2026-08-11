export type ServiceFeature =
  | "hotels"
  | "flights"
  | "cars"
  | "trains"
  | "activities"
  | "packages"
  | "ferries"
  | "insurance";

export const SERVICE_FEATURES: {
  id: ServiceFeature;
  label: string;
}[] = [
  { id: "hotels", label: "Hotels & stays" },
  { id: "flights", label: "Flights" },
  { id: "cars", label: "Car rental" },
  { id: "trains", label: "Trains" },
  { id: "ferries", label: "Ferries" },
  { id: "activities", label: "Activities & tours" },
  { id: "packages", label: "Holiday packages" },
  { id: "insurance", label: "Travel insurance" },
];

export type PopularSite = {
  id: string;
  label: string;
  url: string;
  features: ServiceFeature[];
};

/** Popular travel sites — keep labels unique; list is sorted A–Z at runtime. */
export const POPULAR_TRAVEL_SITES: PopularSite[] = [
  // Hotels & stays
  {
    id: "agoda",
    label: "Agoda",
    url: "https://www.agoda.com",
    features: ["hotels", "packages"],
  },
  {
    id: "airbnb",
    label: "Airbnb",
    url: "https://www.airbnb.com",
    features: ["hotels"],
  },
  {
    id: "booking",
    label: "Booking.com",
    url: "https://www.booking.com",
    features: ["hotels", "packages", "cars", "flights"],
  },
  {
    id: "expedia",
    label: "Expedia",
    url: "https://www.expedia.com",
    features: ["hotels", "flights", "cars", "packages", "activities"],
  },
  {
    id: "hotelscom",
    label: "Hotels.com",
    url: "https://www.hotels.com",
    features: ["hotels"],
  },
  {
    id: "hostelworld",
    label: "Hostelworld",
    url: "https://www.hostelworld.com",
    features: ["hotels"],
  },
  {
    id: "hotwire",
    label: "Hotwire",
    url: "https://www.hotwire.com",
    features: ["hotels", "cars", "flights"],
  },
  {
    id: "vrbo",
    label: "Vrbo",
    url: "https://www.vrbo.com",
    features: ["hotels"],
  },
  {
    id: "tripadvisor",
    label: "Tripadvisor",
    url: "https://www.tripadvisor.com",
    features: ["hotels", "activities", "flights"],
  },
  {
    id: "trivago",
    label: "Trivago",
    url: "https://www.trivago.com",
    features: ["hotels"],
  },
  {
    id: "kayak",
    label: "Kayak",
    url: "https://www.kayak.com",
    features: ["hotels", "flights", "cars", "packages"],
  },
  {
    id: "priceline",
    label: "Priceline",
    url: "https://www.priceline.com",
    features: ["hotels", "flights", "cars"],
  },
  {
    id: "travelocity",
    label: "Travelocity",
    url: "https://www.travelocity.com",
    features: ["hotels", "flights", "cars", "packages"],
  },
  {
    id: "orbitz",
    label: "Orbitz",
    url: "https://www.orbitz.com",
    features: ["hotels", "flights", "cars"],
  },
  {
    id: "marriott",
    label: "Marriott Bonvoy",
    url: "https://www.marriott.com",
    features: ["hotels"],
  },
  {
    id: "hilton",
    label: "Hilton Honors",
    url: "https://www.hilton.com",
    features: ["hotels"],
  },
  {
    id: "ihg",
    label: "IHG One Rewards",
    url: "https://www.ihg.com",
    features: ["hotels"],
  },
  {
    id: "accor",
    label: "Accor All",
    url: "https://all.accor.com",
    features: ["hotels"],
  },

  // Flights
  {
    id: "skyscanner",
    label: "Skyscanner",
    url: "https://www.skyscanner.net",
    features: ["flights", "hotels", "cars"],
  },
  {
    id: "googleflights",
    label: "Google Flights",
    url: "https://www.google.com/travel/flights",
    features: ["flights"],
  },
  {
    id: "momondo",
    label: "Momondo",
    url: "https://www.momondo.com",
    features: ["flights", "hotels"],
  },
  {
    id: "kiwi",
    label: "Kiwi.com",
    url: "https://www.kiwi.com",
    features: ["flights"],
  },
  {
    id: "cheapflights",
    label: "Cheapflights",
    url: "https://www.cheapflights.com",
    features: ["flights"],
  },
  {
    id: "flightaware",
    label: "FlightAware",
    url: "https://www.flightaware.com",
    features: ["flights"],
  },
  {
    id: "emirates",
    label: "Emirates",
    url: "https://www.emirates.com",
    features: ["flights"],
  },
  {
    id: "klm",
    label: "KLM",
    url: "https://www.klm.com",
    features: ["flights"],
  },
  {
    id: "britishairways",
    label: "British Airways",
    url: "https://www.britishairways.com",
    features: ["flights"],
  },
  {
    id: "ryanair",
    label: "Ryanair",
    url: "https://www.ryanair.com",
    features: ["flights"],
  },
  {
    id: "easyjet",
    label: "easyJet",
    url: "https://www.easyjet.com",
    features: ["flights"],
  },
  {
    id: "lufthansa",
    label: "Lufthansa",
    url: "https://www.lufthansa.com",
    features: ["flights"],
  },
  {
    id: "delta",
    label: "Delta",
    url: "https://www.delta.com",
    features: ["flights"],
  },
  {
    id: "united",
    label: "United",
    url: "https://www.united.com",
    features: ["flights"],
  },
  {
    id: "americanairlines",
    label: "American Airlines",
    url: "https://www.aa.com",
    features: ["flights"],
  },

  // Cars
  {
    id: "rentalcars",
    label: "Rentalcars.com",
    url: "https://www.rentalcars.com",
    features: ["cars"],
  },
  {
    id: "hertz",
    label: "Hertz",
    url: "https://www.hertz.com",
    features: ["cars"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    url: "https://www.enterprise.com",
    features: ["cars"],
  },
  {
    id: "avis",
    label: "Avis",
    url: "https://www.avis.com",
    features: ["cars"],
  },
  {
    id: "budget",
    label: "Budget",
    url: "https://www.budget.com",
    features: ["cars"],
  },
  {
    id: "sixt",
    label: "Sixt",
    url: "https://www.sixt.com",
    features: ["cars"],
  },
  {
    id: "discovercars",
    label: "DiscoverCars",
    url: "https://www.discovercars.com",
    features: ["cars"],
  },
  {
    id: "turo",
    label: "Turo",
    url: "https://turo.com",
    features: ["cars"],
  },

  // Trains
  {
    id: "trainline",
    label: "Trainline",
    url: "https://www.thetrainline.com",
    features: ["trains"],
  },
  {
    id: "raileurope",
    label: "Rail Europe",
    url: "https://www.raileurope.com",
    features: ["trains"],
  },
  {
    id: "omio",
    label: "Omio",
    url: "https://www.omio.com",
    features: ["trains", "flights"],
  },
  {
    id: "ns",
    label: "NS (Netherlands)",
    url: "https://www.ns.nl",
    features: ["trains"],
  },
  {
    id: "sncf",
    label: "SNCF Connect",
    url: "https://www.sncf-connect.com",
    features: ["trains"],
  },
  {
    id: "db",
    label: "Deutsche Bahn",
    url: "https://www.bahn.com",
    features: ["trains"],
  },
  {
    id: "eurostar",
    label: "Eurostar",
    url: "https://www.eurostar.com",
    features: ["trains"],
  },
  {
    id: "italo",
    label: "Italo",
    url: "https://www.italotreno.com",
    features: ["trains"],
  },
  {
    id: "renfe",
    label: "Renfe",
    url: "https://www.renfe.com",
    features: ["trains"],
  },

  // Ferries
  {
    id: "directferries",
    label: "Direct Ferries",
    url: "https://www.directferries.com",
    features: ["ferries"],
  },
  {
    id: "ferryhopper",
    label: "Ferryhopper",
    url: "https://www.ferryhopper.com",
    features: ["ferries"],
  },
  {
    id: "dfds",
    label: "DFDS",
    url: "https://www.dfds.com",
    features: ["ferries"],
  },
  {
    id: "stenaline",
    label: "Stena Line",
    url: "https://www.stenaline.com",
    features: ["ferries"],
  },

  // Activities
  {
    id: "getyourguide",
    label: "GetYourGuide",
    url: "https://www.getyourguide.com",
    features: ["activities"],
  },
  {
    id: "viator",
    label: "Viator",
    url: "https://www.viator.com",
    features: ["activities"],
  },
  {
    id: "klook",
    label: "Klook",
    url: "https://www.klook.com",
    features: ["activities", "hotels"],
  },
  {
    id: "tiqets",
    label: "Tiqets",
    url: "https://www.tiqets.com",
    features: ["activities"],
  },
  {
    id: "musement",
    label: "Musement",
    url: "https://www.musement.com",
    features: ["activities"],
  },
  {
    id: "civitatis",
    label: "Civitatis",
    url: "https://www.civitatis.com",
    features: ["activities"],
  },

  // Packages
  {
    id: "tui",
    label: "TUI",
    url: "https://www.tui.com",
    features: ["packages", "hotels", "flights"],
  },
  {
    id: "jet2holidays",
    label: "Jet2Holidays",
    url: "https://www.jet2holidays.com",
    features: ["packages"],
  },
  {
    id: "lastminute",
    label: "lastminute.com",
    url: "https://www.lastminute.com",
    features: ["packages", "hotels", "flights"],
  },
  {
    id: "trailfinders",
    label: "Trailfinders",
    url: "https://www.trailfinders.com",
    features: ["packages"],
  },

  // Insurance
  {
    id: "worldnomads",
    label: "World Nomads",
    url: "https://www.worldnomads.com",
    features: ["insurance"],
  },
  {
    id: "allianz",
    label: "Allianz Travel",
    url: "https://www.allianztravelinsurance.com",
    features: ["insurance"],
  },
  {
    id: "safetywing",
    label: "SafetyWing",
    url: "https://safetywing.com",
    features: ["insurance"],
  },
  {
    id: "heymondo",
    label: "Heymondo",
    url: "https://heymondo.com",
    features: ["insurance"],
  },
];

export function sitesForFeature(
  feature: ServiceFeature | "all",
  query = "",
): PopularSite[] {
  const q = query.trim().toLowerCase();
  return POPULAR_TRAVEL_SITES.filter((site) => {
    if (feature !== "all" && !site.features.includes(feature)) return false;
    if (!q) return true;
    return (
      site.label.toLowerCase().includes(q) ||
      site.url.toLowerCase().includes(q) ||
      site.id.includes(q)
    );
  }).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}
