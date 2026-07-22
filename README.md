# FreBob API server

Express + TypeScript API for the FreBob MVP.

## Local

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Health: `GET http://localhost:4000/v1/health`

Without Supabase, send `X-Demo-Mode: 1` and use business id  
`00000000-0000-4000-8000-000000000001`.

## Build / start (Render-compatible)

```bash
npm ci
npm run build   # tsc → dist/
npm start       # node dist/index.js
```

- **Build command:** `npm ci && npm run build`
- **Start command:** `npm start`
- **Root directory:** `server`
- **Node:** 20+
- **Health check path:** `/v1/health`
- Listens on `0.0.0.0:$PORT` (Render injects `PORT`)

You can also deploy from [`render.yaml`](render.yaml) (Blueprint) with rootDir `server`.

### Env vars on Render

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | auto | Set by Render |
| `HOST` | no | Defaults to `0.0.0.0` |
| `CORS_ORIGINS` | no | `*` or comma-separated origins |
| `SUPABASE_URL` | no | Enables Postgres persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | no | With URL |
| `GEMINI_API_KEY` | no | Live extract + grounded chat; mock/rules fallback |
| `YARNGPT_API_KEY` | no | TTS via YarnGPT; Pidgin stays text-only |

## Supabase

See the full runbook: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

1. Create a project.
2. Run migrations in order: `001` → `002` → `003` → `004_auth_onboarding_rls.sql`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server.
4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` on mobile.

Without server Supabase env vars the API boots in **memory mode** (demo seed).

## AI providers

- **Gemini** (`GEMINI_API_KEY`): multimodal extract + business-grounded chat  
- **YarnGPT** (`YARNGPT_API_KEY`): `POST /v1/tts` — English, Yoruba, Hausa, Igbo. **Pidgin voice is not claimed** (returns `supported: false`).

## Smoke test

```bash
npm run dev
# other terminal
npm run smoke
```

## Mobile client

Set in `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/v1
```

or your Render URL ending in `/v1`. Restart Expo after changing. The app sends `X-Demo-Mode: 1` in memory mode.

## Auth

- Memory / Explore Demo: header `X-Demo-Mode: 1`
- Supabase mode: `Authorization: Bearer <access_token>` + business membership
- Setup: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)
