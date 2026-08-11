# Deploy Waylo (production)

## Databases

- **Production** Supabase project → Vercel Production env vars only
- **Local** Supabase project → `.env.local` only

Never point Vercel at the local project, and never put production keys in `.env.local`.  
See [docs/LOCAL_VS_PROD.md](docs/LOCAL_VS_PROD.md).

## Pre-flight

1. Local version tagged when releasing.
2. Schema on the **production** Supabase project:
   - Prefer incremental `supabase/migrate_*.sql` files for existing projects
   - Or full `supabase/schema.sql` only on a **new** empty project
3. Supabase Auth → Email provider enabled.
4. Storage buckets (private): `passports`, `trip-docs` (see schema notes).
5. Auth URLs on the **production** project:
   - Site URL: `https://waylo-one.vercel.app`
   - Redirects: `https://waylo-one.vercel.app/**`, `…/auth/callback`

## Env vars (Vercel Production)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon/public key |
| `NEXT_PUBLIC_APP_URL` | `https://waylo-one.vercel.app` (or custom domain) |
| `GEMINI_API_KEY` | Optional — visa / ranking / assistant |

## Release steps

```bash
npm run build
git push origin main
git push origin vX.Y.Z
```

Vercel deploys from `main`. After URL changes, update `NEXT_PUBLIC_APP_URL` and redeploy.

## Smoke test after deploy

- Sign up / log in on production
- Open a trip → **Visas** and **Stay**
- Settings: add passport (+ photo if bucket exists)
