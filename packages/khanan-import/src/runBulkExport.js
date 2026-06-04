import fs from 'node:fs';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { exportFilePath, ensureDir } from './storage.js';

const PAGE_SIZE = 2000;

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {import('@vahanplus/db').KhananExportJob} job
 */
export async function runKhananBulkExport(prisma, job) {
  const filters = job.filters && typeof job.filters === 'object' ? job.filters : {};
  const dateFrom = typeof filters.dateFrom === 'string' ? filters.dateFrom : '';
  const dateTo = typeof filters.dateTo === 'string' ? filters.dateTo : dateFrom;

  const where = buildPassWhere(dateFrom, dateTo);

  const fileName = `khanan-export-${job.id}.jsonl.gz`;
  const outPath = exportFilePath(job.id, fileName);
  await ensureDir(path.dirname(outPath));

  const fileStream = fs.createWriteStream(outPath);
  const gzip = createGzip();
  gzip.pipe(fileStream);

  let rowCount = 0;
  let cursor = undefined;

  const writeLine = (line) =>
    new Promise((resolve, reject) => {
      try {
        if (!gzip.write(line, 'utf8')) gzip.once('drain', resolve);
        else resolve();
      } catch (err) {
        reject(err);
      }
    });

  for (;;) {
    const page = await prisma.epassChallanPassRow.findMany({
      where,
      take: PAGE_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      include: {
        challanRow: {
          include: {
            consignerRow: {
              include: {
                districtRow: {
                  include: { snapshot: true },
                },
              },
            },
          },
        },
      },
    });

    if (page.length === 0) break;

    for (const pass of page) {
      await writeLine(JSON.stringify(passToMongoExport(pass)) + '\n');
      rowCount += 1;
    }

    cursor = page[page.length - 1].id;

    await prisma.khananExportJob.update({
      where: { id: job.id },
      data: { rowCount },
    });

    if (page.length < PAGE_SIZE) break;
  }

  gzip.end();
  await finished(fileStream);

  await prisma.khananExportJob.update({
    where: { id: job.id },
    data: {
      status: 'completed',
      storagePath: outPath,
      fileName,
      rowCount,
    },
  });

  return { rowCount, storagePath: outPath, fileName };
}

function buildPassWhere(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return {};

  const snapshotWhere = {};
  if (dateFrom) snapshotWhere.gte = dateFrom;
  if (dateTo) snapshotWhere.lte = dateTo;

  return {
    challanRow: {
      consignerRow: {
        districtRow: {
          snapshot: {
            reportDate: snapshotWhere,
          },
        },
      },
    },
  };
}

function passToMongoExport(pass) {
  const challan = pass.challanRow;
  const consigner = challan?.consignerRow;
  const district = consigner?.districtRow;

  return {
    district: district?.dmoName ?? '',
    consignerName: consigner?.consignerName ?? '',
    date: district?.snapshot?.reportDate ?? '',
    sourceType: consigner?.operatorType === 'dealer' ? 'Dealer' : 'Lessee',
    consigneeName: pass.consigneeName ?? challan?.consigneeName ?? '',
    challanNo: pass.challanNo ?? '',
    mineralName: pass.mineral ?? challan?.mineral ?? '',
    mineralCategory: pass.mineralCategory ?? challan?.mineralCategory ?? '',
    vehicleRegNo: pass.vehicleRegNo ?? '',
    destination: pass.destination ?? '',
    transportedDate: pass.transportedDate ?? '',
    quantity: pass.quantity != null ? String(pass.quantity) : '0',
    unit: pass.unit ?? challan?.unit ?? '',
    checkStatus: pass.checkStatus ?? '',
  };
}
