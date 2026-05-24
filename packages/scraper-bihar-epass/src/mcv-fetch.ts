import { aspnetFormPost } from './http/client.js';
import { getPortalHttpConfig } from './http/config.js';
import { MCV_VEHICLE_STATUS_URL } from './mcv-urls.js';
import type { FetchOptions } from './types.js';

export async function fetchMcvVehicleStatusHtml(
  vehicleRegNo: string,
  options: FetchOptions = {},
): Promise<string> {
  const env = getPortalHttpConfig();
  const vrn = vehicleRegNo.trim().replace(/\s+/g, '').toUpperCase();

  return aspnetFormPost(MCV_VEHICLE_STATUS_URL, {
    timeoutMs: options.timeoutMs ?? env.timeoutMs,
    retries: options.retries ?? env.retries,
    postDelayMs: options.postDelayMs ?? env.postDelayMs,
    extraFields: {
      txtvehicleno: vrn,
      btnSubmit: 'Search',
    },
  });
}
