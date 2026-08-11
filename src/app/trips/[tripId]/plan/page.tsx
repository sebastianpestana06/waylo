import { notFound, redirect } from "next/navigation";
import { ChecklistPanel } from "@/components/ChecklistPanel";
import { addItineraryItem } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem, ItineraryItem } from "@/lib/types";

export default async function PlanPage({
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

  const [{ data: member }, { data: checklist }, { data: itinerary }] =
    await Promise.all([
      supabase
        .from("trip_members")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("checklist_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("sort_order"),
      supabase
        .from("itinerary_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("day_date")
        .order("sort_order"),
    ]);

  if (!member) notFound();
  const canEdit = member.role === "owner" || member.role === "editor";

  return (
    <div className="space-y-6">
      <ChecklistPanel
        tripId={tripId}
        initial={(checklist || []) as ChecklistItem[]}
        canEdit={canEdit}
      />

      <section className="panel space-y-3">
        <h3 className="font-display text-xl">Day itinerary</h3>
        <ul className="space-y-2">
          {((itinerary || []) as ItineraryItem[]).map((item) => (
            <li
              key={item.id}
              className="rounded-xl bg-white px-3 py-2 ring-1 ring-line/40"
            >
              <p className="text-xs text-ink-soft">{item.day_date}</p>
              <p className="font-semibold">{item.title}</p>
              {item.notes && (
                <p className="text-sm text-ink-soft">{item.notes}</p>
              )}
              {item.maps_url && (
                <a
                  href={item.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-sea"
                >
                  Open map
                </a>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form
            action={addItineraryItem.bind(null, tripId)}
            className="space-y-2 border-t border-line pt-3"
          >
            <input name="day_date" type="date" className="field" required />
            <input name="title" className="field" placeholder="Activity" required />
            <input name="notes" className="field" placeholder="Notes" />
            <input
              name="maps_url"
              className="field"
              placeholder="Google Maps URL"
            />
            <button className="btn btn-primary" type="submit">
              Add activity
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
