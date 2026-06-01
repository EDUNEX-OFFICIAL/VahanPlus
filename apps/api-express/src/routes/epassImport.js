import express from 'express';
import { getPrisma } from '@vahanplus/db';
import { requireAuth } from '../middleware/auth.js';
import {
  analyzeImportPayload,
  commitDistrictImport,
  commitVehicleStatusImport,
} from '../services/epassImport.js';

const router = express.Router();

router.use(requireAuth);

router.post('/analyze', (req, res) => {
  const headers = Array.isArray(req.body?.headers) ? req.body.headers.map(String) : [];
  const sampleRows = Array.isArray(req.body?.sampleRows) ? req.body.sampleRows : [];
  const result = analyzeImportPayload(headers, sampleRows);
  res.json(result);
});

router.post('/commit', async (req, res) => {
  const type = req.body?.type;
  const mapping = req.body?.mapping;
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  if (!type || typeof mapping !== 'object') {
    return res.status(400).json({ error: 'type and mapping are required' });
  }
  if (rows.length === 0) {
    return res.status(400).json({ error: 'No rows to import' });
  }
  if (rows.length > 10_000) {
    return res.status(400).json({ error: 'Too many rows (max 10000)' });
  }

  const prisma = getPrisma();

  try {
    if (type === 'district_snapshot') {
      const result = await commitDistrictImport(prisma, {
        rows,
        mapping,
        reportDate: typeof req.body?.reportDate === 'string' ? req.body.reportDate : undefined,
      });
      return res.status(201).json(result);
    }

    if (type === 'vehicle_status') {
      const result = await commitVehicleStatusImport(prisma, { rows, mapping });
      return res.status(201).json(result);
    }

    return res.status(400).json({ error: 'Unknown import type' });
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : 'Import failed',
    });
  }
});

export default router;
