import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/api.js';
import { getGeminiApiKey, getGeminiModel } from './services/gemini.js';
import { mountSwagger } from './swagger.js';

// Always load server/.env (override so stale shell/CI env cannot shadow a new key).
// tsx watch does not reload .env — restart `npm run dev` after changing it.
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env'), override: true });

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

const allowedOrigins = (process.env.CORS_ORIGINS ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  }),
);
app.use(express.json({ limit: '8mb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'FreBob API',
    docs: '/docs',
    openapi: '/v1/openapi.json',
    health: '/v1/health',
    version: '1.0.0',
  });
});

mountSwagger(app);
app.use('/v1', apiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

function geminiKeyHint(key: string | undefined): string | null {
  if (!key) return null;
  const prefix = key.slice(0, Math.min(4, key.length));
  return `${prefix}…(len ${key.length})`;
}

app.listen(port, host, () => {
  console.log(`FreBob server listening on http://${host}:${port}`);
  console.log(`Docs:   http://${host}:${port}/docs`);
  console.log(`Health: http://${host}:${port}/v1/health`);
  const hint = geminiKeyHint(getGeminiApiKey());
  console.log(
    hint
      ? `Gemini:  model=${getGeminiModel()} key=${hint}`
      : 'Gemini:  not configured (set GEMINI_API_KEY in server/.env)',
  );
});
