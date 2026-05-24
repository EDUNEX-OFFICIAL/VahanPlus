import { Card } from '@/components/ui/Card';
import type { ScraperConfigStatus } from '@/lib/scraper-config-types';

interface Props {
  status: ScraperConfigStatus;
  updatedAt: string;
}

/** Queue headline: Paused | Working (active/waiting) | Ready (idle, accepting jobs). */
function queueHeadline(status: ScraperConfigStatus): {
  label: string;
  className: string;
} {
  const q = status.queue;
  if (q.isPaused) {
    return { label: 'Paused', className: 'text-amber-400' };
  }
  const waiting = q.waiting ?? 0;
  const active = q.active ?? 0;
  if (active > 0 || waiting > 0) {
    return { label: 'Working', className: 'text-emerald-400' };
  }
  return { label: 'Ready', className: 'text-slate-300' };
}

function liveCounts(status: ScraperConfigStatus): string {
  const q = status.queue;
  const parts: string[] = [];
  const waiting = q.waiting ?? 0;
  const active = q.active ?? 0;
  if (waiting) parts.push(`${waiting} waiting`);
  if (active) parts.push(`${active} active`);
  return parts.join(' · ');
}

export function KhananConfigStatusBar({ status, updatedAt }: Props) {
  const { label, className } = queueHeadline(status);
  const counts = liveCounts(status);
  const paused = status.queue.isPaused;

  return (
    <Card className={paused ? 'border-amber-500/40' : 'border-slate-700/50'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Queue</p>
          <p className="mt-2 text-lg font-semibold text-white">
            <span className={className}>{label}</span>
            {counts ? (
              <span className="ml-2 text-base font-normal text-text-secondary">· {counts}</span>
            ) : null}
          </p>
        </div>
        <p className="text-xs text-text-secondary">
          Saved{' '}
          {new Date(updatedAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      </div>
    </Card>
  );
}
