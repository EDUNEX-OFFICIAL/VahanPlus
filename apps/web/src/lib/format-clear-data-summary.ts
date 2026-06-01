import type { ClearDataResult } from '@/lib/scraper-config-types';

/** Operator-facing summary after clear-all-data. */
export function formatClearDataSummary(deleted: ClearDataResult['deleted']): string {
  return [
    `${deleted.snapshots} district reports`,
    `${deleted.consigners ?? 0} consigner rows`,
    `${deleted.rawCaptures} stored responses`,
    `${deleted.vehicleStatus} vehicle status rows`,
  ].join(' · ');
}
