"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  CircleDollarSign,
  ListChecks,
  MoreHorizontal,
  Route,
  Stamp,
} from "lucide-react";

const items = [
  { href: "overview", label: "Trip", icon: Route },
  { href: "calendar", label: "Cal", icon: CalendarDays },
  { href: "stay", label: "Stay", icon: BedDouble },
  { href: "visas", label: "Visas", icon: Stamp },
  { href: "plan", label: "Plan", icon: ListChecks },
  { href: "money", label: "Money", icon: CircleDollarSign },
  { href: "more", label: "More", icon: MoreHorizontal },
];

export function TripBottomNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-7 gap-0 px-0.5 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const target =
            href === "overview"
              ? `/trips/${tripId}`
              : `/trips/${tripId}/${href}`;
          const active =
            href === "overview"
              ? pathname === `/trips/${tripId}`
              : pathname?.startsWith(target);
          return (
            <li key={href}>
              <Link
                href={target}
                className={`flex flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[10px] ${
                  active ? "bg-sea/10 text-sea-deep" : "text-ink-soft"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
