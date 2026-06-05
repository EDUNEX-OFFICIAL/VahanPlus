import { persistRcAdvanceFetch } from '@vahanplus/rc-advance-client';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} vehicleRegNo
 */
export async function processRcAdvanceFetch(prisma, vehicleRegNo) {
  const record = await persistRcAdvanceFetch(prisma, vehicleRegNo);
  return {
    vehicleRegNo: record.vehicleRegNo,
    fetchedAt: record.fetchedAt.toISOString(),
    hasFlat: Boolean(record.flat),
    error: record.error,
  };
}
