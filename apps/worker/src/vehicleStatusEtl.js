import { normalizeVehicleRegNo } from './normalizeVrn.js';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Record<string, unknown>} report
 * @param {string} [jobId]
 */
export async function persistVehicleStatus(prisma, report, jobId) {
  const vehicleRegNo = normalizeVehicleRegNo(String(report.vehicleRegNo ?? ''));
  if (!vehicleRegNo) {
    throw new Error('vehicleRegNo is required for vehicle status ETL');
  }

  const scrapedAt = new Date(String(report.scrapedAt ?? new Date().toISOString()));
  const found = Boolean(report.found);
  const row = report.row && typeof report.row === 'object' ? report.row : null;

  const data = {
    ksRegNo: row?.ksRegNo != null ? String(row.ksRegNo) : null,
    vehicleClass: row?.vehicleClass != null ? String(row.vehicleClass) : null,
    rcFitUpTo: row?.rcFitUpTo != null ? String(row.rcFitUpTo) : null,
    rcTaxUpTo: row?.rcTaxUpTo != null ? String(row.rcTaxUpTo) : null,
    insuranceUpTo: row?.insuranceUpTo != null ? String(row.insuranceUpTo) : null,
    puccUpTo: row?.puccUpTo != null ? String(row.puccUpTo) : null,
    imeiNo: row?.imeiNo != null ? String(row.imeiNo) : null,
    esimValidity: row?.esimValidity != null ? String(row.esimValidity) : null,
    grossWeightMt: row?.grossWeightMt != null ? row.grossWeightMt : null,
    unladenWeightMt: row?.unladenWeightMt != null ? row.unladenWeightMt : null,
    found,
    scrapedAt,
    jobId: jobId ?? (report.jobId != null ? String(report.jobId) : null),
  };

  const record = await prisma.epassVehicleStatusRow.upsert({
    where: { vehicleRegNo },
    create: { vehicleRegNo, ...data },
    update: data,
  });

  return { vehicleRegNo: record.vehicleRegNo, found: record.found };
}
