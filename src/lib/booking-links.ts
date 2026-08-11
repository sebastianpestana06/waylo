import type { BookingPrefs, LinkedAccount, TravelSegment } from "./types";
import { KNOWN_SITES } from "./linked-accounts";

function encode(s: string) {
  return encodeURIComponent(s);
}

function knownKey(account: LinkedAccount) {
  return (
    KNOWN_SITES[account.hostname] ||
    KNOWN_SITES[account.provider] ||
    KNOWN_SITES[`www.${account.provider}`]
  );
}

export function bookingDeepLinks(
  segment: TravelSegment,
  prefs: BookingPrefs = {},
  linkedAccounts: LinkedAccount[] = [],
) {
  const from = encode(segment.from_place);
  const to = encode(segment.to_place);
  const date = segment.depart_at
    ? segment.depart_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const links: { label: string; href: string }[] = [];
  const seen = new Set<string>();

  const push = (label: string, href: string) => {
    const key = `${label}|${href}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ label, href });
  };

  const linked = linkedAccounts.filter(
    (a) => a.status === "linked" && a.enabled !== false,
  );

  // Prefer explicit linked services
  if (linked.length) {
    for (const account of linked) {
      const known = knownKey(account)?.providerKey;
      if (known === "skyscanner" && segment.mode === "plane") {
        push(
          account.label,
          `https://www.skyscanner.net/transport/flights/${from}/${to}/${date.replace(/-/g, "")}/`,
        );
      } else if (known === "booking") {
        push(
          account.label,
          `https://www.booking.com/searchresults.html?ss=${to}&checkin=${date}`,
        );
      } else if (known === "agoda") {
        push(
          account.label,
          `https://www.agoda.com/search?city=${to}&checkIn=${date}`,
        );
      } else {
        push(account.label, account.siteUrl);
      }
    }
    return links;
  }

  // Fallback to legacy prefs when nothing linked yet
  if (prefs.skyscanner !== false && segment.mode === "plane") {
    push(
      "Skyscanner",
      `https://www.skyscanner.net/transport/flights/${from}/${to}/${date.replace(/-/g, "")}/`,
    );
  }

  if (prefs.booking !== false) {
    push(
      "Booking.com",
      `https://www.booking.com/searchresults.html?ss=${to}&checkin=${date}`,
    );
  }

  if (prefs.agoda) {
    push("Agoda", `https://www.agoda.com/search?city=${to}&checkIn=${date}`);
  }

  return links;
}
