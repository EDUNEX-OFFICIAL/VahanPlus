import { Inbox } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface EmptyStateCardProps {
  message: string;
  className?: string;
}

export function EmptyStateCard({ message, className }: EmptyStateCardProps) {
  return (
    <Card
      className={cn(
        'flex min-h-[140px] flex-col items-center justify-center border border-dashed border-slate-600/40 bg-slate-900/15 px-6 py-8 text-center',
        className,
      )}
    >
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/40 bg-slate-800/50"
        aria-hidden
      >
        <Inbox className="h-4 w-4 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-300">{message}</p>
    </Card>
  );
}
