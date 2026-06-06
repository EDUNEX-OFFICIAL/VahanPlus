import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatJobStatusLabel, formatJobTypeLabel } from '@/lib/scraper-config-labels';
import type { ScraperJobListItem } from '@/lib/scraper-config-types';
import { cn } from '@/lib/utils';

interface Props {
  jobs: ScraperJobListItem[];
  loading?: boolean;
  title?: string;
  hideTitle?: boolean;
  compact?: boolean;
}

export function KhananConfigJobsTable({
  jobs,
  loading,
  title = 'Activity',
  hideTitle = false,
  compact = false,
}: Props) {
  const rowPad = compact ? 'py-1.5' : 'py-2';
  const headPad = compact ? 'pb-1.5' : 'pb-2';
  const headSize = compact ? 'text-[11px]' : 'text-xs';

  return (
    <div>
      {!hideTitle ? (
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</h4>
      ) : null}
      {loading ? (
        <p className={cn('text-sm text-text-secondary', !hideTitle && 'mt-4')}>Loading…</p>
      ) : jobs.length === 0 ? (
        <p className={cn('text-sm text-text-secondary', !hideTitle && 'mt-4')}>None</p>
      ) : (
        <>
          <div className={cn('space-y-2 md:hidden', !hideTitle && 'mt-4')}>
            {jobs.map((job) => (
              <MobileDataCard
                key={job.id}
                eyebrow={title}
                title={formatJobTypeLabel(job.type)}
                meta={
                  <Chip
                    tone={
                      job.status === 'completed'
                        ? 'emerald'
                        : job.status === 'failed'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {formatJobStatusLabel(job.status)}
                  </Chip>
                }
              >
                <DataField
                  label="When"
                  value={new Date(job.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                />
                <DataField label="Note" value={job.error ?? '—'} />
              </MobileDataCard>
            ))}
          </div>
          <div className={cn('hidden overflow-x-auto md:block', !hideTitle && 'mt-4')}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className={cn(
                    'border-b border-slate-700/50 uppercase text-text-secondary',
                    headSize,
                  )}
                >
                  <th className={cn(headPad, 'pr-3')}>Task</th>
                  <th className={cn(headPad, 'pr-3')}>Result</th>
                  <th className={cn(headPad, 'pr-3')}>When</th>
                  <th className={headPad}>Note</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-slate-800/50">
                    <td className={cn(rowPad, 'pr-3 text-white')}>
                      {formatJobTypeLabel(job.type)}
                    </td>
                    <td className={cn(rowPad, 'pr-3 text-text-secondary')}>
                      {formatJobStatusLabel(job.status)}
                    </td>
                    <td className={cn(rowPad, 'pr-3 tabular-nums text-text-secondary')}>
                      {new Date(job.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td
                      className={cn(rowPad, 'max-w-[12rem] truncate text-red-300/80')}
                      title={job.error ?? ''}
                    >
                      {job.error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
