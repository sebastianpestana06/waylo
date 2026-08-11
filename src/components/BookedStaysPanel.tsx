"use client";

import { useMemo, useState } from "react";
import { addBookedStay, deleteBookedStay } from "@/lib/actions";
import { ClearDateField } from "@/components/ClearDateField";
import { formatDateClear } from "@/lib/dates";
import { sitesForFeature } from "@/lib/popular-sites";
import type { BookedStay } from "@/lib/types";

export function BookedStaysPanel({
  tripId,
  canEdit,
  initialStays,
  defaultCity,
  defaultCheckIn,
  defaultCheckOut,
}: {
  tripId: string;
  canEdit: boolean;
  initialStays: BookedStay[];
  defaultCity: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
}) {
  const hotelSites = useMemo(() => sitesForFeature("hotels"), []);
  const [siteId, setSiteId] = useState(hotelSites[0]?.id || "booking");

  return (
    <section className="panel space-y-3">
      <div>
        <h3 className="font-display text-xl">Booked stays</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Save the booking site and confirmation / booking ID so trip mates can
          find it later.
        </p>
      </div>

      {initialStays.length === 0 ? (
        <p className="text-sm text-ink-soft">No booked stays saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {initialStays.map((stay) => (
            <li
              key={stay.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-line/40"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {stay.property_name || stay.site_label}
                </p>
                <p className="text-sm text-ink-soft">
                  {stay.site_label} · ID{" "}
                  <span className="font-mono text-ink">{stay.booking_id}</span>
                </p>
                {(stay.city || stay.check_in || stay.check_out) && (
                  <p className="text-xs text-ink-soft">
                    {[
                      stay.city,
                      stay.check_in ? formatDateClear(stay.check_in) : "",
                      stay.check_out ? formatDateClear(stay.check_out) : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {stay.notes ? (
                  <p className="mt-1 text-xs text-ink-soft">{stay.notes}</p>
                ) : null}
              </div>
              {canEdit ? (
                <form action={deleteBookedStay.bind(null, tripId, stay.id)}>
                  <button type="submit" className="btn btn-ghost text-xs">
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <form
          action={addBookedStay.bind(null, tripId)}
          className="space-y-2 border-t border-line/50 pt-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-ink-soft">
              Booking site
              <select
                name="site_id"
                className="field mt-1"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
              >
                {hotelSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.label}
                  </option>
                ))}
                <option value="other">Other…</option>
              </select>
            </label>
            {siteId === "other" ? (
              <label className="text-xs text-ink-soft">
                Site name
                <input
                  name="custom_site"
                  className="field mt-1"
                  placeholder="e.g. Direct with hotel"
                  required
                />
              </label>
            ) : (
              <input type="hidden" name="custom_site" value="" />
            )}
            <label className="text-xs text-ink-soft sm:col-span-2">
              Booking / confirmation ID
              <input
                name="booking_id"
                className="field mt-1"
                placeholder="e.g. 1234.567.890 or HMAAABBB"
                required
              />
            </label>
            <label className="text-xs text-ink-soft">
              Property name (optional)
              <input
                name="property_name"
                className="field mt-1"
                placeholder="Hotel or listing name"
              />
            </label>
            <label className="text-xs text-ink-soft">
              City (optional)
              <input
                name="city"
                className="field mt-1"
                defaultValue={defaultCity}
              />
            </label>
            <ClearDateField
              name="check_in"
              label="Check-in (optional)"
              defaultValue={defaultCheckIn}
            />
            <ClearDateField
              name="check_out"
              label="Check-out (optional)"
              defaultValue={defaultCheckOut}
            />
          </div>
          <label className="block text-xs text-ink-soft">
            Notes (optional)
            <input
              name="notes"
              className="field mt-1"
              placeholder="Guest name on booking, pin code, etc."
            />
          </label>
          <button type="submit" className="btn btn-primary text-sm">
            Save booked stay
          </button>
        </form>
      ) : null}
    </section>
  );
}
