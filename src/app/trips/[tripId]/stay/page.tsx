import { notFound, redirect } from "next/navigation";
import { AccommodationSearchPanel } from "@/components/AccommodationSearchPanel";
import { BookedStaysPanel } from "@/components/BookedStaysPanel";
import { tripCities } from "@/lib/locations";
import { createClient } from "@/lib/supabase/server";
import type { AccommodationSearch, BookedStay, Trip } from "@/lib/types";

export default async function AccommodationPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: member },
    { data: trip },
    searchesRes,
    bookedRes,
    { data: members },
  ] = await Promise.all([
    supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase
      .from("accommodation_searches")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("booked_stays")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
    supabase.from("trip_members").select("user_id").eq("trip_id", tripId),
  ]);

  if (!member || !trip) notFound();
  const t = trip as Trip;
  const canEdit = member.role === "owner" || member.role === "editor";
  const cities = tripCities(t);
  const defaultCity = cities[0] || "";
  const adultCount = Math.max(1, (members || []).length || 1);

  const initialSearches = (searchesRes.data || []) as AccommodationSearch[];
  const bookedStays = (bookedRes.data || []) as BookedStay[];

  const missingTables =
    (searchesRes.error &&
      (searchesRes.error.message.includes("accommodation_searches") ||
        searchesRes.error.code === "42P01" ||
        searchesRes.error.code === "PGRST205")) ||
    (bookedRes.error &&
      (bookedRes.error.message.includes("booked_stays") ||
        bookedRes.error.code === "42P01" ||
        bookedRes.error.code === "PGRST205"));

  return (
    <div className="space-y-4">
      {missingTables ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Run <code>supabase/migrate_accommodation.sql</code> (and{" "}
          <code>supabase/migrate_booked_stays.sql</code> /{" "}
          <code>migrate_accommodation_rooms.sql</code> if needed) in the
          Supabase SQL editor so Stay searches and booked stays can be saved.
        </p>
      ) : null}

      <BookedStaysPanel
        tripId={tripId}
        canEdit={canEdit}
        initialStays={bookedStays}
        defaultCity={defaultCity}
        defaultCheckIn={t.start_date || ""}
        defaultCheckOut={t.end_date || ""}
      />

      <AccommodationSearchPanel
        tripId={tripId}
        canEdit={canEdit}
        defaultCity={defaultCity}
        defaultCheckIn={t.start_date || ""}
        defaultCheckOut={t.end_date || ""}
        defaultAdults={adultCount}
        initialSearches={initialSearches}
      />
    </div>
  );
}
