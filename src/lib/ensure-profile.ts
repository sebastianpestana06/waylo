import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** After wiping public schema, auth users can remain without a profiles row. */
export async function ensureProfile(supabase: Supabase, user: User) {
  const display_name =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    user.email?.split("@")[0] ||
    "Traveler";

  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, display_name },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(`Could not restore profile: ${error.message}`);
  }
}
