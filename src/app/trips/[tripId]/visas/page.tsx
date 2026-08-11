import { addMonths, parseISO } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { runTripVisaChecks, runVisaCheck } from "@/lib/actions";
import { formatDateClear } from "@/lib/dates";
import { tripCountries } from "@/lib/locations";
import { passportValidForTrip } from "@/lib/passport";
import { createClient } from "@/lib/supabase/server";
import type {
  Trip,
  TripMember,
  TripPassportSummary,
  VisaCheckResult,
} from "@/lib/types";

export default async function TripVisasPage({
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

  const { data: member } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();
  if (!member) notFound();

  const canEdit = member.role === "owner" || member.role === "editor";

  const [{ data: trip }, { data: members }, summariesRes, ownPassportsRes] =
    await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase
        .from("trip_members")
        .select("*, profiles(*)")
        .eq("trip_id", tripId),
      supabase.rpc("trip_passport_summaries", { p_trip_id: tripId }),
      supabase
        .from("passports")
        .select("id, issuing_country, expiry_date, storage_path, user_id")
        .eq("user_id", user.id),
    ]);

  if (!trip) notFound();
  const t = trip as Trip;
  const countries = tripCountries(t);
  const memberList = (members || []) as TripMember[];

  let summaries: TripPassportSummary[] = [];
  let rpcMissing = false;
  if (summariesRes.error) {
    rpcMissing =
      summariesRes.error.message.includes("trip_passport_summaries") ||
      summariesRes.error.code === "PGRST202" ||
      summariesRes.error.code === "42883";
    // Fallback: own passports only
    summaries = (
      (ownPassportsRes.data || []) as {
        user_id: string;
        issuing_country: string;
        expiry_date: string;
        storage_path: string | null;
      }[]
    ).map((p) => ({
      user_id: p.user_id,
      display_name: "You",
      issuing_country: p.issuing_country,
      expiry_date: p.expiry_date,
      has_scan: Boolean(p.storage_path),
    }));
  } else {
    summaries = (summariesRes.data || []) as TripPassportSummary[];
  }

  const requiredUntil = t.end_date
    ? addMonths(parseISO(t.end_date), 9).toISOString().slice(0, 10)
    : null;

  const byUser = new Map<
    string,
    { name: string; passports: TripPassportSummary[] }
  >();
  for (const m of memberList) {
    const name =
      m.profiles?.display_name ||
      (m.user_id === user.id ? "You" : "Traveller");
    byUser.set(m.user_id, { name, passports: [] });
  }
  for (const s of summaries) {
    const row = byUser.get(s.user_id) || {
      name: s.display_name || "Traveller",
      passports: [],
    };
    row.passports.push(s);
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, row);
  }

  const visaChecks: VisaCheckResult[] = Array.isArray(t.visa_checks)
    ? t.visa_checks
    : t.last_visa_check
      ? [t.last_visa_check]
      : [];

  const nationalities = [
    ...new Set(summaries.map((s) => s.issuing_country).filter(Boolean)),
  ];

  return (
    <div className="space-y-4">
      <section className="panel space-y-2">
        <h2 className="font-display text-2xl">Passports & visas</h2>
        <p className="text-sm text-ink-soft">
          Check each traveller’s passport against{" "}
          <span className="font-medium text-ink">{t.title}</span> countries,
          then run AI visa guidance. Always verify with official immigration
          sites before you book.
        </p>
        {rpcMissing ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            Run <code>supabase/migrate_trip_visas.sql</code> in the Supabase SQL
            editor so trip mates can share passport countries (not numbers or
            scans) on this tab.
          </p>
        ) : null}
      </section>

      <section className="panel space-y-3">
        <h3 className="font-display text-xl">Trip countries</h3>
        {countries.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No countries set yet.{" "}
            {canEdit ? (
              <Link href={`/trips/${tripId}/more`} className="text-sea underline">
                Add countries in More → Places
              </Link>
            ) : (
              "Ask an editor to add countries."
            )}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {countries.map((c) => (
              <li
                key={c}
                className="rounded-full bg-sand-deep/50 px-3 py-1 text-sm text-ink ring-1 ring-line/40"
              >
                {c}
              </li>
            ))}
          </ul>
        )}
        {requiredUntil ? (
          <p className="text-xs text-ink-soft">
            Passports should stay valid until at least{" "}
            <span className="font-medium text-ink">
              {formatDateClear(requiredUntil)}
            </span>{" "}
            (9 months after trip end).
          </p>
        ) : (
          <p className="text-xs text-ink-soft">
            Set a trip end date to enable the 9-month passport validity check.
          </p>
        )}
      </section>

      <section className="panel space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-xl">Traveller passports</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Issuing country and expiry only — passport numbers and scans stay
              private.
            </p>
          </div>
          <Link href="/settings" className="btn btn-ghost text-xs">
            Manage my passports
          </Link>
        </div>

        <div className="space-y-3">
          {[...byUser.entries()].map(([uid, row]) => (
            <article
              key={uid}
              className="rounded-xl bg-white p-3 ring-1 ring-line/40"
            >
              <p className="font-semibold text-ink">
                {uid === user.id ? `${row.name} (you)` : row.name}
              </p>
              {row.passports.length === 0 ? (
                <p className="mt-1 text-sm text-ink-soft">
                  {uid === user.id
                    ? "No passport saved yet — add one in Settings."
                    : "No passport shared yet."}
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {row.passports.map((p, i) => {
                    const check = passportValidForTrip(
                      p.expiry_date,
                      t.end_date,
                    );
                    return (
                      <li
                        key={`${p.user_id}-${p.issuing_country}-${p.expiry_date}-${i}`}
                        className="text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">
                            {p.issuing_country}
                          </span>
                          <span className="text-ink-soft">
                            expires {formatDateClear(p.expiry_date)}
                          </span>
                          {p.has_scan ? (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-ink-soft">
                              Scan on file
                            </span>
                          ) : null}
                          {t.end_date ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] ${
                                check.ok
                                  ? "bg-emerald-50 text-emerald-900"
                                  : "bg-coral/10 text-coral"
                              }`}
                            >
                              {check.ok
                                ? "OK for trip dates"
                                : "Renew before travel"}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel space-y-3">
        <h3 className="font-display text-xl">Visa guidance</h3>
        <p className="text-sm text-ink-soft">
          Uses passport nationalities on this trip
          {nationalities.length
            ? ` (${nationalities.join(", ")})`
            : ""}{" "}
          against each destination country.
        </p>

        {visaChecks.length > 0 ? (
          <ul className="space-y-3">
            {visaChecks.map((v) => (
              <li
                key={`${v.destination}-${v.checked_at}`}
                className="rounded-xl bg-sand-deep/40 p-3 text-sm"
              >
                <p className="font-semibold">
                  {v.likely_required
                    ? "Visa likely needed"
                    : "Likely visa-free / check carefully"}{" "}
                  · {v.destination}
                </p>
                <p className="mt-1 text-ink-soft">
                  Passports: {v.nationalities.join(", ") || "—"}
                </p>
                <p className="mt-2">{v.summary}</p>
                {v.caveats?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-soft">
                    {v.caveats.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">
            No visa checks run yet for this trip.
          </p>
        )}

        {canEdit ? (
          <div className="space-y-3 border-t border-line/40 pt-3">
            <form action={runTripVisaChecks.bind(null, tripId)}>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!countries.length || !nationalities.length}
              >
                Check visas for all trip countries
              </button>
            </form>
            <form
              action={runVisaCheck.bind(null, tripId)}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <label className="block flex-1 text-xs text-ink-soft">
                Or check one destination
                <input
                  name="destination"
                  className="field mt-1"
                  placeholder="e.g. Japan"
                  defaultValue={countries[0] || ""}
                  required
                />
              </label>
              <button className="btn btn-ghost" type="submit">
                Check this country
              </button>
            </form>
          </div>
        ) : (
          <p className="text-xs text-ink-soft">
            View-only: ask an editor to run visa checks.
          </p>
        )}
      </section>
    </div>
  );
}
