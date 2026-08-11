import { redirect } from "next/navigation";
import { joinTripByToken } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { token } = await params;
  const { role } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/invite/${token}?role=${role || "editor"}`);
  }
  await joinTripByToken(token, role || "editor");
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p>Joining trip…</p>
    </main>
  );
}
