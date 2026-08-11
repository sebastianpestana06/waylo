# Local vs production databases

Waylo uses **two Supabase projects**:

| Environment | Where keys live | Supabase project |
|-------------|-----------------|------------------|
| Local (`npm run dev`) | `.env.local` (gitignored) | Dev / local project |
| Production (Vercel) | Vercel → Project → Settings → Environment Variables | Production project |

They must **not** share the same `NEXT_PUBLIC_SUPABASE_URL`. Local testing should never write to live trip data.

## One-time: create the local database

1. In [Supabase](https://supabase.com/dashboard), create a new project (e.g. `waylo-local`).
2. Rename the existing live project to something like `waylo-prod` if it isn’t already clear.
3. In the **local** project SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) (fresh project only).
4. Create private storage buckets if the schema notes require them: `passports`, `trip-docs`.
5. Auth → URL configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`, `http://localhost:3000/auth/callback`
6. Auth → Providers → Email: enabled.
7. Copy **Project URL** + **anon public** key into `.env.local` (from `.env.example`).
8. Restart `npm run dev`.

Sign up again on localhost — users do not carry over between projects.

## Production stays on Vercel

- Keep production Supabase URL + anon key only in **Vercel Production** env vars.
- Auth Site URL / redirects on the **prod** project: `https://waylo-one.vercel.app` (and `/auth/callback`).
- Apply incremental migrations (`supabase/migrate_*.sql`) on **each** project when you ship schema changes.

## Quick check

- Local: open Supabase dashboard for `waylo-local` while using `npm run dev` — new trips appear there.
- Prod: open `waylo-prod` while using https://waylo-one.vercel.app — live trips stay there.
