import express from 'express';
import Redis from 'ioredis';
import { getPrisma } from '@vahan360/db';
import { config } from '../config.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-express' });
});

router.get('/ready', async (_req, res) => {
  const checks = { postgres: false, redis: false };

  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = true;
  } catch {
    checks.postgres = false;
  }

  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  } finally {
    redis.disconnect();
  }

  const ready = checks.postgres && checks.redis;
  res.status(ready ? 200 : 503).json({ ready, checks });
});

export default router;
