import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TripBottomNav } from "@/components/TripBottomNav";
import { createClient } from "@/lib/supabase/server";
import type { Trip, TripMember } from "@/lib/types";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) notFound();

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();
  if (!trip) notFound();

  const t = trip as Trip;

  return (
    <div>
      <header className="border-b border-line/70 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold text-sea">
              ← All trips
            </Link>
            <h1 className="font-display text-2xl">{t.title}</h1>
          </div>
          <nav className="hidden gap-2 md:flex">
            {[
              ["", "Overview"],
              ["calendar", "Calendar"],
              ["plan", "Plan"],
              ["money", "Money"],
              ["more", "More"],
            ].map(([path, label]) => (
              <Link
                key={path || "overview"}
                href={`/trips/${tripId}${path ? `/${path}` : ""}`}
                className="btn btn-ghost text-xs"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      <TripBottomNav tripId={tripId} />
    </div>
  );
}

export type { TripMember };
