import express from 'express';
import { getPrisma } from '@vahanplus/db';
import { requireAuth } from '../middleware/auth.js';
import {
  applyCrmQueueFilters,
  buildActiveCrmQueue,
  buildRemovedCrmQueue,
  computeCrmStats,
  normalizeVrnParam,
  paginateCrmQueue,
} from '../services/crmVehicleExpiryQueue.js';
import {
  enqueueRcAdvanceForVrns,
  loadRcAdvanceFlatByVrns,
  mergeRcAdvanceIntoCrmItems,
} from '../services/rcAdvanceEnrichment.js';

const router = express.Router();

router.use(requireAuth);

function usernameFromReq(req) {
  return typeof req.user?.username === 'string' ? req.user.username : null;
}

router.get('/vehicle-expiry', async (req, res) => {
  const prisma = getPrisma();
  const statusFilter = req.query.status === 'removed' ? 'removed' : 'active';
  const built =
    statusFilter === 'removed'
      ? await buildRemovedCrmQueue(prisma, req.query)
      : await buildActiveCrmQueue(prisma, req.query);

  const filtered = applyCrmQueueFilters(built.queue, req.query);
  const stats = {
    ...computeCrmStats(filtered),
    lastScrapedAt: built.lastScrapedAt,
  };

  if (statusFilter === 'active' && filtered.length > 0) {
    enqueueRcAdvanceForVrns(
      prisma,
      filtered.map((item) => item.vehicleRegNo),
    ).catch((err) => {
      console.error('RC Advance enqueue failed:', err);
    });
  }

  const page = paginateCrmQueue(filtered, req.query);
  const rcByVrn = await loadRcAdvanceFlatByVrns(
    prisma,
    page.items.map((item) => item.vehicleRegNo),
  );
  const items = mergeRcAdvanceIntoCrmItems(page.items, rcByVrn);

  res.json({
    ...page,
    items,
    stats,
  });
});

router.post('/vehicle-expiry', async (req, res) => {
  const prisma = getPrisma();
  const vehicleRegNo = normalizeVrnParam(req.body?.vehicleRegNo);
  if (!vehicleRegNo) {
    return res.status(400).json({ error: 'vehicleRegNo is required' });
  }

  const statusRow = await prisma.epassVehicleStatusRow.findUnique({
    where: { vehicleRegNo },
  });

  const entry = await prisma.crmVehicleExpiryEntry.upsert({
    where: { vehicleRegNo },
    create: {
      vehicleRegNo,
      source: 'manual',
      status: 'active',
      addedByUsername: usernameFromReq(req),
      removedByUsername: null,
    },
    update: {
      source: 'manual',
      status: 'active',
      addedByUsername: usernameFromReq(req),
      removedByUsername: null,
    },
  });

  res.status(201).json({
    item: entry,
    hasStatusRow: Boolean(statusRow),
  });
});

router.patch('/vehicle-expiry/:vehicleRegNo', async (req, res) => {
  const prisma = getPrisma();
  const vehicleRegNo = normalizeVrnParam(req.params.vehicleRegNo);
  if (!vehicleRegNo) {
    return res.status(400).json({ error: 'Invalid vehicleRegNo' });
  }

  const status = req.body?.status;
  const notes = req.body?.notes;

  const existing = await prisma.crmVehicleExpiryEntry.findUnique({
    where: { vehicleRegNo },
  });

  if (status === 'removed') {
    const entry = await prisma.crmVehicleExpiryEntry.upsert({
      where: { vehicleRegNo },
      create: {
        vehicleRegNo,
        source: 'dismissed',
        status: 'removed',
        removedByUsername: usernameFromReq(req),
      },
      update: {
        status: 'removed',
        source: existing?.source === 'manual' ? 'manual' : 'dismissed',
        removedByUsername: usernameFromReq(req),
        ...(typeof notes === 'string' ? { notes } : {}),
      },
    });
    return res.json({ item: entry });
  }

  if (status === 'active') {
    if (!existing) {
      return res.status(404).json({ error: 'CRM entry not found' });
    }
    const entry = await prisma.crmVehicleExpiryEntry.update({
      where: { vehicleRegNo },
      data: {
        status: 'active',
        removedByUsername: null,
        ...(typeof notes === 'string' ? { notes } : {}),
      },
    });
    return res.json({ item: entry });
  }

  if (typeof notes === 'string' && existing) {
    const entry = await prisma.crmVehicleExpiryEntry.update({
      where: { vehicleRegNo },
      data: { notes },
    });
    return res.json({ item: entry });
  }

  return res.status(400).json({ error: 'No valid fields to update' });
});

router.post('/vehicle-expiry/bulk-remove', async (req, res) => {
  const prisma = getPrisma();
  const raw = req.body?.vehicleRegNos;
  if (!Array.isArray(raw) || raw.length === 0) {
    return res.status(400).json({ error: 'vehicleRegNos array is required' });
  }

  const vehicleRegNos = [...new Set(raw.map((v) => normalizeVrnParam(v)).filter(Boolean))];
  if (vehicleRegNos.length === 0) {
    return res.status(400).json({ error: 'No valid vehicleRegNos' });
  }
  if (vehicleRegNos.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 vehicles per bulk remove' });
  }

  const user = usernameFromReq(req);
  const existing = await prisma.crmVehicleExpiryEntry.findMany({
    where: { vehicleRegNo: { in: vehicleRegNos } },
  });
  const existingByVrn = new Map(existing.map((e) => [e.vehicleRegNo, e]));

  await prisma.$transaction(
    vehicleRegNos.map((vehicleRegNo) => {
      const prev = existingByVrn.get(vehicleRegNo);
      return prisma.crmVehicleExpiryEntry.upsert({
        where: { vehicleRegNo },
        create: {
          vehicleRegNo,
          source: 'dismissed',
          status: 'removed',
          removedByUsername: user,
        },
        update: {
          status: 'removed',
          source: prev?.source === 'manual' ? 'manual' : 'dismissed',
          removedByUsername: user,
        },
      });
    }),
  );

  res.json({ removed: vehicleRegNos.length, vehicleRegNos });
});

export default router;
