import { formatDateClear } from "@/lib/dates";
import type { Passport } from "@/lib/types";
import { deletePassport } from "@/lib/actions";

export type PassportWithFile = Passport & {
  fileUrl: string | null;
  fileKind: "image" | "pdf" | "other" | null;
};

export function PassportRegistrationList({
  passports,
}: {
  passports: PassportWithFile[];
}) {
  if (passports.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No passports saved yet. Add one below — it will appear here with the
        details you entered and any photo you upload.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {passports.map((p) => (
        <li
          key={p.id}
          className="overflow-hidden rounded-xl bg-white ring-1 ring-line/50"
        >
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
            <div className="shrink-0">
              {p.fileUrl && p.fileKind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={p.fileUrl} target="_blank" rel="noreferrer">
                  <img
                    src={p.fileUrl}
                    alt={`Passport scan — ${p.issuing_country}`}
                    className="h-28 w-44 rounded-lg object-cover ring-1 ring-line/40"
                  />
                </a>
              ) : p.fileUrl && p.fileKind === "pdf" ? (
                <a
                  href={p.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-28 w-44 flex-col items-center justify-center rounded-lg bg-stone-100 text-center text-xs text-ink ring-1 ring-line/40"
                >
                  <span className="font-medium">PDF scan</span>
                  <span className="mt-1 text-ink-soft">Open file</span>
                </a>
              ) : p.fileUrl ? (
                <a
                  href={p.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-28 w-44 items-center justify-center rounded-lg bg-stone-100 text-xs text-ink-soft ring-1 ring-line/40"
                >
                  View file
                </a>
              ) : (
                <div className="flex h-28 w-44 items-center justify-center rounded-lg bg-stone-50 text-center text-xs text-ink-soft ring-1 ring-dashed ring-line/50">
                  No photo uploaded
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5 text-sm">
              <p className="font-display text-lg leading-tight text-ink">
                {p.issuing_country} passport
              </p>
              <dl className="grid gap-1 text-ink-soft sm:grid-cols-[7.5rem_1fr]">
                <dt>Issuing country</dt>
                <dd className="text-ink">{p.issuing_country}</dd>
                <dt>Passport number</dt>
                <dd className="text-ink">
                  {p.passport_number || (
                    <span className="text-ink-soft">Not provided</span>
                  )}
                </dd>
                <dt>Expiry date</dt>
                <dd className="text-ink">{formatDateClear(p.expiry_date)}</dd>
                <dt>Scan / photo</dt>
                <dd className="text-ink">
                  {p.fileUrl ? (
                    <a
                      href={p.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {p.fileKind === "pdf" ? "Open PDF" : "View full size"}
                    </a>
                  ) : (
                    <span className="text-ink-soft">None</span>
                  )}
                </dd>
              </dl>
            </div>

            <form action={deletePassport} className="sm:self-start">
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-ghost text-xs" type="submit">
                Remove
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
