/** Plain-language labels for scrape job types and statuses (Khanan Config UI). */

const JOB_TYPE_LABELS: Record<string, string> = {
  bihar_epass: 'District summary report',
  bihar_epass_consigner: 'Consignee / dealer details',
  bihar_epass_challan: 'Challan details',
  bihar_epass_challan_pass: 'Challan (pass) details',
  bihar_mcv_vehicle_status: 'Vehicle registration check',
  vehicle: 'Vehicle lookup',
  khanan: 'Khanan record',
  health: 'System health check',
};

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting',
  active: 'Running',
  completed: 'Done',
  failed: 'Failed',
};

export function formatJobTypeLabel(type: string): string {
  return JOB_TYPE_LABELS[type] ?? type.replace(/^bihar_/, '').replace(/_/g, ' ');
}

export function formatJobStatusLabel(status: string): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

/** Parse simple daily cron `minute hour * * *` to HH:MM for time input. */
export function timeFromDailyCron(cron: string | null | undefined): string {
  if (!cron?.trim()) return '';
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return '';
  const [minute, hour, dom, month, dow] = parts;
  if (dom !== '*' || month !== '*' || dow !== '*') return '';
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return '';
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Build daily cron from HTML time input value (HH:MM). */
export function dailyCronFromTime(time: string): string | null {
  if (!time.trim()) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${m} ${h} * * *`;
}

export function formatDailyScheduleSummary(
  cron: string | null | undefined,
  timezone: string,
): string {
  const time = timeFromDailyCron(cron);
  if (!time) {
    return cron ? `Custom schedule: ${cron}` : 'Not scheduled';
  }
  const [hh, mm] = time.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `Every day at ${hour12}:${String(mm).padStart(2, '0')} ${period} (${timezone})`;
}
