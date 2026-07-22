import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/api.js';

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
    docs: '/v1/health',
    version: '0.1.0',
  });
});

app.use('/v1', apiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, host, () => {
  console.log(`FreBob server listening on http://${host}:${port}`);
  console.log(`Health: http://${host}:${port}/v1/health`);
});
