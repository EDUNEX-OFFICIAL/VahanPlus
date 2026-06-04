import { runKhananBulkImport, runKhananBulkExport } from '@vahanplus/khanan-import';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} batchId
 */
export async function processKhananBulkImport(prisma, batchId) {
  const batch = await prisma.khananImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error(`Import batch not found: ${batchId}`);
  if (!batch.storagePath) throw new Error('Import batch has no assembled file');

  await prisma.khananImportBatch.update({
    where: { id: batchId },
    data: { status: 'active', error: null },
  });

  try {
    const result = await runKhananBulkImport(prisma, batch);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bulk import failed';
    await prisma.khananImportBatch.update({
      where: { id: batchId },
      data: { status: 'failed', error: message },
    });
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
