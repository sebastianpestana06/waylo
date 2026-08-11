import { notFound, redirect } from "next/navigation";
import { TripCalendar } from "@/components/TripCalendar";
import { addDeadline, addSegment, toggleDeadline } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingDeadline,
  BookingPrefs,
  TravelSegment,
  Trip,
} from "@/lib/types";

export default async function CalendarPage({
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

  const [{ data: trip }, { data: segments }, { data: deadlines }, { data: profile }, { data: member }] =
    await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase
        .from("travel_segments")
        .select("*")
        .eq("trip_id", tripId)
        .order("depart_at"),
      supabase
        .from("booking_deadlines")
        .select("*")
        .eq("trip_id", tripId)
        .order("due_date"),
      supabase.from("profiles").select("booking_prefs").eq("id", user.id).single(),
      supabase
        .from("trip_members")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single(),
    ]);

  if (!trip) notFound();
  const canEdit = member?.role === "owner" || member?.role === "editor";

  return (
    <div className="space-y-6">
      <TripCalendar
        trip={trip as Trip}
        segments={(segments || []) as TravelSegment[]}
        deadlines={(deadlines || []) as BookingDeadline[]}
        prefs={(profile?.booking_prefs || {}) as BookingPrefs}
      />

      <section className="panel space-y-2">
        <h3 className="font-display text-xl">Booking deadlines</h3>
        <ul className="space-y-2">
          {((deadlines || []) as BookingDeadline[]).map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line/40"
            >
              <span>
                {d.label} · {d.due_date}
              </span>
              {canEdit && (
                <form action={toggleDeadline.bind(null, tripId, d.id, !d.done)}>
                  <button className="text-sea" type="submit">
                    {d.done ? "Undo" : "Done"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canEdit && (
        <>
          <form
            action={addSegment.bind(null, tripId)}
            className="panel space-y-2"
          >
            <h3 className="font-display text-xl">Add travel</h3>
            <select name="mode" className="field" defaultValue="plane">
              <option value="plane">Plane</option>
              <option value="train_hs">High-speed train</option>
              <option value="train_regional">Regional train</option>
              <option value="car">Car</option>
              <option value="bus">Bus</option>
              <option value="ferry">Ferry</option>
              <option value="other">Other</option>
            </select>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="from_place" className="field" placeholder="From" required />
              <input name="to_place" className="field" placeholder="To" required />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="depart_at" type="datetime-local" className="field" />
              <input name="arrive_at" type="datetime-local" className="field" />
            </div>
            <select name="booking_status" className="field" defaultValue="idea">
              <option value="idea">Idea</option>
              <option value="hold">On hold</option>
              <option value="booked">Booked</option>
            </select>
            <button className="btn btn-primary" type="submit">
              Add leg
            </button>
          </form>

          <form
            action={addDeadline.bind(null, tripId)}
            className="panel space-y-2"
          >
            <h3 className="font-display text-xl">Add booking deadline</h3>
            <input name="label" className="field" placeholder="Book flights" required />
            <input name="due_date" type="date" className="field" required />
            <button className="btn btn-primary" type="submit">
              Add deadline
            </button>
          </form>
        </>
      )}
    </div>
  );
}
