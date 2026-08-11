import { NextResponse } from "next/server";
import {
  normalizeIsoDate,
  parseGuestCount,
  parseRoomCount,
  searchAccommodationsWithAI,
} from "@/lib/accommodation-search";
import { normalizeLinkedAccounts } from "@/lib/linked-accounts";
import { createClient } from "@/lib/supabase/server";
import type { Memberships } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();

  if (!member || (member.role !== "owner" && member.role !== "editor")) {
    return NextResponse.json(
      { error: "Only editors can run accommodation search." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    city?: string;
    checkIn?: string;
    checkOut?: string;
    maxStationKm?: number | null;
    budgetPerPersonNight?: number;
    currency?: string;
    adults?: number;
    rooms?: number;
    notes?: string;
  };

  const city = String(body.city || "").trim();
  const checkIn = normalizeIsoDate(body.checkIn);
  const checkOut = normalizeIsoDate(body.checkOut);
  const budget = Number(body.budgetPerPersonNight);
  const adults = parseGuestCount(
    body.adults ?? (body as { guestCount?: number }).guestCount,
  );
  const rooms = parseRoomCount(body.rooms, Math.max(1, Math.ceil(adults / 2)));
  const currency = String(body.currency || "EUR").toUpperCase().slice(0, 3);
  const maxStationKm =
    body.maxStationKm == null || body.maxStationKm === ("" as never)
      ? null
      : Number(body.maxStationKm);
  const notes = String(body.notes || "").trim();

  if (!city || !checkIn || !checkOut || !Number.isFinite(budget) || budget <= 0) {
    return NextResponse.json(
      { error: "City, dates, and a positive budget are required." },
      { status: 400 },
    );
  }
  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "Departure must be after arrival." },
      { status: 400 },
    );
  }
  if (
    maxStationKm != null &&
    (!Number.isFinite(maxStationKm) || maxStationKm < 0)
  ) {
    return NextResponse.json(
      { error: "Station distance must be a positive number." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("memberships")
    .eq("id", user.id)
    .single();
  const linked = normalizeLinkedAccounts(
    (profile?.memberships || {}) as Memberships,
  )
    .filter((a) => a.status === "linked")
    .map((a) => a.label || a.provider);

  const found = await searchAccommodationsWithAI({
    city,
    checkIn,
    checkOut,
    maxStationKm,
    budgetPerPersonNight: budget,
    currency,
    adults,
    rooms,
    notes,
    preferredSites: linked,
  });

  const row = {
    trip_id: tripId,
    created_by: user.id,
    city,
    check_in: checkIn,
    check_out: checkOut,
    max_station_km: maxStationKm,
    budget_per_person_night: budget,
    currency,
    adults,
    rooms,
    notes: notes || null,
    ai_summary: found.summary,
    site_links: found.site_links,
    results: found.results,
  };

  const { data: saved, error } = await supabase
    .from("accommodation_searches")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    // Retry without rooms if column isn't migrated yet
    if (/rooms/i.test(error.message) || error.code === "42703") {
      const { rooms: _rooms, ...withoutRooms } = row;
      void _rooms;
      const retry = await supabase
        .from("accommodation_searches")
        .insert(withoutRooms)
        .select("*")
        .single();
      if (!retry.error && retry.data) {
        return NextResponse.json({
          warning:
            "Run supabase/migrate_accommodation_rooms.sql to persist room count.",
          search: { ...retry.data, rooms },
        });
      }
    }
    // Still return results if table isn't migrated yet
    return NextResponse.json({
      warning:
        error.message.includes("accommodation_searches") ||
        error.code === "42P01"
          ? "Run supabase/migrate_accommodation.sql in Supabase to save searches."
          : error.message,
      search: {
        id: "ephemeral",
        ...row,
        created_at: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({ search: saved });
}
