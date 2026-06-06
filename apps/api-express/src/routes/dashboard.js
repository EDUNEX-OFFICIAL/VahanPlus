import express from 'express';
import { getPrisma } from '@vahanplus/db';
import { requireAuth } from '../middleware/auth.js';
import { buildDashboardOverview } from '../services/dashboardOverview.js';

const router = express.Router();

router.use(requireAuth);

router.get('/overview', async (_req, res) => {
  const prisma = getPrisma();
  const overview = await buildDashboardOverview(prisma);
  res.json(overview);
});

export default router;
