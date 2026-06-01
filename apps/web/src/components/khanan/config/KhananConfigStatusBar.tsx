import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { ScraperConfigStatus } from '@/lib/scraper-config-types';

interface Props {
  status: ScraperConfigStatus;
  updatedAt: string;
}

type ScraperRunState = 'stopping' | 'working' | 'ready';

interface RunStatus {
  state: ScraperRunState;
  label: string;
  detail: string | null;
  dotClass: string;
  labelClass: string;
}

export function scrapeQueueInProgress(status: ScraperConfigStatus): number {
  const q = status.queue;
  return (q.waiting ?? 0) + (q.active ?? 0);
}

function inProgressCount(status: ScraperConfigStatus): number {
  return scrapeQueueInProgress(status);
}

function formatJobCount(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/** Operator-facing run state derived from BullMQ (single source for live backlog). */
export function resolveRunStatus(status: ScraperConfigStatus): RunStatus {
  const q = status.queue;
  const inProgress = inProgressCount(status);
  const active = q.active ?? 0;
  const waiting = q.waiting ?? 0;

  if (q.isPaused && inProgress > 0) {
    return {
      state: 'stopping',
      label: 'Stopping',
      detail: formatJobCount(inProgress, 'job winding down', 'jobs winding down'),
      dotClass: 'bg-amber-400',
      labelClass: 'text-amber-400',
    };
  }

  if (inProgress > 0) {
    let detail: string;
    if (active > 0 && waiting === 0) {
      detail = formatJobCount(active, 'job running', 'jobs running');
    } else if (waiting > 0 && active === 0) {
      detail = formatJobCount(waiting, 'job starting', 'jobs starting');
    } else {
      detail = formatJobCount(inProgress, 'job in progress', 'jobs in progress');
    }
    return {
      state: 'working',
      label: 'Running',
      detail,
      dotClass: 'bg-emerald-400 animate-pulse',
      labelClass: 'text-emerald-400',
    };
  }

  return {
    state: 'ready',
    label: 'Ready',
    detail: null,
    dotClass: 'bg-slate-500',
    labelClass: 'text-slate-200',
  };
}

export function KhananConfigStatusBar({ status, updatedAt }: Props) {
  const run = resolveRunStatus(status);
  const savedAt = new Date(updatedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Card
      className={cn(
        run.state === 'stopping' && 'border-amber-500/40',
        run.state === 'working' && 'border-emerald-500/25',
        run.state === 'ready' && 'border-slate-700/50',
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Scraper status
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', run.dotClass)} aria-hidden />
            <div className="min-w-0">
              <p className={cn('text-lg font-semibold leading-tight', run.labelClass)}>
                {run.label}
              </p>
              {run.detail ? <p className="mt-1 text-sm text-text-secondary">{run.detail}</p> : null}
            </div>
          </div>
        </div>
        <p className="shrink-0 text-xs text-text-secondary">
          Settings saved
          <span className="mt-0.5 block tabular-nums text-slate-400">{savedAt}</span>
        </p>
      </div>
    </Card>
  );
}
