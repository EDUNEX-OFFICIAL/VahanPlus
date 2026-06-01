import { Database } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface Props {
  message: string;
  className?: string;
}

export function EpassEmptyState({ message, className }: Props) {
  return (
    <Card
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center border border-dashed border-slate-600/50 bg-slate-900/20 px-6 py-10 text-center',
        className,
      )}
    >
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-600/50 bg-slate-800/60"
        aria-hidden
      >
        <Database className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-200">{message}</p>
    </Card>
  );
}
