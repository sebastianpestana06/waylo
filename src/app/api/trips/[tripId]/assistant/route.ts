import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tripPlaces } from "@/lib/locations";
import { equalSplit } from "@/lib/settle";
import { planTripUpdate, type AssistantAction } from "@/lib/trip-assistant";

export async function POST(
  request: Request,
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
  if (!member || !["owner", "editor"].includes(member.role)) {
    return NextResponse.json(
      { error: "Only editors can use the assistant." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const message = String(body.message || "").trim();
  const structured = Boolean(body.structured);
  const directActions = Array.isArray(body.actions) ? body.actions : null;

  if (!message && !directActions?.length) {
    return NextResponse.json({ error: "Empty update" }, { status: 400 });
  }

  const [{ data: trip }, { data: members }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase
      .from("trip_members")
      .select("user_id, role, profiles(display_name)")
      .eq("trip_id", tripId),
  ]);

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const memberIds = (members || []).map((m) => m.user_id as string);
  const memberNames = (members || []).map((m) => {
    const raw = m.profiles as unknown;
    const profile = Array.isArray(raw) ? raw[0] : raw;
    return (
      (profile as { display_name?: string } | null)?.display_name || "Traveler"
    );
  });

  const plan = structured && directActions?.length
    ? {
        reply: "Applying your selected update.",
        actions: directActions,
      }
    : await planTripUpdate(message, {
        tripTitle: trip.title,
        destinations: tripPlaces({
          destinations: trip.destinations || [],
          cities: trip.cities,
          countries: trip.countries,
        }),
        startDate: trip.start_date,
        endDate: trip.end_date,
        memberNames,
        defaultCurrency: "EUR",
      });

  const applied: string[] = [];
  const errors: string[] = [];

  for (const action of plan.actions) {
    try {
      const note = await applyAction(supabase, tripId, user.id, memberIds, action);
      if (note) applied.push(note);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Action failed");
    }
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/money`);
  revalidatePath(`/trips/${tripId}/plan`);
  revalidatePath(`/trips/${tripId}/calendar`);
  revalidatePath("/dashboard");

  return NextResponse.json({
    reply: plan.reply,
    applied,
    errors,
  });
}

async function applyAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  userId: string,
  memberIds: string[],
  action: AssistantAction,
): Promise<string> {
  switch (action.type) {
    case "create_expense": {
      const amount = Number(action.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid payment amount");
      }
      const currency = (action.currency || "EUR").toUpperCase();
      const description = action.description?.trim() || "Expense";
      const ids = memberIds.length ? memberIds : [userId];

      const { data: payment, error } = await supabase
        .from("expense_payments")
        .insert({
          trip_id: tripId,
          created_by: userId,
          description,
          amount,
          currency,
        })
        .select("*")
        .single();
      if (error || !payment) throw new Error(error?.message || "Payment insert failed");

      const shares = equalSplit(amount, ids);
      await supabase.from("expense_shares").insert(
        shares.map((s) => ({
          payment_id: payment.id,
          user_id: s.userId,
          share_amount: s.amount,
          paid: s.userId === userId,
          paid_at: s.userId === userId ? new Date().toISOString() : null,
          marked_paid_by: s.userId === userId ? userId : null,
        })),
      );

      return `Money: added ${currency} ${amount.toFixed(2)} — ${description} (split ${ids.length} ways)`;
    }
    case "add_checklist": {
      const text = action.text?.trim();
      if (!text) throw new Error("Empty checklist item");
      const { count } = await supabase
        .from("checklist_items")
        .select("*", { count: "exact", head: true })
        .eq("trip_id", tripId);
      await supabase.from("checklist_items").insert({
        trip_id: tripId,
        text,
        sort_order: count || 0,
      });
      return `Plan: checklist “${text}”`;
    }
    case "add_segment": {
      await supabase.from("travel_segments").insert({
        trip_id: tripId,
        mode: action.mode || "other",
        from_place: action.from_place,
        to_place: action.to_place,
        depart_at: action.depart_at || null,
        arrive_at: action.arrive_at || null,
        booking_status: "idea",
      });
      return `Calendar: ${action.from_place} → ${action.to_place}`;
    }
    case "add_deadline": {
      await supabase.from("booking_deadlines").insert({
        trip_id: tripId,
        label: action.label,
        due_date: action.due_date,
      });
      return `Calendar: deadline “${action.label}” (${action.due_date})`;
    }
    case "add_itinerary": {
      await supabase.from("itinerary_items").insert({
        trip_id: tripId,
        day_date: action.day_date,
        title: action.title,
        notes: action.notes || null,
        maps_url: action.maps_url || null,
      });
      return `Plan: itinerary “${action.title}” on ${action.day_date}`;
    }
    default:
      throw new Error("Unknown action");
  }
}
