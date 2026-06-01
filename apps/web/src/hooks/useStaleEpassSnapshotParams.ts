import { useEffect } from 'react';

/**
 * Drop snapshot query params when no reports exist (e.g. after clear-all-data).
 */
export function useStaleEpassSnapshotParams(
  snapshotsLoaded: boolean,
  snapshotCount: number,
  snapshotId: string | null,
  reportDate: string | null,
  updateParams: (patch: Record<string, string | null>) => void,
) {
  useEffect(() => {
    if (!snapshotsLoaded || snapshotCount > 0) return;
    if (!snapshotId && !reportDate) return;
    updateParams({ snapshotId: null, reportDate: null });
  }, [snapshotsLoaded, snapshotCount, snapshotId, reportDate, updateParams]);
}
