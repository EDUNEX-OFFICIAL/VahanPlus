import { fetchRcAdvanceHttp } from './httpProvider.js';
import { fetchRcAdvanceMock } from './mockProvider.js';

/**
 * @param {string} vehicleRegNo
 */
export async function fetchRcAdvance(vehicleRegNo) {
  const provider = (process.env.RC_ADVANCE_PROVIDER || 'mock').toLowerCase();
  if (provider === 'http') {
    return fetchRcAdvanceHttp(vehicleRegNo);
  }
  return fetchRcAdvanceMock(vehicleRegNo);
}

export function rcAdvanceSourceLabel() {
  const provider = (process.env.RC_ADVANCE_PROVIDER || 'mock').toLowerCase();
  return provider === 'http' ? 'http' : 'mock';
}
