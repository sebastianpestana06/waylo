import { TRAVEL_MODE_META } from "@/lib/templates";
import { bookingDeepLinks } from "@/lib/booking-links";
import type {
  BookingDeadline,
  BookingPrefs,
  TravelSegment,
  Trip,
} from "@/lib/types";
import {
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";

export function TripCalendar({
  trip,
  segments,
  deadlines,
  prefs,
}: {
  trip: Trip;
  segments: TravelSegment[];
  deadlines: BookingDeadline[];
  prefs?: BookingPrefs;
}) {
  const start = trip.start_date ? parseISO(trip.start_date) : null;
  const end = trip.end_date ? parseISO(trip.end_date) : null;
  const days =
    start && end && end >= start
      ? eachDayOfInterval({ start, end })
      : [];

  return (
    <div className="space-y-4 animate-fade">
      {days.length > 0 && (
        <div className="panel overflow-x-auto">
          <p className="mb-3 text-sm font-semibold text-ink-soft">
            Holiday window
          </p>
          <div className="flex min-w-max gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const daySegments = segments.filter((s) => {
                if (!s.depart_at) return false;
                return s.depart_at.slice(0, 10) === key;
              });
              const dayDeadlines = deadlines.filter((d) => d.due_date === key);
              const inHoliday =
                start && end
                  ? isWithinInterval(day, { start, end })
                  : false;
              return (
                <div
                  key={key}
                  className={`w-28 rounded-xl border p-2 ${
                    inHoliday
                      ? "border-sea/40 bg-sea/10"
                      : "border-line bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold">{format(day, "MMM d")}</p>
                  <p className="text-[10px] uppercase text-ink-soft">
                    {format(day, "EEE")}
                  </p>
                  <div className="mt-2 space-y-1">
                    {daySegments.map((s) => {
                      const meta = TRAVEL_MODE_META[s.mode];
                      return (
                        <div
                          key={s.id}
                          className="rounded-lg px-1.5 py-1 text-[10px] text-white"
                          style={{ background: meta.color }}
                          title={`${meta.label}: ${s.from_place} → ${s.to_place}`}
                        >
                          {meta.emoji} {s.from_place}→{s.to_place}
                        </div>
                      );
                    })}
                    {dayDeadlines.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-lg bg-coral/15 px-1.5 py-1 text-[10px] text-coral"
                      >
                        ⏰ {d.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-xl">Travel legs</h3>
        {segments.length === 0 && (
          <p className="text-sm text-ink-soft">No travel added yet.</p>
        )}
        {segments.map((s) => {
          const meta = TRAVEL_MODE_META[s.mode];
          const links = bookingDeepLinks(s, prefs);
          return (
            <div key={s.id} className="panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: meta.color }}>
                    {meta.emoji} {meta.label}
                  </p>
                  <p className="text-lg font-semibold">
                    {s.from_place} → {s.to_place}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {s.depart_at
                      ? format(parseISO(s.depart_at), "MMM d, HH:mm")
                      : "Dates TBD"}
                    {s.arrive_at
                      ? ` → ${format(parseISO(s.arrive_at), "MMM d, HH:mm")}`
                      : ""}
                  </p>
                </div>
                <span className="rounded-full bg-sand-deep px-2 py-1 text-xs">
                  {s.booking_status}
                </span>
              </div>
              {links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost text-xs"
                    >
                      Search on {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
