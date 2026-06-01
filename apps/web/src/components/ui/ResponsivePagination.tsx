'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
}

export function ResponsivePagination({
  total,
  offset,
  pageSize,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
}: {
  total: number;
  offset: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (nextOffset: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  className?: string;
}) {
  const [input, setInput] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(totalPages, Math.floor(offset / pageSize) + 1);
  const pages = useMemo(() => pageWindow(currentPage, totalPages), [currentPage, totalPages]);
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + pageSize, total);

  function go(page: number) {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    onPageChange((safePage - 1) * pageSize);
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-border-default/70 bg-surface-primary/70 p-3 shadow-lg shadow-black/20 backdrop-blur-xl',
        className,
      )}
      aria-label="Pagination"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-text-secondary tabular-nums">
          {pageStart}-{pageEnd} of {total}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            className="min-w-11 px-3 text-xs"
            disabled={currentPage <= 1}
            onClick={() => go(currentPage - 1)}
            aria-label="Previous page"
          >
            Prev
          </Button>

          <div className="hidden items-center gap-1 sm:flex">
            {pages.map((page, index) => {
              const prev = pages[index - 1];
              return (
                <span key={page} className="flex items-center gap-1">
                  {prev && page - prev > 1 ? (
                    <span className="px-1 text-xs text-text-muted">...</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => go(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70',
                      page === currentPage
                        ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.25)]'
                        : 'border-border-default bg-surface-deep/60 text-text-secondary hover:text-white',
                    )}
                  >
                    {page}
                  </button>
                </span>
              );
            })}
          </div>

          <span className="sm:hidden rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-100 tabular-nums">
            {currentPage}/{totalPages}
          </span>

          <Button
            variant="secondary"
            className="min-w-11 px-3 text-xs"
            disabled={currentPage >= totalPages}
            onClick={() => go(currentPage + 1)}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Page
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input) {
                  go(Number(input));
                  setInput('');
                }
              }}
              inputMode="numeric"
              placeholder={String(currentPage)}
              className="h-11 w-20 rounded-xl border border-border-default bg-surface-deep px-3 text-sm text-white outline-none focus:border-indigo-400"
              aria-label="Go to page"
            />
          </label>
          {onPageSizeChange ? (
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              Rows
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-11 rounded-xl border border-border-default bg-surface-deep px-3 text-sm text-white outline-none focus:border-indigo-400"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>
    </section>
  );
}
