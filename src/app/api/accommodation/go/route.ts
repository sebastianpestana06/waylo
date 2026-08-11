import { NextResponse } from "next/server";
import {
  buildSiteSearchHref,
  normalizeIsoDate,
  parseGuestCount,
  parseRoomCount,
} from "@/lib/accommodation-search";

/**
 * Click-time redirect: rebuilds the OTA search URL from Waylo filters
 * so dates/guests/city are never stale or mangled.
 *
 * Example:
 * /api/accommodation/go?site=Booking.com&city=Paris&checkIn=2026-09-01&checkOut=2026-09-05&adults=3&rooms=2&currency=EUR&budget=80
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = String(url.searchParams.get("site") || "").trim();
  const city = String(url.searchParams.get("city") || "").trim();
  const checkIn = normalizeIsoDate(url.searchParams.get("checkIn"));
  const checkOut = normalizeIsoDate(url.searchParams.get("checkOut"));
  const adults = parseGuestCount(url.searchParams.get("adults"));
  const rooms = parseRoomCount(
    url.searchParams.get("rooms"),
    Math.max(1, Math.ceil(adults / 2)),
  );
  const currency = String(url.searchParams.get("currency") || "EUR")
    .toUpperCase()
    .slice(0, 3);
  const budgetRaw = Number(url.searchParams.get("budget"));
  const budget =
    Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : 80;

  if (!site || !city || !checkIn || !checkOut) {
    return NextResponse.json(
      {
        error:
          "Missing site, city, checkIn, or checkOut. Open a ranked site from Stay again.",
      },
      { status: 400 },
    );
  }
  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "checkOut must be after checkIn." },
      { status: 400 },
    );
  }

  const href = await buildSiteSearchHref(site, {
    city,
    checkIn,
    checkOut,
    adults,
    rooms,
    currency,
    budgetPerPersonNight: budget,
  });

  if (!href) {
    return NextResponse.json(
      { error: `Unknown site: ${site}` },
      { status: 404 },
    );
  }

  return NextResponse.redirect(href, 302);
}
