import { normalizeConsigneeFilterQuery } from '../lib/epass-query-normalize.js';

/**
 * Build Prisma where clause for consigner challan list (consignee page).
 *
 * @param {string[]} consignerRowIds
 * @param {{ consignee?: string; hideZeroPasses?: string; destination?: string }} query
 */
export function buildConsignerChallansWhere(consignerRowIds, query) {
  const challanWhere = { consignerRowId: { in: consignerRowIds } };
  const consignee = normalizeConsigneeFilterQuery(query.consignee);
  if (consignee) {
    challanWhere.consigneeName = { contains: consignee, mode: 'insensitive' };
  }
  if (query.hideZeroPasses === '1') {
    challanWhere.challanCount = { gt: 0 };
  }
  const destination = typeof query.destination === 'string' ? query.destination.trim() : '';
  if (destination) {
    challanWhere.passes = {
      some: { destination: { contains: destination, mode: 'insensitive' } },
    };
  }
  return challanWhere;
}
