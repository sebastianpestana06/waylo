import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/types";

export default async function HomePage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) redirect("/dashboard");
    } catch {
      /* env incomplete */
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">
        Collaborative trips
      </p>
      <h1 className="font-display mt-3 max-w-xl text-5xl leading-tight text-ink md:text-6xl">
        {APP_NAME}
      </h1>
      <p className="mt-4 max-w-lg text-lg text-ink-soft">
        Plan holidays together — calendar, checklists, visas, and fair split
        payments in one shared place.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login" className="btn btn-primary">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-ghost">
          Create account
        </Link>
      </div>
      {!url && (
        <p className="mt-8 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
          Add Supabase env vars (see `.env.example`) to enable auth and data.
        </p>
      )}
    </main>
  );
}
