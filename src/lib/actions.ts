"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TRIP_TEMPLATES } from "@/lib/templates";
import { checkVisaWithAI } from "@/lib/visa";
import { equalSplit } from "@/lib/settle";
import {
  accountsToBookingPrefs,
  parseLinkedAccountsFromForm,
} from "@/lib/linked-accounts";
import { sitesForFeature } from "@/lib/popular-sites";
import { toIsoDate } from "@/lib/dates";
import { tripCountries } from "@/lib/locations";
import type { Trip, VisaCheckResult } from "@/lib/types";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const detail =
      (error as { cause?: { message?: string } }).cause?.message ||
      error.message;
    throw new Error(`Sign in failed: ${detail}`);
  }
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
    options: {
      data: { display_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) {
    const detail =
      (error as { cause?: { message?: string } }).cause?.message ||
      error.message;
    throw new Error(`Sign up failed: ${detail}`);
  }
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
  const countriesRaw = String(formData.get("countries") || "");
  const citiesRaw = String(formData.get("cities") || "");
  const typedCountries = countriesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const typedCities = citiesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Cities are optional. Templates only seed values when their fields were left blank.
  const countries =
    typedCountries.length > 0
      ? typedCountries
      : template.key !== "blank"
        ? template.countries
        : [];
  const cities =
    typedCities.length > 0
      ? typedCities
      : template.key !== "blank"
        ? template.cities
        : [];
  const destinations = [...cities, ...countries];

  let trip: { id: string } | null = null;
  let error: { message: string } | null = null;

  const fullInsert = await supabase
    .from("trips")
    .insert({
      title,
      start_date,
      end_date,
      owner_id: user.id,
      destinations,
      countries,
      cities,
      template_key: template.key,
    })
    .select("*")
    .single();

  if (fullInsert.error) {
    // Fallback if cities/countries columns not migrated yet
    const legacy = await supabase
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
    trip = legacy.data;
    error = legacy.error;
  } else {
    trip = fullInsert.data;
  }

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

export async function updateTripLocations(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member || !["owner", "editor"].includes(member.role)) {
    throw new Error("Only editors can update locations");
  }

  const countries = String(formData.get("countries") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cities = String(formData.get("cities") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const destinations = [...cities, ...countries];

  const { error } = await supabase
    .from("trips")
    .update({
      countries,
      cities,
      destinations,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  if (error) {
    // Legacy fallback: only destinations column
    await supabase
      .from("trips")
      .update({
        destinations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tripId);
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/more`);
  revalidatePath("/dashboard");
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

  const { accounts, frequentFlyers } = parseLinkedAccountsFromForm(formData);
  const prefsFromAccounts = accountsToBookingPrefs(accounts);

  await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") || ""),
      home_timezone: String(formData.get("home_timezone") || "UTC"),
      memberships: {
        accounts,
        frequentFlyers,
      },
      booking_prefs: prefsFromAccounts,
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

  const issuing_country = String(formData.get("issuing_country") || "").trim();
  const passport_number =
    String(formData.get("passport_number") || "").trim() || null;
  const expiry_date = toIsoDate(formData.get("expiry_date"));
  if (!issuing_country || !expiry_date) {
    redirect("/settings?passportError=missing");
  }

  const file = formData.get("file") as File | null;
  let storage_path: string | null = null;
  let uploadFailed = false;
  if (file && file.size > 0) {
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from("passports")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) {
      uploadFailed = true;
    } else {
      storage_path = path;
    }
  }

  const { error } = await supabase.from("passports").insert({
    user_id: user.id,
    issuing_country,
    passport_number,
    expiry_date,
    storage_path,
  });

  if (error) {
    redirect(
      `/settings?passportError=${encodeURIComponent(error.message.slice(0, 120))}`,
    );
  }

  revalidatePath("/settings");
  if (uploadFailed) {
    redirect("/settings?passport=saved&photo=failed");
  }
  redirect("/settings?passport=added");
}

export async function deletePassport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const id = String(formData.get("id") || "");
  if (!id) return;
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
  redirect("/settings");
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

export async function addBookedStay(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const siteId = String(formData.get("site_id") || "").trim();
  const customSite = String(formData.get("custom_site") || "").trim();
  const bookingId = String(formData.get("booking_id") || "").trim();
  if (!siteId || !bookingId) return;

  const hotelSites = sitesForFeature("hotels");
  const known = hotelSites.find((s) => s.id === siteId);
  const siteLabel =
    siteId === "other"
      ? customSite || "Other"
      : known?.label || siteId;

  await supabase.from("booked_stays").insert({
    trip_id: tripId,
    created_by: user.id,
    site_id: siteId === "other" ? "other" : siteId,
    site_label: siteLabel,
    booking_id: bookingId,
    property_name: String(formData.get("property_name") || "").trim() || null,
    city: String(formData.get("city") || "").trim() || null,
    check_in: toIsoDate(formData.get("check_in")) || null,
    check_out: toIsoDate(formData.get("check_out")) || null,
    notes: String(formData.get("notes") || "").trim() || null,
  });

  revalidatePath(`/trips/${tripId}/stay`);
}

export async function deleteBookedStay(tripId: string, id: string) {
  const supabase = await createClient();
  await supabase.from("booked_stays").delete().eq("id", id).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/stay`);
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
  const destination = String(formData.get("destination") || "").trim();
  if (!destination) throw new Error("Destination is required.");

  const { data: member } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();
  if (!member || (member.role !== "owner" && member.role !== "editor")) {
    throw new Error("Only editors can run visa checks.");
  }

  const nationalities = await loadTripNationalities(supabase, tripId, user.id);
  if (!nationalities.length) {
    throw new Error(
      "No passport nationalities on this trip yet. Add a passport in Settings.",
    );
  }
  const result = await checkVisaWithAI({ nationalities, destination });
  const { data: trip } = await supabase
    .from("trips")
    .select("visa_checks")
    .eq("id", tripId)
    .single();
  const prev = Array.isArray(trip?.visa_checks)
    ? (trip!.visa_checks as VisaCheckResult[])
    : [];
  const next = [
    result,
    ...prev.filter(
      (c) =>
        c.destination.toLowerCase() !== destination.toLowerCase(),
    ),
  ];
  await supabase
    .from("trips")
    .update({ last_visa_check: result, visa_checks: next })
    .eq("id", tripId);
  revalidatePath(`/trips/${tripId}/visas`);
  revalidatePath(`/trips/${tripId}/more`);
  revalidatePath("/dashboard");
}

/** Run AI visa guidance for every trip country using all members' passport nationalities. */
export async function runTripVisaChecks(tripId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: member } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();
  if (!member || (member.role !== "owner" && member.role !== "editor")) {
    throw new Error("Only editors can run visa checks.");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();
  if (!trip) throw new Error("Trip not found.");

  const countries = tripCountries(trip as Trip);
  if (!countries.length) {
    throw new Error("Add at least one trip country in More → Places first.");
  }

  const nationalities = await loadTripNationalities(supabase, tripId, user.id);
  if (!nationalities.length) {
    throw new Error(
      "No passport nationalities on this trip yet. Ask travellers to add passports in Settings.",
    );
  }

  const results: VisaCheckResult[] = [];
  for (const destination of countries) {
    results.push(await checkVisaWithAI({ nationalities, destination }));
  }

  await supabase
    .from("trips")
    .update({
      visa_checks: results,
      last_visa_check: results[0] || null,
    })
    .eq("id", tripId);

  revalidatePath(`/trips/${tripId}/visas`);
  revalidatePath(`/trips/${tripId}/more`);
  revalidatePath("/dashboard");
}

async function loadTripNationalities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  userId: string,
) {
  const { data: summaries, error } = await supabase.rpc(
    "trip_passport_summaries",
    { p_trip_id: tripId },
  );
  if (!error && summaries?.length) {
    return [
      ...new Set(
        (summaries as { issuing_country: string }[])
          .map((s) => s.issuing_country?.trim())
          .filter(Boolean),
      ),
    ];
  }
  // Fallback if RPC not migrated yet: current user's passports only
  const { data: passports } = await supabase
    .from("passports")
    .select("issuing_country")
    .eq("user_id", userId);
  return [
    ...new Set(
      (passports || [])
        .map((p) => p.issuing_country?.trim())
        .filter(Boolean),
    ),
  ];
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
