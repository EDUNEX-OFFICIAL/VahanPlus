import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getPrisma } from '@vahanplus/db';
import {
  DEFAULT_CHUNK_BYTES,
  assembleChunks,
  detectBulkFormat,
  removeBatchDir,
  batchDir,
  chunkPath,
  ensureDir,
} from '@vahanplus/khanan-import';
import { requireAuth } from '../middleware/auth.js';
import { enqueueScrapeJob } from '../services/enqueueScrape.js';

const router = express.Router();
router.use(requireAuth);

function expectedRowsFromOptions(options) {
  if (!options || typeof options !== 'object') return undefined;
  const n = options.expectedRows;
  return typeof n === 'number' && n > 0 ? n : undefined;
}

function optionString(options, key) {
  if (!options || typeof options !== 'object') return undefined;
  const v = options[key];
  return typeof v === 'string' && v ? v : undefined;
}

function optionNumber(options, key) {
  if (!options || typeof options !== 'object') return undefined;
  const v = options[key];
  return typeof v === 'number' && v > 0 ? v : undefined;
}

function importSummaryFromOptions(options) {
  if (!options || typeof options !== 'object') return undefined;
  const raw = options.importSummary;
  if (!raw || typeof raw !== 'object') return undefined;
  return raw;
}

function serializeBatch(batch) {
  const opts = batch.options;
  const expectedRows = expectedRowsFromOptions(opts);
  const importSummary = importSummaryFromOptions(opts);
  return {
    id: batch.id,
    status: batch.status,
    fileName: batch.fileName,
    format: batch.format,
    totalBytes: batch.totalBytes != null ? String(batch.totalBytes) : null,
    bytesReceived: String(batch.bytesReceived),
    chunkSize: batch.chunkSize,
    expectedChunks: batch.expectedChunks,
    rowsProcessed: batch.rowsProcessed,
    rowsSkipped: batch.rowsSkipped,
    passesImported: batch.passesImported,
    expectedRows,
    dateFrom: optionString(opts, 'dateFrom'),
    dateTo: optionString(opts, 'dateTo'),
    distinctDateCount: optionNumber(opts, 'distinctDateCount'),
    snapshotsCreated: importSummary?.snapshotsCreated,
    error: batch.error,
    options: batch.options,
    scrapeJobId: batch.scrapeJobId,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function serializeExport(job) {
  return {
    id: job.id,
    status: job.status,
    storagePath: job.storagePath,
    fileName: job.fileName,
    filters: job.filters,
    rowCount: job.rowCount,
    error: job.error,
    scrapeJobId: job.scrapeJobId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

router.post('/batches', async (req, res) => {
  const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';
  if (!fileName) {
    return res.status(400).json({ error: 'fileName is required' });
  }

  const totalBytes = req.body?.totalBytes != null ? BigInt(String(req.body.totalBytes)) : null;
  const expectedChunks =
    typeof req.body?.expectedChunks === 'number' ? req.body.expectedChunks : null;
  const format =
    typeof req.body?.format === 'string' ? req.body.format : detectBulkFormat(fileName);
  const options =
    req.body?.options && typeof req.body.options === 'object' ? req.body.options : null;

  const prisma = getPrisma();
  const batch = await prisma.khananImportBatch.create({
    data: {
      fileName,
      storagePath: '',
      format,
      totalBytes,
      expectedChunks,
      chunkSize: DEFAULT_CHUNK_BYTES,
      options,
      status: 'pending',
    },
  });

  await ensureDir(batchDir(batch.id));

  res.status(201).json({
    batchId: batch.id,
    chunkSizeBytes: batch.chunkSize,
    batch: serializeBatch(batch),
  });
});

router.put('/batches/:id/chunks/:index', async (req, res) => {
  const batchId = req.params.id;
  const index = Number.parseInt(req.params.index, 10);
  if (!Number.isFinite(index) || index < 0) {
    return res.status(400).json({ error: 'Invalid chunk index' });
  }

  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    return res.status(400).json({ error: 'Chunk body must be non-empty binary' });
  }

  const prisma = getPrisma();
  const batch = await prisma.khananImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.status === 'completed' || batch.status === 'active') {
    return res.status(409).json({ error: 'Batch is no longer accepting chunks' });
  }

  await ensureDir(batchDir(batchId));
  await fs.promises.writeFile(chunkPath(batchId, index), body);

  const updated = await prisma.khananImportBatch.update({
    where: { id: batchId },
    data: {
      bytesReceived: batch.bytesReceived + BigInt(body.length),
    },
  });

  res.json({ ok: true, bytesReceived: String(updated.bytesReceived) });
});

router.post('/batches/:id/complete', async (req, res) => {
  const batchId = req.params.id;
  const expectedChunks =
    typeof req.body?.expectedChunks === 'number' ? req.body.expectedChunks : null;

  const prisma = getPrisma();
  const batch = await prisma.khananImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const chunks = expectedChunks ?? batch.expectedChunks;
  if (chunks == null || chunks < 1) {
    return res.status(400).json({ error: 'expectedChunks is required' });
  }

  try {
    const storagePath = await assembleChunks(batchId, batch.fileName, chunks);
    const stat = await fs.promises.stat(storagePath);

    const scrapeJob = await enqueueScrapeJob(prisma, {
      type: 'khanan_bulk_import',
      target: batchId,
      metadata: { batchId },
    });

    const updated = await prisma.khananImportBatch.update({
      where: { id: batchId },
      data: {
        storagePath,
        expectedChunks: chunks,
        totalBytes: BigInt(stat.size),
        scrapeJobId: scrapeJob.id,
        status: 'pending',
      },
    });

    res.status(202).json({ batch: serializeBatch(updated), scrapeJobId: scrapeJob.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assembly failed';
    await prisma.khananImportBatch.update({
      where: { id: batchId },
      data: { status: 'failed', error: message },
    });
    return res.status(400).json({ error: message });
  }
});

router.get('/batches/:id', async (req, res) => {
  const prisma = getPrisma();
  const batch = await prisma.khananImportBatch.findUnique({ where: { id: req.params.id } });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json({ batch: serializeBatch(batch) });
});

router.post('/batches/:id/cancel', async (req, res) => {
  const prisma = getPrisma();
  const batch = await prisma.khananImportBatch.findUnique({ where: { id: req.params.id } });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  await removeBatchDir(req.params.id);
  const updated = await prisma.khananImportBatch.update({
    where: { id: req.params.id },
    data: { status: 'failed', error: 'Cancelled by operator' },
  });

  res.json({ batch: serializeBatch(updated) });
});

router.post('/export/khanan-passes', async (req, res) => {
  const filters = req.body?.filters && typeof req.body.filters === 'object' ? req.body.filters : {};

  const prisma = getPrisma();
  const exportJob = await prisma.khananExportJob.create({
    data: { filters, status: 'pending' },
  });

  const scrapeJob = await enqueueScrapeJob(prisma, {
    type: 'khanan_bulk_export',
    target: exportJob.id,
    metadata: { exportJobId: exportJob.id },
  });

  const updated = await prisma.khananExportJob.update({
    where: { id: exportJob.id },
    data: { scrapeJobId: scrapeJob.id },
  });

  res.status(202).json({
    job: serializeExport(updated),
    scrapeJobId: scrapeJob.id,
  });
});

router.get('/export/jobs/:id', async (req, res) => {
  const prisma = getPrisma();
  const job = await prisma.khananExportJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: 'Export job not found' });
  res.json({ job: serializeExport(job) });
});

router.get('/export/jobs/:id/download', async (req, res) => {
  const prisma = getPrisma();
  const job = await prisma.khananExportJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: 'Export job not found' });
  if (job.status !== 'completed' || !job.storagePath) {
    return res.status(409).json({ error: 'Export not ready' });
  }

  try {
    await fs.promises.access(job.storagePath);
  } catch {
    return res.status(404).json({ error: 'Export file missing on disk' });
  }

  const fileName = job.fileName ?? path.basename(job.storagePath);
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  fs.createReadStream(job.storagePath).pipe(res);
});

export default router;
