import { resolvePageParams } from './cursor.js';

function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

function parsePortalStatusFilter(query) {
  const raw = query.mcvPortalStatus ?? query.portalStatus;
  if (raw === 'on_portal' || raw === 'no_portal_data' || raw === 'not_checked') return raw;
  return null;
}

function sortVehicleItems(items, sort, dir) {
  const mult = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'passes':
        return mult * (a.passCount - b.passCount);
      case 'qty':
        return mult * ((a.totalQuantity ?? 0) - (b.totalQuantity ?? 0));
      case 'lastDate':
        return (
          mult *
          String(a.lastTransportedDate ?? '').localeCompare(String(b.lastTransportedDate ?? ''))
        );
      case 'grossWeight':
        return mult * ((a.grossWeightMt ?? -1) - (b.grossWeightMt ?? -1));
      case 'unladen':
        return mult * ((a.unladenWeightMt ?? -1) - (b.unladenWeightMt ?? -1));
      default:
        return mult * a.vehicleRegNo.localeCompare(b.vehicleRegNo);
    }
  });
}

export async function fetchVehicleDataList(prisma, query) {
  const { limit, offset } = resolvePageParams(query);
  const sort = typeof query.sort === 'string' ? query.sort : 'lastDate';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  const portalFilter = parsePortalStatusFilter(query);

  const q = typeof query.q === 'string' ? query.q.trim() : '';
  const where = q ? { vehicleRegNo: { contains: q, mode: 'insensitive' } } : {};

  const rows = await prisma.reportVehiclePassSummary.findMany({ where });
  const vrns = rows.map((r) => r.vehicleRegNo);
  const statusRows =
    vrns.length > 0
      ? await prisma.epassVehicleStatusRow.findMany({
          where: { vehicleRegNo: { in: vrns } },
          select: {
            vehicleRegNo: true,
            grossWeightMt: true,
            unladenWeightMt: true,
            found: true,
          },
        })
      : [];
  const statusByVrn = new Map(statusRows.map((r) => [r.vehicleRegNo, r]));

  let items = rows.map((row) => {
    const status = statusByVrn.get(row.vehicleRegNo);
    const mcvPortalStatus = !status ? 'not_checked' : status.found ? 'on_portal' : 'no_portal_data';
    const units = Object.keys(row.quantityByUnit ?? {});
    const totalQuantity =
      units.length === 1 ? toNumber(row.quantityByUnit[units[0]]) : toNumber(row.totalQuantity);
    return {
      vehicleRegNo: row.vehicleRegNo,
      passCount: row.passCount,
      totalQuantity,
      quantityByUnit: row.quantityByUnit ?? {},
      minerals: row.minerals ?? [],
      dmoNames: row.dmoNames ?? [],
      consignerNames: row.consignerNames ?? [],
      destinations: row.destinations ?? [],
      lastTransportedDate: row.lastTransportedDate,
      lastScrapedAt: row.lastScrapedAt.toISOString(),
      mcvPortalStatus,
      hasVehicleStatus: mcvPortalStatus === 'on_portal',
      grossWeightMt: status?.grossWeightMt != null ? toNumber(status.grossWeightMt) : null,
      unladenWeightMt: status?.unladenWeightMt != null ? toNumber(status.unladenWeightMt) : null,
    };
  });

  if (portalFilter) {
    items = items.filter((i) => i.mcvPortalStatus === portalFilter);
  }

  items = sortVehicleItems(items, sort, dir);
  const total = items.length;
  const page = items.slice(offset, offset + limit);

  const latest = await prisma.reportVehiclePassSummary.findFirst({
    orderBy: { lastScrapedAt: 'desc' },
    select: { lastScrapedAt: true },
  });

  return {
    snapshot: null,
    reportScope: 'all',
    entityCount: total,
    snapshotCount: total,
    snapshotsTruncated: false,
    latestScrapedAt: latest?.lastScrapedAt?.toISOString() ?? null,
    total,
    limit,
    offset,
    items: page,
  };
}
