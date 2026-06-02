import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface DataErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function DataErrorCard({
  title = 'Unable to load data',
  message,
  onRetry,
  className,
}: DataErrorCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center border border-red-500/30 bg-red-500/5 px-6 py-10 text-center',
        className,
      )}
    >
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10"
        aria-hidden
      >
        <AlertCircle className="h-5 w-5 text-red-400" />
      </div>
      <p className="text-sm font-semibold text-red-300">{title}</p>
      {message ? <p className="mt-2 max-w-md text-xs text-text-secondary">{message}</p> : null}
      {onRetry ? (
        <Button className="mt-5" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Card>
  );
}
