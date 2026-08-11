import { redirect } from "next/navigation";
import {
  addPassport,
  deletePassport,
  signOut,
  updateProfile,
} from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/version";
import type { Memberships, Passport } from "@/lib/types";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: passports }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("passports").select("*").eq("user_id", user.id),
  ]);

  const memberships = (profile?.memberships || {}) as Memberships;
  const prefs = profile?.booking_prefs || {};
  const ff =
    memberships.frequentFlyers
      ?.map((f) => `${f.airline}: ${f.number}`)
      .join("\n") || "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Account</h1>
        <Link href="/dashboard" className="btn btn-ghost">
          Trips
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-soft">Waylo v{APP_VERSION}</p>

      <form action={updateProfile} className="panel mt-6 space-y-3">
        <h2 className="font-display text-xl">Profile</h2>
        <input
          name="display_name"
          className="field"
          defaultValue={profile?.display_name || ""}
          placeholder="Display name"
        />
        <input
          name="home_timezone"
          className="field"
          defaultValue={profile?.home_timezone || "UTC"}
          placeholder="Home timezone (e.g. Europe/Amsterdam)"
        />
        <h3 className="pt-2 text-sm font-semibold">Linked memberships</h3>
        <input
          name="agoda"
          className="field"
          defaultValue={memberships.agoda || ""}
          placeholder="Agoda member ID"
        />
        <input
          name="booking"
          className="field"
          defaultValue={memberships.booking || ""}
          placeholder="Booking.com Genius ID"
        />
        <input
          name="skyscanner"
          className="field"
          defaultValue={memberships.skyscanner || ""}
          placeholder="Skyscanner account note"
        />
        <textarea
          name="frequent_flyers"
          className="field min-h-24"
          defaultValue={ff}
          placeholder={"Frequent flyers, one per line:\nKLM: 123456"}
        />
        <h3 className="pt-2 text-sm font-semibold">Booking search prefs</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pref_skyscanner"
            defaultChecked={prefs.skyscanner !== false}
          />
          Skyscanner deep links
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pref_booking"
            defaultChecked={prefs.booking !== false}
          />
          Booking.com deep links
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pref_agoda"
            defaultChecked={Boolean(prefs.agoda)}
          />
          Agoda deep links
        </label>
        <button className="btn btn-primary" type="submit">
          Save settings
        </button>
      </form>

      <section className="panel mt-6 space-y-3">
        <h2 className="font-display text-xl">Passports</h2>
        <ul className="space-y-2">
          {((passports || []) as Passport[]).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line/50"
            >
              <span>
                {p.issuing_country} · expires {p.expiry_date}
              </span>
              <form action={deletePassport.bind(null, p.id)}>
                <button className="text-coral" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addPassport} className="space-y-2">
          <input
            name="issuing_country"
            className="field"
            placeholder="Issuing country"
            required
          />
          <input
            name="passport_number"
            className="field"
            placeholder="Passport number (optional)"
          />
          <input name="expiry_date" type="date" className="field" required />
          <input name="file" type="file" accept="image/*,.pdf" className="field" />
          <button className="btn btn-primary" type="submit">
            Add passport
          </button>
        </form>
      </section>

      <form action={signOut} className="mt-6">
        <button className="btn btn-ghost" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
