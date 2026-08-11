import { createEvents, type EventAttributes } from "ics";
import type {
  BookingDeadline,
  ItineraryItem,
  TravelSegment,
  Trip,
} from "./types";

function toIcsDate(iso: string): [number, number, number, number, number] {
  const d = new Date(iso);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

function toIcsDay(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

export function buildTripIcs(input: {
  trip: Trip;
  segments: TravelSegment[];
  itinerary: ItineraryItem[];
  deadlines: BookingDeadline[];
}): string {
  const events: EventAttributes[] = [];

  if (input.trip.start_date && input.trip.end_date) {
    events.push({
      title: `${input.trip.title} (holiday)`,
      description: "Holiday window",
      start: toIcsDay(input.trip.start_date),
      end: toIcsDay(input.trip.end_date),
    });
  }

  for (const s of input.segments) {
    if (!s.depart_at || !s.arrive_at) continue;
    events.push({
      title: `${s.mode}: ${s.from_place} → ${s.to_place}`,
      start: toIcsDate(s.depart_at),
      end: toIcsDate(s.arrive_at),
      startInputType: "utc",
      endInputType: "utc",
    });
  }

  for (const i of input.itinerary) {
    events.push({
      title: i.title,
      description: i.notes || undefined,
      url: i.maps_url || undefined,
      start: toIcsDay(i.day_date),
      end: toIcsDay(i.day_date),
    });
  }

  for (const d of input.deadlines) {
    events.push({
      title: `Deadline: ${d.label}`,
      start: toIcsDay(d.due_date),
      end: toIcsDay(d.due_date),
    });
  }

  const { error, value } = createEvents(events);
  if (error || !value) throw error || new Error("ICS generation failed");
  return value;
}
