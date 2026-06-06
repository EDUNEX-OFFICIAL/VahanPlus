import { Alert } from '@/components/ui/Alert';

interface IncompleteScrapeBannerProps {
  portalCount: number;
  storedCount: number;
  entityLabel?: string;
}

export function IncompleteScrapeBanner({
  portalCount,
  storedCount,
  entityLabel = 'passes',
}: IncompleteScrapeBannerProps) {
  if (portalCount <= 0 || storedCount >= portalCount) {
    return null;
  }

  return (
    <Alert type="warning">
      Portal reports {portalCount.toLocaleString('en-IN')} {entityLabel}, but only{' '}
      {storedCount.toLocaleString('en-IN')} are stored. Re-run scrape from Khanan Config to fetch
      missing rows.
    </Alert>
  );
}
