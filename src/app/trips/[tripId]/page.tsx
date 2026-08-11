import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReminderBanner } from "@/components/ReminderBanner";
import { TripAssistant } from "@/components/TripAssistant";
import { buildReminders } from "@/lib/alerts";
import { detectSegmentConflicts } from "@/lib/conflicts";
import { passportValidForTrip } from "@/lib/passport";
import { createClient } from "@/lib/supabase/server";
import { fetchWeatherForDestinations } from "@/lib/weather";
import { formatTripLocations, tripPlaces } from "@/lib/locations";
import type {
  BookingDeadline,
  ExpensePayment,
  Passport,
  TravelSegment,
  Trip,
} from "@/lib/types";

export default async function TripOverviewPage({
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

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();
  if (!trip) notFound();
  const t = trip as Trip;

  const [segmentsRes, deadlinesRes, paymentsRes, passportsRes] =
    await Promise.all([
      supabase.from("travel_segments").select("*").eq("trip_id", tripId),
      supabase.from("booking_deadlines").select("*").eq("trip_id", tripId),
      supabase
        .from("expense_payments")
        .select("*, expense_shares(*)")
        .eq("trip_id", tripId),
      supabase.from("passports").select("*").eq("user_id", user.id),
    ]);

  const segments = (segmentsRes.data || []) as TravelSegment[];
  const deadlines = (deadlinesRes.data || []) as BookingDeadline[];
  let payments = (paymentsRes.data || []) as ExpensePayment[];
  const passports = (passportsRes.data || []) as Passport[];

  const creatorIds = [
    ...new Set(payments.map((pay) => pay.created_by).filter(Boolean)),
  ];
  if (creatorIds.length) {
    const { data: creators } = await supabase
      .from("profiles")
      .select("*")
      .in("id", creatorIds);
    const map = Object.fromEntries((creators || []).map((c) => [c.id, c]));
    payments = payments.map((pay) => ({
      ...pay,
      creator: map[pay.created_by],
    }));
  }
  const reminders = buildReminders({
    trips: [t],
    deadlines,
    payments,
    segmentsByTrip: { [tripId]: segments },
    passports,
    userId: user.id,
  });

  const conflicts = detectSegmentConflicts(segments);
  const passportAlerts = passports
    .map((p) => ({ p, check: passportValidForTrip(p.expiry_date, t.end_date) }))
    .filter((x) => !x.check.ok);

  const weatherSnapshots = await fetchWeatherForDestinations(
    tripPlaces(t),
    t.start_date,
    t.end_date,
  );

  return (
    <>
      <ReminderBanner items={reminders} />
      <div className="space-y-4 animate-fade">
        <section className="panel">
          <p className="text-sm text-ink-soft">Holiday window</p>
          <p className="font-display text-3xl">
            {t.start_date || "TBD"} → {t.end_date || "TBD"}
          </p>
          <p className="mt-2 text-ink-soft">
            {formatTripLocations(t) || "Add countries & cities when creating a trip"}
          </p>
        </section>

        <TripAssistant tripId={tripId} />

        {weatherSnapshots.length > 0 && (
          <section className="panel">
            <h2 className="font-display text-xl">Weather snapshot</h2>
            <ul className="mt-3 space-y-2">
              {weatherSnapshots.map((w) => (
                <li
                  key={w.place}
                  className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-line/50"
                >
                  <p className="font-semibold">{w.place}</p>
                  <p className="text-sm text-ink-soft">{w.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {passportAlerts.length > 0 && (
          <section className="panel border-coral/40 bg-coral/5">
            <h2 className="font-display text-xl text-coral">Passport alert</h2>
            {passportAlerts.map(({ p, check }) => (
              <p key={p.id} className="mt-2 text-sm">
                Your {p.issuing_country} passport should be valid until at least{" "}
                {check.requiredUntil} (9 months after trip end). Consider
                renewing before you go.
              </p>
            ))}
            <Link href="/settings" className="btn btn-ghost mt-3 text-xs">
              Open settings
            </Link>
          </section>
        )}

        {conflicts.length > 0 && (
          <section className="panel">
            <h2 className="font-display text-xl">Schedule conflicts</h2>
            <ul className="mt-2 space-y-1 text-sm text-coral">
              {conflicts.map((c) => (
                <li key={`${c.aId}-${c.bId}`}>{c.message}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Link href={`/trips/${tripId}/calendar`} className="panel">
            <p className="font-semibold">Calendar</p>
            <p className="text-sm text-ink-soft">
              {segments.length} travel legs
            </p>
          </Link>
          <Link href={`/trips/${tripId}/plan`} className="panel">
            <p className="font-semibold">Plan</p>
            <p className="text-sm text-ink-soft">Checklist & itinerary</p>
          </Link>
          <Link href={`/trips/${tripId}/money`} className="panel">
            <p className="font-semibold">Money</p>
            <p className="text-sm text-ink-soft">
              {payments.length} payment entries
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}
