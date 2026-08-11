"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AccommodationResultGallery } from "@/components/AccommodationResultGallery";
import { ClearDateField } from "@/components/ClearDateField";
import {
  parseGuestCount,
  parseRoomCount,
  resolveRoomCount,
} from "@/lib/accommodation-search";
import { formatDateClear } from "@/lib/dates";
import type { AccommodationSearch } from "@/lib/types";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function AccommodationSearchPanel({
  tripId,
  canEdit,
  defaultCity,
  defaultCheckIn,
  defaultCheckOut,
  defaultAdults,
  defaultRooms,
  initialSearches,
}: {
  tripId: string;
  canEdit: boolean;
  defaultCity: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultAdults: number;
  defaultRooms?: number;
  initialSearches: AccommodationSearch[];
}) {
  const [city, setCity] = useState(defaultCity);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [maxStationKm, setMaxStationKm] = useState("");
  const [budget, setBudget] = useState("80");
  const [currency, setCurrency] = useState("EUR");
  const [adults, setAdults] = useState(String(defaultAdults));
  const [rooms, setRooms] = useState(
    String(
      defaultRooms ??
        Math.max(1, Math.ceil(parseGuestCount(defaultAdults) / 2)),
    ),
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [searches, setSearches] = useState(initialSearches);

  const latest = searches[0] || null;
  const latestGuestCount = latest ? parseGuestCount(latest.adults) : 2;
  const latestRoomCount = latest
    ? resolveRoomCount(latest.rooms, latest.adults)
    : 1;

  const nights = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
    const a = new Date(`${checkIn}T12:00:00Z`).getTime();
    const b = new Date(`${checkOut}T12:00:00Z`).getTime();
    return Math.max(0, Math.round((b - a) / 86400000));
  }, [checkIn, checkOut]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    setError("");
    setWarning("");
    try {
      const res = await fetch(`/api/trips/${tripId}/accommodation/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          checkIn,
          checkOut,
          maxStationKm: maxStationKm.trim() ? Number(maxStationKm) : null,
          budgetPerPersonNight: Number(budget),
          currency,
          adults: parseGuestCount(adults),
          guestCount: parseGuestCount(adults),
          rooms: parseRoomCount(rooms, Math.max(1, Math.ceil(parseGuestCount(adults) / 2))),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }
      if (data.warning) setWarning(data.warning);
      if (data.search) {
        setSearches((prev) => [data.search as AccommodationSearch, ...prev]);
      }
    } catch {
      setError("Network error while searching.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel space-y-3">
        <div>
          <h2 className="font-display text-2xl">Find stays</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Enter your filters. Waylo ranks booking websites from best to worst
            fit (1–10) and opens each site with your city, dates, guests and
            rooms (when the site supports rooms) already filled in.
          </p>
        </div>

        {canEdit ? (
          <form onSubmit={onSearch} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-ink-soft">
                City
                <input
                  className="field mt-1"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  placeholder="Kyoto"
                />
              </label>
              <label className="text-xs text-ink-soft">
                Adults / guests
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  max={16}
                  value={adults}
                  onChange={(e) => setAdults(e.target.value)}
                  required
                />
              </label>
              <label className="text-xs text-ink-soft">
                Rooms
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  max={8}
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  required
                />
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Used where the site supports rooms (not Airbnb / Google /
                  Vrbo).
                </span>
              </label>
              <ClearDateField
                label="Arrival"
                value={checkIn}
                onChange={setCheckIn}
                required
              />
              <ClearDateField
                label="Departure"
                value={checkOut}
                onChange={setCheckOut}
                required
              />
              <label className="text-xs text-ink-soft">
                Max km to train station (optional)
                <input
                  className="field mt-1"
                  type="number"
                  min={0}
                  step={0.1}
                  value={maxStationKm}
                  onChange={(e) => setMaxStationKm(e.target.value)}
                  placeholder="e.g. 1.5"
                />
              </label>
              <label className="text-xs text-ink-soft">
                Budget / person / night
                <div className="mt-1 flex gap-2">
                  <input
                    className="field"
                    type="number"
                    min={1}
                    step={1}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    required
                  />
                  <select
                    className="field w-24"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {["EUR", "USD", "GBP", "JPY", "AUD", "CAD"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            <label className="block text-xs text-ink-soft">
              Notes (optional — helps ranking)
              <input
                className="field mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Apartment with kitchen, near station, Asia trip…"
              />
            </label>
            {nights > 0 ? (
              <p className="text-xs text-ink-soft">{nights} night(s)</p>
            ) : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            {warning ? <p className="text-sm text-amber-800">{warning}</p> : null}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Ranking sites…" : "Rank booking sites"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-ink-soft">
            View-only: ask an editor to run a site ranking.
          </p>
        )}
      </section>

      {latest ? (
        <section className="panel space-y-4">
          <div>
            <p className="text-sm text-ink-soft">
              {latest.city} · {formatDateClear(latest.check_in)} →{" "}
              {formatDateClear(latest.check_out)} ·{" "}
              <span className="font-medium text-ink">
                {latestGuestCount} guest
                {latestGuestCount === 1 ? "" : "s"}
              </span>
              {" · "}
              <span className="font-medium text-ink">
                {latestRoomCount} room
                {latestRoomCount === 1 ? "" : "s"}
              </span>{" "}
              · budget{" "}
              {formatMoney(
                Number(latest.budget_per_person_night),
                latest.currency,
              )}
              /person/night
              {latest.max_station_km != null
                ? ` · ≤ ${latest.max_station_km} km to station`
                : ""}
            </p>
            {latest.ai_summary ? (
              <p className="mt-2 text-sm">{latest.ai_summary}</p>
            ) : null}
          </div>

          <AccommodationResultGallery search={latest} />
        </section>
      ) : null}

      {searches.length > 1 ? (
        <section className="panel space-y-2">
          <h3 className="font-display text-xl">Previous rankings</h3>
          <ul className="space-y-2 text-sm">
            {searches.slice(1).map((s) => (
              <li
                key={s.id}
                className="rounded-xl bg-white px-3 py-2 ring-1 ring-line/40"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() =>
                    setSearches((prev) => [
                      s,
                      ...prev.filter((x) => x.id !== s.id),
                    ])
                  }
                >
                  <span className="font-medium">{s.city}</span>
                  <span className="text-ink-soft">
                    {" "}
                    · {formatDateClear(s.check_in)} →{" "}
                    {formatDateClear(s.check_out)} ·{" "}
                    {parseGuestCount(s.adults)} guest
                    {parseGuestCount(s.adults) === 1 ? "" : "s"} ·{" "}
                    {resolveRoomCount(s.rooms, s.adults)} room
                    {resolveRoomCount(s.rooms, s.adults) === 1 ? "" : "s"} ·{" "}
                    {formatMoney(Number(s.budget_per_person_night), s.currency)}
                    /ppn
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
