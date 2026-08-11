# Deploy Waylo (free)

## 1. Supabase

1. Create a project at https://supabase.com
2. SQL Editor → run `supabase/schema.sql`
3. Authentication → enable Email provider
4. Copy Project URL + anon key

## 2. Gemini (optional, for VISA checker)

Create an API key at https://aistudio.google.com/apikey

## 3. GitHub

```bash
gh auth login
gh repo create waylo --public --source=. --remote=origin --push
git tag v0.1.0
git push origin v0.1.0
```

## 4. Vercel

1. Import the `waylo` GitHub repo at https://vercel.com/new
2. Set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your `https://….vercel.app` URL)
   - `GEMINI_API_KEY` (optional)
3. Deploy — every push to `main` updates production
