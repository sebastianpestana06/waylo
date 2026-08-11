/** Shared date helpers — always store ISO (YYYY-MM-DD); display unambiguously. */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DOTTED_RE = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/;

export type DateOrder = "dmy" | "mdy";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isValidYmd(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Coerce to YYYY-MM-DD, or "" if invalid. */
export function toIsoDate(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso?.[1] && ISO_RE.test(iso[1])) {
    const [, y, m, d] = iso[1].match(ISO_RE)!;
    return isValidYmd(Number(y), Number(m), Number(d)) ? iso[1] : "";
  }
  return "";
}

/**
 * Parse a user-typed date.
 * - ISO YYYY-MM-DD is always accepted
 * - Dotted/slashed numbers need an explicit order (dmy vs mdy)
 * Ambiguous values like 05.04.2026 are never guessed.
 */
export function parseOrderedDate(
  value: unknown,
  order: DateOrder,
): string {
  const s = String(value ?? "").trim();
  if (!s) return "";

  const fromIso = toIsoDate(s);
  if (fromIso) return fromIso;

  const m = s.match(DOTTED_RE);
  if (!m) return "";

  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);

  const day = order === "dmy" ? a : b;
  const month = order === "dmy" ? b : a;

  // If both parts could be a month (<=12), still trust the chosen order —
  // that is how we distinguish 05.04.2026 (5 Apr) from 05.04.2026 MDY (4 May).
  if (!isValidYmd(y, month, day)) return "";
  return `${y}-${pad2(month)}-${pad2(day)}`;
}

/** Display as dd.mm.yyyy (day.month.year) — never mm.dd.yyyy. */
export function formatDdMmYyyy(iso: unknown): string {
  const v = toIsoDate(iso);
  if (!v) return "";
  const [, y, m, d] = v.match(ISO_RE)!;
  return `${d}.${m}.${y}`;
}

/** Unambiguous long form, e.g. "5 April 2026". */
export function formatDateLong(iso: unknown): string {
  const v = toIsoDate(iso);
  if (!v) return "";
  return new Date(`${v}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Combined label for UI: "05.04.2026 · 5 April 2026". */
export function formatDateClear(iso: unknown): string {
  const dotted = formatDdMmYyyy(iso);
  const long = formatDateLong(iso);
  if (!dotted) return "";
  return `${dotted} · ${long}`;
}
