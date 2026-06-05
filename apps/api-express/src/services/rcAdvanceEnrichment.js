import { RC_ADVANCE_FETCH_TTL_MS } from '@vahanplus/rc-advance-client';
import { getScrapeQueue } from '@vahanplus/epass-orchestrator';
import { normalizeVehicleRegNo } from '@vahanplus/scraper-bihar-epass';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string[]} vehicleRegNos
 */
export async function enqueueRcAdvanceForVrns(prisma, vehicleRegNos) {
  const normalized = [
    ...new Set(vehicleRegNos.map((v) => normalizeVehicleRegNo(v)).filter(Boolean)),
  ];
  if (normalized.length === 0) return { enqueued: 0, skipped: 0 };

  const cutoff = new Date(Date.now() - RC_ADVANCE_FETCH_TTL_MS);
  const existing = await prisma.rcAdvanceVehicleData.findMany({
    where: {
      vehicleRegNo: { in: normalized },
      fetchedAt: { gte: cutoff },
      error: null,
    },
    select: { vehicleRegNo: true },
  });
  const fresh = new Set(existing.map((r) => r.vehicleRegNo));
  const toEnqueue = normalized.filter((vrn) => !fresh.has(vrn));
  if (toEnqueue.length === 0) {
    return { enqueued: 0, skipped: normalized.length };
  }

  const queue = getScrapeQueue();
  let enqueued = 0;
  for (const vehicleRegNo of toEnqueue) {
    await queue.add(
      'rc_advance_fetch',
      {
        type: 'rc_advance_fetch',
        target: vehicleRegNo,
        metadata: { vehicleRegNo },
      },
      {
        jobId: `rc-advance:${vehicleRegNo}`,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
    enqueued += 1;
  }

  return { enqueued, skipped: normalized.length - enqueued };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string[]} vehicleRegNos
 * @returns {Promise<Map<string, Record<string, unknown>>>}
 */
export async function loadRcAdvanceFlatByVrns(prisma, vehicleRegNos) {
  const normalized = [
    ...new Set(vehicleRegNos.map((v) => normalizeVehicleRegNo(v)).filter(Boolean)),
  ];
  if (normalized.length === 0) return new Map();

  const rows = await prisma.rcAdvanceVehicleData.findMany({
    where: { vehicleRegNo: { in: normalized } },
    select: {
      vehicleRegNo: true,
      flat: true,
      fetchedAt: true,
      message: true,
      error: true,
    },
  });

  /** @type {Map<string, { flat: Record<string, unknown> | null; fetchedAt: string | null; message: string | null; error: string | null }>} */
  const map = new Map();
  for (const row of rows) {
    map.set(row.vehicleRegNo, {
      flat:
        row.flat && typeof row.flat === 'object'
          ? /** @type {Record<string, unknown>} */ (row.flat)
          : null,
      fetchedAt: row.fetchedAt?.toISOString() ?? null,
      message: row.message,
      error: row.error,
    });
  }
  return map;
}

/**
 * @param {Record<string, unknown>[]} items
 * @param {Map<string, { flat: Record<string, unknown> | null; fetchedAt: string | null; message: string | null; error: string | null }>} rcByVrn
 */
export function mergeRcAdvanceIntoCrmItems(items, rcByVrn) {
  return items.map((item) => {
    const rc = rcByVrn.get(String(item.vehicleRegNo));
    return {
      ...item,
      rcAdvance: rc?.flat ?? null,
      rcAdvanceFetchedAt: rc?.fetchedAt ?? null,
      rcAdvanceMessage: rc?.message ?? rc?.error ?? null,
    };
  });
}
