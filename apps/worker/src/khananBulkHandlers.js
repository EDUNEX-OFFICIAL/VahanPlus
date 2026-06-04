import fs from 'node:fs/promises';
import {
  assembledFilePath,
  runKhananBulkImport,
  runKhananBulkExport,
} from '@vahanplus/khanan-import';

const STORAGE_PATH_WAIT_MS = 200;
const STORAGE_PATH_MAX_ATTEMPTS = 20;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markImportBatchFailed(prisma, batchId, message) {
  await prisma.khananImportBatch.updateMany({
    where: { id: batchId, status: { notIn: ['completed'] } },
    data: { status: 'failed', error: message },
  });
}

/**
 * Resolve batch with storagePath. Handles enqueue race (worker before API commit)
 * and marks the batch failed when the file truly does not exist.
 *
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} batchId
 */
async function resolveImportBatch(prisma, batchId) {
  let batch = await prisma.khananImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error(`Import batch not found: ${batchId}`);

  if (batch.storagePath) {
    return batch;
  }

  for (let attempt = 0; attempt < STORAGE_PATH_MAX_ATTEMPTS; attempt += 1) {
    await sleep(STORAGE_PATH_WAIT_MS);
    batch = await prisma.khananImportBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error(`Import batch not found: ${batchId}`);
    if (batch.storagePath) {
      return batch;
    }
  }

  const fallbackPath = assembledFilePath(batchId, batch.fileName);
  try {
    await fs.access(fallbackPath);
    return prisma.khananImportBatch.update({
      where: { id: batchId },
      data: { storagePath: fallbackPath },
    });
  } catch {
    const message = 'Import batch has no assembled file';
    await markImportBatchFailed(prisma, batchId, message);
    throw new Error(message);
  }
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} batchId
 */
export async function processKhananBulkImport(prisma, batchId) {
  const batch = await resolveImportBatch(prisma, batchId);

  if (batch.status === 'completed') {
    return { success: true, data: { alreadyCompleted: true } };
  }
  if (batch.status === 'failed') {
    throw new Error(batch.error ?? 'Import batch failed');
  }

  await prisma.khananImportBatch.update({
    where: { id: batchId },
    data: { status: 'active', error: null },
  });

  try {
    const fresh = await prisma.khananImportBatch.findUnique({ where: { id: batchId } });
    const result = await runKhananBulkImport(prisma, fresh ?? batch);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bulk import failed';
    await markImportBatchFailed(prisma, batchId, message);
    throw err;
  }
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} exportJobId
 */
export async function processKhananBulkExport(prisma, exportJobId) {
  const job = await prisma.khananExportJob.findUnique({ where: { id: exportJobId } });
  if (!job) throw new Error(`Export job not found: ${exportJobId}`);

  await prisma.khananExportJob.update({
    where: { id: exportJobId },
    data: { status: 'active', error: null },
  });

  try {
    const result = await runKhananBulkExport(prisma, job);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bulk export failed';
    await prisma.khananExportJob.update({
      where: { id: exportJobId },
      data: { status: 'failed', error: message },
    });
    throw err;
  }
}
