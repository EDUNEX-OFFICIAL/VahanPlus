/**
 * Calendar date in a timezone as `yyyy-mm-dd`.
 * @param {Date} [ref]
 * @param {string} [timeZone]
 */
export function isoTodayInTimeZone(ref = new Date(), timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(ref);
}

/**
 * @param {Date} [ref]
 * @param {string} [timeZone]
 */
export function isoYesterdayInTimeZone(ref = new Date(), timeZone = 'Asia/Kolkata') {
  const todayIso = isoTodayInTimeZone(ref, timeZone);
  const [y, m, d] = todayIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * @param {'yesterday' | 'today' | 'none'} mode
 * @param {string} [timeZone]
 * @returns {string | null} ISO date for district scrape metadata, or null
 */
export function scheduleReportDateIso(mode, timeZone = 'Asia/Kolkata') {
  if (mode === 'none') return null;
  if (mode === 'today') return isoTodayInTimeZone(new Date(), timeZone);
  return isoYesterdayInTimeZone(new Date(), timeZone);
}

/**
 * @param {{ defaultDistrictDate?: string | null; scheduleTimezone?: string }} config
 */
export function defaultDistrictDateIso(config) {
  if (config.defaultDistrictDate) return config.defaultDistrictDate;
  return isoYesterdayInTimeZone(new Date(), config.scheduleTimezone || 'Asia/Kolkata');
}
