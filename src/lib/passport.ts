import { addMonths, isBefore, parseISO } from "date-fns";

/** Passport must remain valid at least 9 months after trip end. */
export function passportValidForTrip(
  expiryDate: string,
  tripEndDate: string | null | undefined,
): { ok: boolean; requiredUntil: string | null } {
  if (!tripEndDate) return { ok: true, requiredUntil: null };
  const required = addMonths(parseISO(tripEndDate), 9);
  const expiry = parseISO(expiryDate);
  return {
    ok: !isBefore(expiry, required),
    requiredUntil: required.toISOString().slice(0, 10),
  };
}
