import { Card } from '@/components/ui/Card';
import {
  getScraperControlMode,
  scrapeQueueInProgress,
  type ScraperControlMode,
} from '@/lib/scraper-control-mode';
import { cn } from '@/lib/utils';
import type { ScraperConfigStatus } from '@/lib/scraper-config-types';

interface Props {
  status: ScraperConfigStatus;
  updatedAt: string;
  stopCooldown?: boolean;
  optimisticRunning?: boolean;
}

type ScraperRunState = ScraperControlMode;

interface RunStatus {
  state: ScraperRunState;
  label: string;
  detail: string | null;
  dotClass: string;
  labelClass: string;
}

/** Operator-facing run state for status bar + actions. */
export function resolveRunStatus(
  status: ScraperConfigStatus,
  options?: { stopCooldown?: boolean; optimisticRunning?: boolean },
): RunStatus {
  const mode = getScraperControlMode(status, options);
  const inProgress = scrapeQueueInProgress(status);
  const q = status.queue;

  switch (mode) {
    case 'stopping':
      return {
        state: 'stopping',
        label: 'Stopping…',
        detail: null,
        dotClass: 'bg-amber-400 animate-pulse',
        labelClass: 'text-amber-300',
      };
    case 'paused':
      return {
        state: 'paused',
        label: 'Paused',
        detail:
          inProgress > 0
            ? `${inProgress} job(s) finishing`
            : (q.waiting ?? 0) > 0
              ? `${q.waiting ?? 0} job(s) waiting`
              : null,
        dotClass: 'bg-amber-400',
        labelClass: 'text-amber-300',
      };
    case 'running': {
      const waiting = (q.waiting ?? 0) + (q.delayed ?? 0);
      const active = q.active ?? 0;
      const parts: string[] = [];
      if (active > 0) parts.push(`${active} running`);
      if (waiting > 0) parts.push(`${waiting} in queue`);
      return {
        state: 'running',
        label: 'Running',
        detail: parts.length > 0 ? parts.join(' · ') : null,
        dotClass: 'bg-emerald-400 animate-pulse',
        labelClass: 'text-emerald-400',
      };
    }
    default:
      return {
        state: 'idle',
        label: 'Ready',
        detail: null,
        dotClass: 'bg-slate-500',
        labelClass: 'text-slate-200',
      };
  }
}

export { scrapeQueueInProgress };

export function KhananConfigStatusBar({
  status,
  updatedAt,
  stopCooldown,
  optimisticRunning,
}: Props) {
  const run = resolveRunStatus(status, { stopCooldown, optimisticRunning });
  const savedAt = new Date(updatedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Card
      className={cn(
        run.state === 'paused' && 'border-amber-500/40',
        run.state === 'stopping' && 'border-amber-500/40',
        run.state === 'running' && 'border-emerald-500/25',
        run.state === 'idle' && 'border-slate-700/50',
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
