/** Reject open-ended date range queries that would scan full snapshot history. */
export function validateReportingQuery(query) {
  if (query.dateMode !== 'range') return null;
  const from = typeof query.dateFrom === 'string' ? query.dateFrom.trim() : '';
  const to = typeof query.dateTo === 'string' ? query.dateTo.trim() : '';
  if (!from && !to) {
    return 'dateMode=range requires dateFrom and/or dateTo bounds';
  }
  return null;
}

export const MAX_SNAPSHOTS_PER_REQUEST = 1;
