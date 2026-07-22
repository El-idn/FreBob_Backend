# Supabase setup (FreBob)

End-to-end path: **Supabase Auth (mobile)** → **Express API (Bearer JWT)** → **Postgres via service role**.

## 1. Create a Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** and run migrations in order from `supabase/migrations/`:
   - `001_frebob_core.sql`
   - `002_rls_and_phone.sql`
   - `003_demo_seed.sql`
   - `004_auth_onboarding_rls.sql`

## 2. Auth settings

1. **Authentication → Providers → Email** — enable Email.
2. For local / MVP testing, turn off **Confirm email** so `signUp` returns a session immediately.
3. If confirm email stays on, the app shows “check your email” and the user must sign in after confirming.

## 3. Server env (`server/.env`)

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- Use the **service role** key only on the server (never in the mobile app).
- Without these, the API runs in **memory mode** and `/v1/auth/*` returns 503.

Also set `GEMINI_API_KEY` / `YARNGPT_API_KEY` as needed for live AI.

## 4. Mobile env (`mobile/.env`)

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/v1
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Restart Expo with a clean cache after changing env: `npx expo start -c`.

## 5. Smoke checklist

1. Sign up with email/password (or sign in).
2. App calls `POST /v1/auth/bootstrap` → row in `public.users` with `auth_user_id`.
3. Complete onboarding → `POST /v1/auth/businesses` → one `businesses` + `business_members` (owner).
4. Capture → review → approve → order under that business UUID.
5. AI chat returns an API answer (not only local templates).
6. Business settings Save → `PATCH /v1/businesses/:id` updates the **same** row (no second business).

## 6. Explore Demo

“Explore Demo” still uses `X-Demo-Mode: 1` and the seeded demo business id  
`00000000-0000-4000-8000-000000000001`. It does not require a Supabase session.
