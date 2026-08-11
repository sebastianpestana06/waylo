import { differenceInCalendarDays, parseISO } from "date-fns";
import { detectSegmentConflicts } from "./conflicts";
import { passportValidForTrip } from "./passport";
import type {
  BookingDeadline,
  ExpensePayment,
  Passport,
  Profile,
  ReminderItem,
  TravelSegment,
  Trip,
  VisaCheckResult,
} from "./types";

type AlertInput = {
  trips: Trip[];
  deadlines: BookingDeadline[];
  payments: (ExpensePayment & {
    expense_shares?: {
      id: string;
      user_id: string;
      share_amount: number;
      paid: boolean;
    }[];
    creator?: Profile;
  })[];
  segmentsByTrip: Record<string, TravelSegment[]>;
  passports: Passport[];
  userId: string;
  profilesById?: Record<string, Profile>;
};

export function buildReminders(input: AlertInput): ReminderItem[] {
  const items: ReminderItem[] = [];
  const tripById = Object.fromEntries(input.trips.map((t) => [t.id, t]));

  for (const payment of input.payments) {
    const trip = tripById[payment.trip_id];
    if (!trip) continue;
    const shares = payment.expense_shares ?? [];
    const myShare = shares.find((s) => s.user_id === input.userId);
    const payeeName =
      payment.creator?.display_name ||
      input.profilesById?.[payment.created_by]?.display_name ||
      "a trip mate";

    if (
      myShare &&
      !myShare.paid &&
      payment.created_by !== input.userId &&
      myShare.share_amount > 0
    ) {
      items.push({
        id: `owe-${myShare.id}`,
        priority: 1,
        kind: "owe",
        title: `You owe ${formatMoney(myShare.share_amount, payment.currency)}`,
        body: `Pay ${payeeName} for ${payment.description}`,
        href: `/trips/${trip.id}/money?focus=${myShare.id}`,
        tripId: trip.id,
      });
    }

    if (payment.created_by === input.userId) {
      const unpaid = shares.filter(
        (s) => !s.paid && s.user_id !== input.userId,
      );
      if (unpaid.length) {
        items.push({
          id: `await-${payment.id}`,
          priority: 5,
          kind: "awaiting",
          title: `Waiting on ${unpaid.length} repayment(s)`,
          body: payment.description,
          href: `/trips/${trip.id}/money?focus=${payment.id}`,
          tripId: trip.id,
        });
      }
    }
  }

  const soon = 14;
  for (const d of input.deadlines) {
    if (d.done) continue;
    const days = differenceInCalendarDays(parseISO(d.due_date), new Date());
    if (days <= soon) {
      items.push({
        id: `dl-${d.id}`,
        priority: 2,
        kind: "deadline",
        title: days < 0 ? `Overdue: ${d.label}` : `Due soon: ${d.label}`,
        body: `Ideal booking deadline ${d.due_date}`,
        href: `/trips/${d.trip_id}/calendar`,
        tripId: d.trip_id,
      });
    }
  }

  for (const trip of input.trips) {
    const visa = trip.last_visa_check as VisaCheckResult | null;
    if (visa?.likely_required) {
      items.push({
        id: `visa-${trip.id}`,
        priority: 2,
        kind: "visa",
        title: `Visa may be needed for ${visa.destination}`,
        body: visa.summary.slice(0, 120),
        href: `/trips/${trip.id}/more`,
        tripId: trip.id,
      });
    }

    for (const p of input.passports) {
      const check = passportValidForTrip(p.expiry_date, trip.end_date);
      if (!check.ok) {
        items.push({
          id: `pass-${trip.id}-${p.id}`,
          priority: 2,
          kind: "passport",
          title: "Passport renewal suggested",
          body: `${p.issuing_country} passport should be valid until at least ${check.requiredUntil} (9 months after trip end).`,
          href: `/settings`,
          tripId: trip.id,
        });
      }
    }

    const conflicts = detectSegmentConflicts(
      input.segmentsByTrip[trip.id] ?? [],
    );
    for (const c of conflicts) {
      items.push({
        id: `cf-${c.aId}-${c.bId}`,
        priority: 3,
        kind: "conflict",
        title: "Travel schedule conflict",
        body: c.message,
        href: `/trips/${trip.id}/calendar`,
        tripId: trip.id,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
