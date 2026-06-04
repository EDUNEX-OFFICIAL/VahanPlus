'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ImportProgressCard } from '@/components/khanan/import/ImportProgressCard';
import { useKhananImportJob } from '@/components/khanan/import/KhananImportJobProvider';

export function ImportJobBanner() {
  const pathname = usePathname();
  const { job, isActive } = useKhananImportJob();

  if (!isActive || !job || pathname === '/khanan/import') {
    return null;
  }

  const pct =
    job.phase === 'upload' && job.totalBytes > 0
      ? Math.round((job.bytesUploaded / job.totalBytes) * 100)
      : job.expectedRows && job.expectedRows > 0
        ? Math.round((job.rowsProcessed / job.expectedRows) * 100)
        : 0;

  return (
    <div className="mb-4 rounded-xl border border-indigo-500/35 bg-indigo-500/10 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-indigo-100">Khanan import in progress</p>
        <Link
          href="/khanan/import"
          className="text-sm font-semibold text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
        >
          View progress ({pct}%)
        </Link>
      </div>
      <ImportProgressCard job={job} compact />
    </div>
  );
}
