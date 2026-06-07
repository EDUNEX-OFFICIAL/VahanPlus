/** Snapshots list loaded but report id not resolved yet (bootstrap effect pending). */
export function isSnapshotResolving(
  snapshotsLoaded: boolean,
  resolvedSnapshotId: string | null,
  noSnapshotsInRange: boolean,
  reportScopeAll = false,
): boolean {
  if (reportScopeAll) return false;
  return snapshotsLoaded && !resolvedSnapshotId && !noSnapshotsInRange;
}
