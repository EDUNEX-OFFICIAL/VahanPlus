import express from 'express';
import cors from 'cors';
import { register, metricsMiddleware } from './metrics.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobs.js';
import epassRoutes from './routes/epass.js';
import scraperConfigRoutes from './routes/scraperConfig.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware);

  app.use(healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/jobs', jobsRoutes);
  app.use('/epass', epassRoutes);
  app.use('/epass/scraper-config', scraperConfigRoutes);

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
