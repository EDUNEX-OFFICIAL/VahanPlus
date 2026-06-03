import {
  formatDateDmy,
  normalizeReportDate,
  parseReportDateFlexible,
  startOfLocalDayMs,
} from '@/lib/epass-report-date';

export type LiveScrapeDateAuditStatus = 'valid' | 'missing' | 'unparseable' | 'mismatch';

/** Max calendar-day gap (scraped after report) before flagging stale scrape. */
const STALE_LAG_DAYS = 14;

export interface LiveScrapeDateAudit {
  status: LiveScrapeDateAuditStatus;
  reportDateRaw: string;
  reportDateDisplay: string;
  scrapedAtIso: string;
  scrapedAtDisplay: string;
  /** Short label for title/tooltip (non-instructional). */
  detail: string | null;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function auditLiveScrapeDates(
  reportDateRaw: string,
  scrapedAtIso: string,
): LiveScrapeDateAudit {
  const raw = reportDateRaw?.trim() ?? '';
  const scrapedAtDisplay = formatWhen(scrapedAtIso);
  const scraped = new Date(scrapedAtIso);

  const base = {
    reportDateRaw: raw,
    reportDateDisplay: raw ? normalizeReportDate(raw) : '—',
    scrapedAtIso,
    scrapedAtDisplay,
    detail: null as string | null,
  };

  if (!raw) {
    return {
      ...base,
      status: 'missing',
      detail: 'No report date',
    };
  }

  if (Number.isNaN(scraped.getTime())) {
    return {
      ...base,
      status: 'unparseable',
      detail: 'Invalid scraped time',
    };
  }

  const reportParsed = parseReportDateFlexible(raw);
  if (!reportParsed) {
    return {
      ...base,
      status: 'unparseable',
      detail: `Raw: ${raw}`,
    };
  }

  const dayGap = Math.round(
    (startOfLocalDayMs(scraped) - startOfLocalDayMs(reportParsed)) / 86_400_000,
  );

  if (dayGap < 0) {
    return {
      ...base,
      status: 'mismatch',
      detail: 'Scraped before report date',
    };
  }

  if (dayGap > STALE_LAG_DAYS) {
    return {
      ...base,
      status: 'mismatch',
      detail: 'Report date is much older than scrape',
    };
  }

  const normalized = formatDateDmy(reportParsed);
  const rawLooksDifferent = raw !== normalized && raw !== base.reportDateDisplay;

  return {
    ...base,
    status: 'valid',
    detail: rawLooksDifferent ? `Portal: ${raw}` : null,
  };
}
