"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, Map } from "lucide-react";

export function AppBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Trips", icon: Home },
    { href: "/settings", label: "Account", icon: Settings },
  ];
  if (pathname?.startsWith("/trips/")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg justify-around px-4 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs ${
                  active ? "text-sea-deep" : "text-ink-soft"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-ink-soft/50">
          <Map size={18} />
          Waylo
        </li>
      </ul>
    </nav>
  );
}
