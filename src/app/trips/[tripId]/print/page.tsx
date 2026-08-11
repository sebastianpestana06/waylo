import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem, Trip } from "@/lib/types";

export default async function PrintPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: trip }, { data: checklist }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase
      .from("checklist_items")
      .select("*")
      .eq("trip_id", tripId)
      .order("sort_order"),
  ]);
  if (!trip) notFound();
  const t = trip as Trip;

  return (
    <main className="mx-auto max-w-2xl bg-white px-6 py-10 text-black print:p-0">
      <h1 className="font-display text-3xl">{t.title} — packing & checklist</h1>
      <p className="mt-1 text-sm">
        {t.start_date} → {t.end_date}
      </p>
      <ul className="mt-6 space-y-2">
        {((checklist || []) as ChecklistItem[]).map((item) => (
          <li key={item.id} className="flex gap-3 border-b border-neutral-200 py-2">
            <span className="inline-block h-5 w-5 rounded border border-neutral-400" />
            <span className={item.done ? "line-through opacity-60" : ""}>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.print();",
        }}
      />
    </main>
  );
}
