# Waylo

Collaborative holiday trip planner — calendar, checklists, split payments, visas, and more.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth, Postgres, Storage, Realtime)
- Gemini (VISA guidance)
- Open-Meteo (weather)
- Vercel hosting

## Setup (local)

Use a **separate Supabase project** from production. See [docs/LOCAL_VS_PROD.md](docs/LOCAL_VS_PROD.md).

1. Create a free Supabase project for local use (e.g. `waylo-local`).
2. In that project’s SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy [`.env.example`](.env.example) → `.env.local` and fill in the **local** project URL + anon key.
4. Set Auth Site URL to `http://localhost:3000` (and add redirect URLs).
5. Optional: add `GEMINI_API_KEY` for AI visa checks.
6. Install and run:

```bash
npm install
npm run dev
```

## Production

Do **not** reuse local keys. Set production Supabase + `NEXT_PUBLIC_APP_URL` in Vercel only. Details: [DEPLOY.md](DEPLOY.md).

## Versioning

Semver in `package.json`, notes in `CHANGELOG.md`, git tags `vX.Y.Z` on releases. App version appears on the Account page.
