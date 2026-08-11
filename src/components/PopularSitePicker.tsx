"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  SERVICE_FEATURES,
  sitesForFeature,
  type PopularSite,
  type ServiceFeature,
} from "@/lib/popular-sites";

export function PopularSitePicker({
  excludeProviders,
  onSelect,
}: {
  excludeProviders: string[];
  onSelect: (site: PopularSite) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [feature, setFeature] = useState<ServiceFeature | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const excluded = useMemo(
    () => new Set(excludeProviders.map((p) => p.toLowerCase())),
    [excludeProviders],
  );

  const options = useMemo(() => {
    return sitesForFeature(feature, query).filter((site) => {
      try {
        const host = new URL(site.url).hostname.replace(/^www\./, "").toLowerCase();
        return !excluded.has(host) && !excluded.has(site.id);
      } catch {
        return !excluded.has(site.id);
      }
    });
  }, [feature, query, excluded]);

  useEffect(() => {
    setHighlight(0);
  }, [feature, query, open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(site: PopularSite) {
    onSelect(site);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const site = options[highlight];
      if (site) pick(site);
    }
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <label className="block text-xs text-ink-soft">
        Feature
        <select
          className="field mt-1"
          value={feature}
          onChange={(e) => {
            setFeature(e.target.value as ServiceFeature | "all");
            setOpen(true);
          }}
        >
          <option value="all">All features</option>
          {SERVICE_FEATURES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-ink-soft">
        Popular websites
        <span className="mt-0.5 block font-normal text-[11px] text-ink-soft/80">
          Alphabetical list · type to search
        </span>
        <div className="relative mt-1">
          <input
            type="search"
            className="field"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder="Search Agoda, Booking.com, Skyscanner…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {open ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-line/50"
            >
              {options.length === 0 ? (
                <li className="px-3 py-2 text-ink-soft">No matching sites</li>
              ) : (
                options.map((site, i) => (
                  <li key={site.id} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-sand/50 ${
                        i === highlight ? "bg-sand/60" : ""
                      }`}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => pick(site)}
                    >
                      <span className="font-medium text-ink">{site.label}</span>
                      <span className="text-[11px] text-ink-soft">
                        {site.url.replace(/^https?:\/\//, "")}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </label>
    </div>
  );
}
