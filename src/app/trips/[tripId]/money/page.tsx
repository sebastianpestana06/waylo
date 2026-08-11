import { notFound, redirect } from "next/navigation";
import { MoneyPanel } from "@/components/MoneyPanel";
import { createClient } from "@/lib/supabase/server";
import type { ExpensePayment, Profile, TripMember } from "@/lib/types";

export default async function MoneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { tripId } = await params;
  const { focus } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: member }, { data: members }, { data: payments }] =
    await Promise.all([
      supabase
        .from("trip_members")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("trip_members")
        .select("*, profiles(*)")
        .eq("trip_id", tripId),
      supabase
        .from("expense_payments")
        .select("*, expense_shares(*)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
    ]);

  if (!member) notFound();
  const canEdit = member.role === "owner" || member.role === "editor";
  const memberRows = (members || []) as TripMember[];
  const profiles: Record<string, Profile> = {};
  for (const m of memberRows) {
    if (m.profiles) profiles[m.user_id] = m.profiles as Profile;
  }

  return (
    <MoneyPanel
      tripId={tripId}
      payments={(payments || []) as ExpensePayment[]}
      members={memberRows}
      profiles={profiles}
      userId={user.id}
      canEdit={canEdit}
      focusId={focus}
    />
  );
}
