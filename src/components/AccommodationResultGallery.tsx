"use client";

import { useMemo } from "react";
import {
  normalizeIsoDate,
  normalizeRankedSites,
  parseGuestCount,
  resolveRoomCount,
  wayloSiteOpenPath,
  type AccommodationSearchInput,
} from "@/lib/accommodation-search";
import { formatDateClear } from "@/lib/dates";
import type { AccommodationSearch, RankedBookingSite } from "@/lib/types";

function scoreColor(score: number) {
  if (score >= 8) return "bg-emerald-100 text-emerald-900";
  if (score >= 5) return "bg-amber-100 text-amber-900";
  return "bg-stone-100 text-stone-700";
}

function SiteRankCard({
  site,
  rank,
  openHref,
  filtersHint,
}: {
  site: RankedBookingSite;
  rank: number;
  openHref: string;
  filtersHint: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-soft">#{rank}</span>
          <h4 className="font-display text-xl leading-tight">{site.label}</h4>
          <span
            className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${scoreColor(site.fit_score)}`}
          >
            {site.fit_score}/10 fit
          </span>
        </div>
        <p className="text-sm text-ink-soft">{site.why_fit}</p>
        <p className="text-[11px] text-ink-soft">Opens with: {filtersHint}</p>
        {site.strengths?.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {site.strengths.map((s) => (
              <li
                key={s}
                className="rounded-full bg-sea/10 px-2 py-0.5 text-[11px] text-sea-deep"
              >
                {s}
              </li>
            ))}
          </ul>
        ) : null}
        {site.caveats?.length ? (
          <p className="text-[11px] text-ink-soft">
            Note: {site.caveats.join(" · ")}
          </p>
        ) : null}
      </div>
      <a
        href={openHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary shrink-0 text-sm"
      >
        Open with your filters
      </a>
    </article>
  );
}

export function AccommodationResultGallery({
  search,
}: {
  search: AccommodationSearch;
}) {
  const guests = parseGuestCount(search.adults);
  const rooms = resolveRoomCount(search.rooms, guests);
  const checkIn = normalizeIsoDate(search.check_in);
  const checkOut = normalizeIsoDate(search.check_out);

  const searchInput: AccommodationSearchInput = useMemo(
    () => ({
      city: search.city,
      checkIn,
      checkOut,
      budgetPerPersonNight: Number(search.budget_per_person_night),
      currency: search.currency,
      adults: guests,
      rooms,
      maxStationKm:
        search.max_station_km == null ? null : Number(search.max_station_km),
    }),
    [search, guests, rooms, checkIn, checkOut],
  );

  const sites = useMemo(
    () => normalizeRankedSites(search.results, searchInput),
    [search.results, searchInput],
  );

  const filtersHint = `${search.city} · ${formatDateClear(checkIn)} → ${formatDateClear(checkOut)} · ${guests} guest${guests === 1 ? "" : "s"} · ${rooms} room${rooms === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl">Best sites for your filters</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Websites ranked 1–10 for {filtersHint}. Each button rebuilds a fresh
          search URL with your filters, then opens the site.
        </p>
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-ink-soft">No sites ranked yet.</p>
      ) : (
        <div className="space-y-3">
          {sites.map((site, i) => (
            <SiteRankCard
              key={site.label}
              site={site}
              rank={i + 1}
              openHref={wayloSiteOpenPath(site.label, searchInput)}
              filtersHint={filtersHint}
            />
          ))}
        </div>
      )}
    </div>
  );
}
