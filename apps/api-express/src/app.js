import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { register, metricsMiddleware } from './metrics.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobs.js';
import epassRoutes from './routes/epass.js';
import scraperConfigRoutes from './routes/scraperConfig.js';
import epassImportRoutes from './routes/epassImport.js';

const DEFAULT_CORS_ORIGINS = ['http://localhost:3000'];

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return DEFAULT_CORS_ORIGINS;
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();
  const corsOrigins = parseCorsOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use((req, res, next) => {
    const path = req.originalUrl.split('?')[0];
    const isEpassImportPost =
      req.method === 'POST' &&
      (path === '/epass/import/commit' ||
        path === '/epass/import/analyze' ||
        path.endsWith('/epass/import/commit') ||
        path.endsWith('/epass/import/analyze'));
    const parser = express.json({ limit: isEpassImportPost ? '15mb' : '100kb' });
    parser(req, res, next);
  });
  app.use(metricsMiddleware);

  app.use(healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/jobs', jobsRoutes);
  app.use('/epass', epassRoutes);
  app.use('/epass/scraper-config', scraperConfigRoutes);
  app.use('/epass/import', epassImportRoutes);

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.use((err, _req, res, _next) => {
    if (err?.message?.startsWith('CORS blocked')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
