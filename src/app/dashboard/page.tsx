import Link from "next/link";
import { redirect } from "next/navigation";
import { ReminderBanner } from "@/components/ReminderBanner";
import { buildReminders } from "@/lib/alerts";
import { createTrip, signOut } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { TRIP_TEMPLATES } from "@/lib/templates";
import type {
  BookingDeadline,
  ExpensePayment,
  Passport,
  TravelSegment,
  Trip,
} from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("trip_members")
    .select("trip_id, role, trips(*)")
    .eq("user_id", user.id);

  const trips = (memberships || [])
    .map((m) => m.trips as unknown as Trip)
    .filter(Boolean);

  const tripIds = trips.map((t) => t.id);

  let deadlines: BookingDeadline[] = [];
  let payments: ExpensePayment[] = [];
  let passports: Passport[] = [];
  const segmentsByTrip: Record<string, TravelSegment[]> = {};

  if (tripIds.length) {
    const [d, p, s, pass] = await Promise.all([
      supabase.from("booking_deadlines").select("*").in("trip_id", tripIds),
      supabase
        .from("expense_payments")
        .select("*, expense_shares(*)")
        .in("trip_id", tripIds),
      supabase.from("travel_segments").select("*").in("trip_id", tripIds),
      supabase.from("passports").select("*").eq("user_id", user.id),
    ]);
    deadlines = (d.data || []) as BookingDeadline[];
    payments = (p.data || []) as ExpensePayment[];
    passports = (pass.data || []) as Passport[];
    for (const seg of (s.data || []) as TravelSegment[]) {
      segmentsByTrip[seg.trip_id] = segmentsByTrip[seg.trip_id] || [];
      segmentsByTrip[seg.trip_id].push(seg);
    }

    const creatorIds = [
      ...new Set(payments.map((pay) => pay.created_by).filter(Boolean)),
    ];
    if (creatorIds.length) {
      const { data: creators } = await supabase
        .from("profiles")
        .select("*")
        .in("id", creatorIds);
      const map = Object.fromEntries(
        (creators || []).map((c) => [c.id, c]),
      );
      payments = payments.map((pay) => ({
        ...pay,
        creator: map[pay.created_by],
      }));
    }
  }

  const reminders = buildReminders({
    trips,
    deadlines,
    payments,
    segmentsByTrip,
    passports,
    userId: user.id,
  });

  return (
    <>
      <ReminderBanner items={reminders} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-sea">
              Your trips
            </p>
            <h1 className="font-display text-4xl">On the way</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/settings" className="btn btn-ghost">
              Account
            </Link>
            <form action={signOut}>
              <button className="btn btn-ghost" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="panel transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs uppercase tracking-wide text-ink-soft">
                {trip.status}
              </p>
              <h2 className="font-display mt-1 text-2xl">{trip.title}</h2>
              <p className="mt-2 text-sm text-ink-soft">
                {(trip.destinations || []).join(" · ") || "Destinations TBD"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {trip.start_date || "?"} → {trip.end_date || "?"}
              </p>
            </Link>
          ))}
          {trips.length === 0 && (
            <div className="panel sm:col-span-2">
              <p className="text-ink-soft">
                No trips yet — create one below or join via an invite link.
              </p>
            </div>
          )}
        </section>

        <section className="panel mt-10 space-y-3">
          <h2 className="font-display text-2xl">Start a trip</h2>
          <form action={createTrip} className="space-y-3">
            <input
              name="title"
              className="field"
              placeholder="Trip title (optional if using template)"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="start_date" type="date" className="field" />
              <input name="end_date" type="date" className="field" />
            </div>
            <input
              name="destinations"
              className="field"
              placeholder="Destinations (comma-separated)"
            />
            <select name="template_key" className="field" defaultValue="blank">
              {TRIP_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  Template: {t.title}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              Create trip
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
