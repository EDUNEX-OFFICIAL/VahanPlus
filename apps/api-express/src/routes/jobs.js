import express from 'express';
import { ScrapeJobPayloadSchema } from '@vahan360/contracts';
import { getPrisma } from '@vahan360/db';
import { requireAuth } from '../middleware/auth.js';
import { enqueueScrapeJob } from '../services/enqueueScrape.js';

const router = express.Router();

router.use(requireAuth);

router.post('/scrape', async (req, res) => {
  const parsed = ScrapeJobPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid job payload' });
  }

  const { type, target, metadata } = parsed.data;
  const prisma = getPrisma();
  const job = await enqueueScrapeJob(prisma, { type, target, metadata });

  res.status(201).json({
    id: job.id,
    status: job.status,
    type: job.type,
    target: job.target,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
});

router.get('/:id', async (req, res) => {
  const prisma = getPrisma();
  const job = await prisma.scrapeJob.findUnique({
    where: { id: req.params.id },
    include: { captures: { take: 5, orderBy: { createdAt: 'desc' } } },
  });

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    type: job.type,
    target: job.target,
    error: job.error,
    result: job.result,
    captures: job.captures,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
});

export default router;
