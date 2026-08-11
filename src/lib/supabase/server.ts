import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local and restart npm run dev.`,
    );
  }
  return value;
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* called from Server Component */
        }
      },
    },
  });
}
