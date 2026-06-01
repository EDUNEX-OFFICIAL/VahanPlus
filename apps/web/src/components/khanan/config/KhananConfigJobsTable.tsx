import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatJobStatusLabel, formatJobTypeLabel } from '@/lib/scraper-config-labels';
import type { ScraperJobListItem } from '@/lib/scraper-config-types';

interface Props {
  jobs: ScraperJobListItem[];
  loading?: boolean;
}

export function KhananConfigJobsTable({ jobs, loading }: Props) {
  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Activity</h3>
      {loading ? (
        <p className="mt-4 text-sm text-text-secondary">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">None</p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {jobs.map((job) => (
              <MobileDataCard
                key={job.id}
                eyebrow="Activity"
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
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs uppercase text-text-secondary">
                  <th className="pb-2 pr-4">Task</th>
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2 pr-4">When</th>
                  <th className="pb-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-slate-800/50">
                    <td className="py-2 pr-4 text-white">{formatJobTypeLabel(job.type)}</td>
                    <td className="py-2 pr-4 text-text-secondary">
                      {formatJobStatusLabel(job.status)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-text-secondary">
                      {new Date(job.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="max-w-xs truncate py-2 text-red-300/80" title={job.error ?? ''}>
                      {job.error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
