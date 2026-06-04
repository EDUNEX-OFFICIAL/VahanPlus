import { KhananPassImportSession } from './passEtlSession.js';
import { streamKhananRecords } from './streamParse.js';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {import('@vahanplus/db').KhananImportBatch} batch
 */
export async function runKhananBulkImport(prisma, batch) {
  const options = batch.options && typeof batch.options === 'object' ? batch.options : {};
  const replaceExisting = Boolean(options.replaceExisting);
  const refreshVehicleStatus = Boolean(options.refreshVehicleStatus);

  const session = new KhananPassImportSession(prisma, { replaceExisting, refreshVehicleStatus });

  const stats = await streamKhananRecords(
    batch.storagePath,
    batch.format === 'ndjson' ? 'ndjson' : 'json_array',
    async (m) => {
      await session.ingestRecord(m);
    },
    {
      onProgress: async (rowsProcessed, rowsSkipped) => {
        await prisma.khananImportBatch.update({
          where: { id: batch.id },
          data: {
            rowsProcessed,
            rowsSkipped,
            passesImported: session.passesImported,
          },
        });
      },
    },
  );

  const result = await session.finalize();

  const mergedOptions = {
    ...options,
    importSummary: {
      snapshotsCreated: result.snapshotsCreated,
      passesImported: result.passesImported,
      rowsSkipped: stats.rowsSkipped,
    },
  };

  await prisma.khananImportBatch.update({
    where: { id: batch.id },
    data: {
      rowsProcessed: stats.rowsProcessed,
      rowsSkipped: stats.rowsSkipped,
      passesImported: result.passesImported,
      status: 'completed',
      options: mergedOptions,
    },
  });

  return { ...result, ...stats };
}
