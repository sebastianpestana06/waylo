import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "");
    const password = String(body.password || "");
    const display_name = String(body.display_name || "");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: "Server missing Supabase env. Restart npm run dev." },
        { status: 500 },
      );
    }

    const authClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          try {
            return await fetch(input, init);
          } catch (err) {
            const cause =
              err instanceof Error && "cause" in err
                ? String((err as Error & { cause?: unknown }).cause)
                : "";
            throw new Error(
              `Network error reaching Supabase: ${err instanceof Error ? err.message : String(err)}${cause ? ` (${cause})` : ""}`,
            );
          }
        },
      },
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { data, error } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: { display_name },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.session) {
      const cookieStore = await cookies();
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      });
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    return NextResponse.json({
      ok: true,
      needsEmailConfirm: !data.session,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unexpected signup error talking to Supabase";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
