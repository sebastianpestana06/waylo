import type { BookingPrefs, TravelSegment } from "./types";

function encode(s: string) {
  return encodeURIComponent(s);
}

export function bookingDeepLinks(
  segment: TravelSegment,
  prefs: BookingPrefs = {},
) {
  const from = encode(segment.from_place);
  const to = encode(segment.to_place);
  const date = segment.depart_at
    ? segment.depart_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const links: { label: string; href: string }[] = [];

  if (prefs.skyscanner !== false && segment.mode === "plane") {
    links.push({
      label: "Skyscanner",
      href: `https://www.skyscanner.net/transport/flights/${from}/${to}/${date.replace(/-/g, "")}/`,
    });
  }

  if (prefs.booking !== false) {
    links.push({
      label: "Booking.com",
      href: `https://www.booking.com/searchresults.html?ss=${to}&checkin=${date}`,
    });
  }

  if (prefs.agoda) {
    links.push({
      label: "Agoda",
      href: `https://www.agoda.com/search?city=${to}&checkIn=${date}`,
    });
  }

  return links;
}
