/** Snapshots list loaded but report id not resolved yet (bootstrap effect pending). */
export function isSnapshotResolving(
  snapshotsLoaded: boolean,
  resolvedSnapshotId: string | null,
  noSnapshotsInRange: boolean,
): boolean {
  return snapshotsLoaded && !resolvedSnapshotId && !noSnapshotsInRange;
}
