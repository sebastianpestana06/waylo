"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleDollarSign,
  ListChecks,
  MoreHorizontal,
  Route,
} from "lucide-react";

const items = [
  { href: "overview", label: "Trip", icon: Route },
  { href: "calendar", label: "Calendar", icon: CalendarDays },
  { href: "plan", label: "Plan", icon: ListChecks },
  { href: "money", label: "Money", icon: CircleDollarSign },
  { href: "more", label: "More", icon: MoreHorizontal },
];

export function TripBottomNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
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
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] ${
                  active ? "bg-sea/10 text-sea-deep" : "text-ink-soft"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
