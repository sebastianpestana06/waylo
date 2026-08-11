import { redirect } from "next/navigation";
import {
  addPassport,
  signOut,
  updateProfile,
} from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/version";
import type { Memberships, Passport } from "@/lib/types";
import { normalizeLinkedAccounts } from "@/lib/linked-accounts";
import { LinkedAccountsForm } from "@/components/LinkedAccountsForm";
import {
  PassportRegistrationList,
  type PassportWithFile,
} from "@/components/PassportRegistrationList";
import { ClearDateField } from "@/components/ClearDateField";
import Link from "next/link";

function fileKindFromPath(path: string | null): PassportWithFile["fileKind"] {
  if (!path) return null;
  const lower = path.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic|bmp)$/.test(lower)) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  return "other";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const passportFlash = String(params.passport || "");
  const photoFlash = String(params.photo || "");
  const passportError = String(params.passportError || "");

  const [{ data: profile }, { data: passports }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("passports")
      .select("*")
      .eq("user_id", user.id)
      .order("expiry_date", { ascending: true }),
  ]);

  const memberships = (profile?.memberships || {}) as Memberships;
  const accounts = normalizeLinkedAccounts(memberships);
  const ff =
    memberships.frequentFlyers
      ?.map((f) => `${f.airline}: ${f.number}`)
      .join("\n") || "";

  const list = (passports || []) as Passport[];
  const withFiles: PassportWithFile[] = await Promise.all(
    list.map(async (p) => {
      let fileUrl: string | null = null;
      if (p.storage_path) {
        const { data } = await supabase.storage
          .from("passports")
          .createSignedUrl(p.storage_path, 60 * 60);
        fileUrl = data?.signedUrl || null;
      }
      return {
        ...p,
        fileUrl,
        fileKind: fileKindFromPath(p.storage_path),
      };
    }),
  );

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

        <LinkedAccountsForm
          initialAccounts={accounts}
          frequentFlyersDefault={ff}
        />

        <button className="btn btn-primary" type="submit">
          Save settings
        </button>
      </form>

      <section className="panel mt-6 space-y-3">
        <div>
          <h2 className="font-display text-xl">Passports</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Saved passports appear below with the details you entered and any
            scan or photo you uploaded.
          </p>
        </div>

        {passportFlash === "added" ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
            Passport saved. Your registration is listed below
            {photoFlash === "failed"
              ? " (photo upload failed — details were still saved)."
              : "."}
          </p>
        ) : null}
        {passportFlash === "saved" && photoFlash === "failed" ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            Passport details saved, but the photo/scan could not be uploaded.
            Check that the <code>passports</code> storage bucket exists in
            Supabase.
          </p>
        ) : null}
        {passportError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            Could not save passport
            {passportError === "missing"
              ? ": country and expiry date are required."
              : `: ${passportError}`}
          </p>
        ) : null}

        <PassportRegistrationList passports={withFiles} />

        <form action={addPassport} className="space-y-2 border-t border-line/40 pt-3">
          <p className="text-sm font-medium text-ink">Add a passport</p>
          <label className="block text-xs text-ink-soft">
            Issuing country
            <input
              name="issuing_country"
              className="field mt-1"
              placeholder="e.g. Netherlands"
              required
            />
          </label>
          <label className="block text-xs text-ink-soft">
            Passport number (optional)
            <input
              name="passport_number"
              className="field mt-1"
              placeholder="As printed in the passport"
            />
          </label>
          <ClearDateField
            name="expiry_date"
            label="Expiry date"
            required
          />
          <label className="block text-xs text-ink-soft">
            Scan or photo (optional)
            <input
              name="file"
              type="file"
              className="field mt-1"
              accept="image/*,.pdf"
            />
          </label>
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
