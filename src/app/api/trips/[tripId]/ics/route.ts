import { NextResponse } from "next/server";
import { buildTripIcs } from "@/lib/export-ics";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingDeadline,
  ItineraryItem,
  TravelSegment,
  Trip,
} from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await context.params;
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
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: trip }, { data: segments }, { data: itinerary }, { data: deadlines }] =
    await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("travel_segments").select("*").eq("trip_id", tripId),
      supabase.from("itinerary_items").select("*").eq("trip_id", tripId),
      supabase.from("booking_deadlines").select("*").eq("trip_id", tripId),
    ]);

  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ics = buildTripIcs({
    trip: trip as Trip,
    segments: (segments || []) as TravelSegment[],
    itinerary: (itinerary || []) as ItineraryItem[],
    deadlines: (deadlines || []) as BookingDeadline[],
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="waylo-${tripId}.ics"`,
    },
  });
}
