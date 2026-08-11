# Waylo

Collaborative holiday trip planner — calendar, checklists, split payments, visas, and more.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth, Postgres, Storage, Realtime)
- Gemini (VISA guidance)
- Open-Meteo (weather)
- Vercel hosting

## Setup

1. Create a free [Supabase](https://supabase.com) project.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in keys.
4. Optional: add `GEMINI_API_KEY` for AI visa checks.
5. Install and run:

```bash
npm install
npm run dev
```

6. Deploy: push to GitHub and import the repo in [Vercel](https://vercel.com). Set the same env vars. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.

## Versioning

Semver in `package.json`, notes in `CHANGELOG.md`, git tags `vX.Y.Z` on releases. App version appears on the Account page.
