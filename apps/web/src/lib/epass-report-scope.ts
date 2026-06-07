export type EpassReportScope = 'all' | 'specific';

/** Active date range in URL overrides reportScope=all (manual URL guard). */
export function effectiveReportScopeFromSearchParams(
  searchParams: URLSearchParams,
): EpassReportScope {
  const isRange =
    searchParams.get('dateMode') === 'range' &&
    Boolean(searchParams.get('dateFrom') || searchParams.get('dateTo'));
  if (isRange) return 'specific';
  return searchParams.get('reportScope') === 'all' ? 'all' : 'specific';
}

export function parseReportScope(searchParams: URLSearchParams): EpassReportScope {
  return effectiveReportScopeFromSearchParams(searchParams);
}

export function isAllReportsScope(searchParams: URLSearchParams): boolean {
  return parseReportScope(searchParams) === 'all';
}

/** URL patch for first visit and Clear all — show all reports, no single date. */
export function allReportsClearPatch(): Record<string, string | null> {
  return {
    reportScope: 'all',
    snapshotId: null,
    reportDate: null,
    dateMode: null,
    dateFrom: null,
    dateTo: null,
  };
}

export const allReportsBootstrapPatch = allReportsClearPatch;
