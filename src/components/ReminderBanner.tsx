import type { ReminderItem } from "@/lib/types";
import Link from "next/link";

export function ReminderBanner({
  items,
}: {
  items: ReminderItem[];
}) {
  if (!items.length) return null;
  const top = items.slice(0, 4);
  return (
    <div className="animate-banner sticky top-0 z-40 border-b border-line bg-[#fff4e8]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3">
        {top.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-start justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 text-sm shadow-sm ring-1 ring-line/60 transition hover:bg-white"
          >
            <div>
              <p className="font-semibold text-ink">{item.title}</p>
              <p className="text-ink-soft">{item.body}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-coral">
              {item.kind === "owe" ? "Pay" : "Open"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
