import { flattenRcAdvanceResponse } from './flatten.js';
import { fetchRcAdvance, rcAdvanceSourceLabel } from './resolveProvider.js';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} vehicleRegNo
 */
export async function persistRcAdvanceFetch(prisma, vehicleRegNo) {
  const fetchedAt = new Date();
  const source = rcAdvanceSourceLabel();

  try {
    const { success, data, error } = await fetchRcAdvance(vehicleRegNo);
    if (!success || !data) {
      const record = await prisma.rcAdvanceVehicleData.upsert({
        where: { vehicleRegNo },
        create: {
          vehicleRegNo,
          statusCode: null,
          message: error,
          txnId: null,
          billable: null,
          result: null,
          rawResponse: null,
          flat: null,
          source,
          fetchedAt,
          error: error ?? 'Fetch failed',
        },
        update: {
          statusCode: null,
          message: error,
          txnId: null,
          billable: null,
          result: null,
          rawResponse: null,
          flat: null,
          source,
          fetchedAt,
          error: error ?? 'Fetch failed',
        },
      });
      return record;
    }

    const flat = flattenRcAdvanceResponse(data);
    const result =
      data.result && typeof data.result === 'object'
        ? /** @type {Record<string, unknown>} */ (data.result)
        : null;

    const record = await prisma.rcAdvanceVehicleData.upsert({
      where: { vehicleRegNo },
      create: {
        vehicleRegNo,
        statusCode: data.status_code != null ? Number(data.status_code) : null,
        message: data.message != null ? String(data.message) : null,
        txnId: data.txn_id != null ? String(data.txn_id) : null,
        billable:
          data.metadata && typeof data.metadata === 'object' && 'billable' in data.metadata
            ? Boolean(/** @type {Record<string, unknown>} */ (data.metadata).billable)
            : null,
        result,
        rawResponse: data,
        flat,
        source,
        fetchedAt,
        error: null,
      },
      update: {
        statusCode: data.status_code != null ? Number(data.status_code) : null,
        message: data.message != null ? String(data.message) : null,
        txnId: data.txn_id != null ? String(data.txn_id) : null,
        billable:
          data.metadata && typeof data.metadata === 'object' && 'billable' in data.metadata
            ? Boolean(/** @type {Record<string, unknown>} */ (data.metadata).billable)
            : null,
        result,
        rawResponse: data,
        flat,
        source,
        fetchedAt,
        error: null,
      },
    });
    return record;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const record = await prisma.rcAdvanceVehicleData.upsert({
      where: { vehicleRegNo },
      create: {
        vehicleRegNo,
        statusCode: null,
        message: null,
        txnId: null,
        billable: null,
        result: null,
        rawResponse: null,
        flat: null,
        source,
        fetchedAt,
        error: message,
      },
      update: {
        source,
        fetchedAt,
        error: message,
      },
    });
    return record;
  }
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} vehicleRegNo
 * @param {Record<string, unknown>} rawResponse
 * @param {string} [source]
 */
export async function persistRcAdvanceRaw(prisma, vehicleRegNo, rawResponse, source = 'mock') {
  const flat = flattenRcAdvanceResponse(rawResponse);
  const result =
    rawResponse.result && typeof rawResponse.result === 'object'
      ? /** @type {Record<string, unknown>} */ (rawResponse.result)
      : null;
  const fetchedAt = new Date();

  return prisma.rcAdvanceVehicleData.upsert({
    where: { vehicleRegNo },
    create: {
      vehicleRegNo,
      statusCode: rawResponse.status_code != null ? Number(rawResponse.status_code) : null,
      message: rawResponse.message != null ? String(rawResponse.message) : null,
      txnId: rawResponse.txn_id != null ? String(rawResponse.txn_id) : null,
      billable:
        rawResponse.metadata &&
        typeof rawResponse.metadata === 'object' &&
        'billable' in rawResponse.metadata
          ? Boolean(/** @type {Record<string, unknown>} */ (rawResponse.metadata).billable)
          : null,
      result,
      rawResponse,
      flat,
      source,
      fetchedAt,
      error: null,
    },
    update: {
      statusCode: rawResponse.status_code != null ? Number(rawResponse.status_code) : null,
      message: rawResponse.message != null ? String(rawResponse.message) : null,
      txnId: rawResponse.txn_id != null ? String(rawResponse.txn_id) : null,
      billable:
        rawResponse.metadata &&
        typeof rawResponse.metadata === 'object' &&
        'billable' in rawResponse.metadata
          ? Boolean(/** @type {Record<string, unknown>} */ (rawResponse.metadata).billable)
          : null,
      result,
      rawResponse,
      flat,
      source,
      fetchedAt,
      error: null,
    },
  });
}
