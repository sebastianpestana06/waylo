# Deploy Waylo (production)

## Pre-flight

1. Local version tagged (`v0.2.0-local` / `v0.2.0`).
2. Supabase migrations applied:
   - Prefer `supabase/migrate_accommodation.sql` (Stay searches + booked stays + rooms)
   - Or full `supabase/schema.sql` only on a **new** empty project
3. Supabase Auth → Email provider enabled.
4. Storage buckets (private): `passports`, `trip-docs` (see schema notes).

## Env vars (Vercel Production)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Your production URL (`https://….vercel.app` or custom domain) |
| `GEMINI_API_KEY` | Optional — visa / ranking / assistant |

## Release steps

```bash
# from a clean build
npm run build

git push origin main
git push origin v0.2.0
```

Then in [Vercel](https://vercel.com):

1. Import / reconnect `sebastianpestana06/waylo` if needed.
2. Set the env vars above for **Production**.
3. Deploy (or wait for the `main` push).
4. After the first URL is known, set `NEXT_PUBLIC_APP_URL` to that URL and **Redeploy**.

## Smoke test after deploy

- Sign up / log in
- Open a trip → **Stay**: rank sites, open Booking with dates/guests/rooms
- Settings: add passport (+ photo if bucket exists)
- Booked stay save
