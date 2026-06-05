/**
 * HTTP provider stub for future paid RC Advance API.
 * @param {string} vehicleRegNo
 */
export async function fetchRcAdvanceHttp(vehicleRegNo) {
  const url = process.env.RC_ADVANCE_API_URL;
  const apiKey = process.env.RC_ADVANCE_API_KEY;

  if (!url) {
    return {
      success: false,
      error: 'RC_ADVANCE_API_URL is not configured',
      data: null,
    };
  }

  const endpoint = new URL(url);
  endpoint.searchParams.set('reg_no', vehicleRegNo);

  const headers = { Accept: 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(endpoint.toString(), { headers });
  if (!res.ok) {
    return {
      success: false,
      error: `RC Advance API HTTP ${res.status}`,
      data: null,
    };
  }

  const data = await res.json();
  return { success: true, data, error: null };
}
