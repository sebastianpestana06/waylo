"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TRIP_TEMPLATES } from "@/lib/templates";
import { checkVisaWithAI } from "@/lib/visa";
import { equalSplit } from "@/lib/settle";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const display_name = String(formData.get("display_name") || "");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name } },
  });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createTrip(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateKey = String(formData.get("template_key") || "blank");
  const template =
    TRIP_TEMPLATES.find((t) => t.key === templateKey) || TRIP_TEMPLATES[2];
  const title =
    String(formData.get("title") || "").trim() || template.title;
  const start_date = String(formData.get("start_date") || "") || null;
  const end_date = String(formData.get("end_date") || "") || null;
  const destinationsRaw = String(formData.get("destinations") || "");
  const destinations = destinationsRaw
    ? destinationsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : template.destinations;

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      title,
      start_date,
      end_date,
      owner_id: user.id,
      destinations,
      template_key: template.key,
    })
    .select("*")
    .single();
  if (error || !trip) throw new Error(error?.message || "Failed to create trip");

  await supabase.from("trip_members").insert({
    trip_id: trip.id,
    user_id: user.id,
    role: "owner",
  });

  if (template.checklist.length) {
    await supabase.from("checklist_items").insert(
      template.checklist.map((text, i) => ({
        trip_id: trip.id,
        text,
        sort_order: i,
      })),
    );
  }

  if (template.itineraryHints.length && start_date) {
    await supabase.from("itinerary_items").insert(
      template.itineraryHints.map((hint, i) => ({
        trip_id: trip.id,
        day_date: start_date,
        title: hint,
        sort_order: i,
      })),
    );
  }

  revalidatePath("/dashboard");
  redirect(`/trips/${trip.id}`);
}

export async function joinTripByToken(token: string, role: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/${token}?role=${role}`);

  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("invite_token", token)
    .single();
  if (!trip) throw new Error("Invite not found");

  const safeRole = role === "viewer" ? "viewer" : "editor";
  const { data: existing } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", trip.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("trip_members").insert({
      trip_id: trip.id,
      user_id: user.id,
      role: safeRole,
    });
  }

  redirect(`/trips/${trip.id}`);
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const frequentFlyersRaw = String(formData.get("frequent_flyers") || "");
  const frequentFlyers = frequentFlyersRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [airline, number] = line.split(":").map((s) => s.trim());
      return { airline: airline || "Airline", number: number || "" };
    });

  await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") || ""),
      home_timezone: String(formData.get("home_timezone") || "UTC"),
      memberships: {
        agoda: String(formData.get("agoda") || ""),
        booking: String(formData.get("booking") || ""),
        skyscanner: String(formData.get("skyscanner") || ""),
        frequentFlyers,
      },
      booking_prefs: {
        skyscanner: formData.get("pref_skyscanner") === "on",
        booking: formData.get("pref_booking") === "on",
        agoda: formData.get("pref_agoda") === "on",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/settings");
}

export async function addPassport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("file") as File | null;
  let storage_path: string | null = null;
  if (file && file.size > 0) {
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("passports")
      .upload(path, file);
    if (!error) storage_path = path;
  }

  await supabase.from("passports").insert({
    user_id: user.id,
    issuing_country: String(formData.get("issuing_country") || ""),
    passport_number: String(formData.get("passport_number") || "") || null,
    expiry_date: String(formData.get("expiry_date") || ""),
    storage_path,
  });

  revalidatePath("/settings");
}

export async function deletePassport(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("passports")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (data?.storage_path) {
    await supabase.storage.from("passports").remove([data.storage_path]);
  }
  await supabase.from("passports").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/settings");
}

export async function addSegment(tripId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("travel_segments").insert({
    trip_id: tripId,
    mode: String(formData.get("mode") || "plane"),
    from_place: String(formData.get("from_place") || ""),
    to_place: String(formData.get("to_place") || ""),
    depart_at: String(formData.get("depart_at") || "") || null,
    arrive_at: String(formData.get("arrive_at") || "") || null,
    booking_status: String(formData.get("booking_status") || "idea"),
    notes: String(formData.get("notes") || "") || null,
  });
  revalidatePath(`/trips/${tripId}/calendar`);
}

export async function addDeadline(tripId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("booking_deadlines").insert({
    trip_id: tripId,
    label: String(formData.get("label") || ""),
    due_date: String(formData.get("due_date") || ""),
  });
  revalidatePath(`/trips/${tripId}/calendar`);
}

export async function toggleDeadline(tripId: string, id: string, done: boolean) {
  const supabase = await createClient();
  await supabase.from("booking_deadlines").update({ done }).eq("id", id);
  revalidatePath(`/trips/${tripId}/calendar`);
}

export async function addChecklistItem(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  const { count } = await supabase
    .from("checklist_items")
    .select("*", { count: "exact", head: true })
    .eq("trip_id", tripId);
  await supabase.from("checklist_items").insert({
    trip_id: tripId,
    text,
    sort_order: count || 0,
  });
  revalidatePath(`/trips/${tripId}/plan`);
}

export async function toggleChecklistItem(
  tripId: string,
  id: string,
  done: boolean,
) {
  const supabase = await createClient();
  await supabase.from("checklist_items").update({ done }).eq("id", id);
  revalidatePath(`/trips/${tripId}/plan`);
}

export async function deleteChecklistItem(tripId: string, id: string) {
  const supabase = await createClient();
  await supabase.from("checklist_items").delete().eq("id", id);
  revalidatePath(`/trips/${tripId}/plan`);
}

export async function addItineraryItem(tripId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("itinerary_items").insert({
    trip_id: tripId,
    day_date: String(formData.get("day_date") || ""),
    title: String(formData.get("title") || ""),
    notes: String(formData.get("notes") || "") || null,
    maps_url: String(formData.get("maps_url") || "") || null,
  });
  revalidatePath(`/trips/${tripId}/plan`);
}

export async function createExpense(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = Number(formData.get("amount") || 0);
  const description = String(formData.get("description") || "");
  const currency = String(formData.get("currency") || "EUR");
  const memberIds = String(formData.get("member_ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const customRaw = String(formData.get("custom_shares") || "");

  const { data: payment, error } = await supabase
    .from("expense_payments")
    .insert({
      trip_id: tripId,
      created_by: user.id,
      description,
      amount,
      currency,
    })
    .select("*")
    .single();
  if (error || !payment) throw new Error(error?.message || "Payment failed");

  let shares: { userId: string; amount: number }[] = [];
  if (customRaw.trim()) {
    shares = customRaw.split(",").map((part) => {
      const [userId, amt] = part.split("=");
      return { userId: userId.trim(), amount: Number(amt) };
    });
  } else {
    shares = equalSplit(amount, memberIds);
  }

  await supabase.from("expense_shares").insert(
    shares.map((s) => ({
      payment_id: payment.id,
      user_id: s.userId,
      share_amount: s.amount,
      paid: s.userId === user.id,
      paid_at: s.userId === user.id ? new Date().toISOString() : null,
      marked_paid_by: s.userId === user.id ? user.id : null,
    })),
  );

  revalidatePath(`/trips/${tripId}/money`);
  revalidatePath("/dashboard");
}

export async function markSharePaid(
  tripId: string,
  shareId: string,
  paid: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("expense_shares")
    .update({
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      marked_paid_by: paid ? user.id : null,
    })
    .eq("id", shareId);

  revalidatePath(`/trips/${tripId}/money`);
  revalidatePath("/dashboard");
}

export async function uploadTripDocument(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const file = formData.get("file") as File;
  const label = String(formData.get("label") || file.name);
  const category = String(formData.get("category") || "other");
  const path = `${tripId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("trip-docs").upload(path, file);
  if (error) throw new Error(error.message);
  await supabase.from("trip_documents").insert({
    trip_id: tripId,
    label,
    category,
    storage_path: path,
    uploaded_by: user.id,
  });
  revalidatePath(`/trips/${tripId}/more`);
}

export async function runVisaCheck(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const destination = String(formData.get("destination") || "");
  const { data: passports } = await supabase
    .from("passports")
    .select("issuing_country")
    .eq("user_id", user.id);
  const nationalities = (passports || []).map((p) => p.issuing_country);
  if (!nationalities.length) {
    throw new Error("Add at least one passport in Settings first.");
  }
  const result = await checkVisaWithAI({ nationalities, destination });
  await supabase
    .from("trips")
    .update({ last_visa_check: result })
    .eq("id", tripId);
  revalidatePath(`/trips/${tripId}/more`);
  revalidatePath("/dashboard");
}

export async function updateMemberRole(
  tripId: string,
  userId: string,
  role: string,
) {
  const supabase = await createClient();
  if (!["editor", "viewer"].includes(role)) return;
  await supabase
    .from("trip_members")
    .update({ role })
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  revalidatePath(`/trips/${tripId}/more`);
}

export async function removeMember(tripId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .neq("role", "owner");
  revalidatePath(`/trips/${tripId}/more`);
}

export async function createMeeting(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const slotsRaw = String(formData.get("slots") || "");
  const candidate_slots = slotsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [start, end] = line.split(",").map((s) => s.trim());
      return { start, end: end || start };
    });
  await supabase.from("meeting_proposals").insert({
    trip_id: tripId,
    created_by: user.id,
    title: String(formData.get("title") || "Planning call"),
    candidate_slots,
  });
  revalidatePath(`/trips/${tripId}/more`);
}

export async function voteMeeting(
  tripId: string,
  meetingId: string,
  slotStart: string,
  vote: "yes" | "no" | "maybe",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("meeting_proposals")
    .select("availability")
    .eq("id", meetingId)
    .single();
  const availability = (data?.availability || {}) as Record<
    string,
    Record<string, string>
  >;
  availability[user.id] = {
    ...(availability[user.id] || {}),
    [slotStart]: vote,
  };
  await supabase
    .from("meeting_proposals")
    .update({ availability })
    .eq("id", meetingId);
  revalidatePath(`/trips/${tripId}/more`);
}
