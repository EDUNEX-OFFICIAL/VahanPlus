export interface KhananImportBatchOptions {
  replaceExisting?: boolean;
  refreshVehicleStatus?: boolean;
  expectedRows?: number;
  dateFrom?: string;
  dateTo?: string;
  distinctDateCount?: number;
  importSummary?: {
    snapshotsCreated?: number;
    passesImported?: number;
    rowsSkipped?: number;
  };
}

export function dateRangeFromBatchOptions(options: Record<string, unknown> | null | undefined): {
  dateFrom?: string;
  dateTo?: string;
  distinctDateCount?: number;
} {
  if (!options || typeof options !== 'object') return {};
  const dateFrom = typeof options.dateFrom === 'string' ? options.dateFrom : undefined;
  const dateTo = typeof options.dateTo === 'string' ? options.dateTo : undefined;
  const distinctDateCount =
    typeof options.distinctDateCount === 'number' ? options.distinctDateCount : undefined;
  return { dateFrom, dateTo, distinctDateCount };
}

export function importSummaryFromBatchOptions(
  options: Record<string, unknown> | null | undefined,
): KhananImportBatchOptions['importSummary'] | undefined {
  if (!options || typeof options !== 'object') return undefined;
  const raw = options.importSummary;
  if (!raw || typeof raw !== 'object') return undefined;
  return raw as KhananImportBatchOptions['importSummary'];
}
