import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function ResponsiveTableFrame({
  children,
  mobile,
  className,
  tableClassName,
}: {
  children: ReactNode;
  mobile?: ReactNode;
  className?: string;
  tableClassName?: string;
}) {
  return (
    <>
      {mobile ? <div className="space-y-3 md:hidden">{mobile}</div> : null}
      <Card className={cn('hidden overflow-hidden p-0 md:block', className)}>
        <div
          className={cn(
            'max-h-[min(68vh,760px)] overflow-auto overscroll-contain scrollbar-thin',
            tableClassName,
          )}
        >
          {children}
        </div>
      </Card>
    </>
  );
}

export function TableHeaderButton({
  children,
  align,
  onClick,
}: {
  children: ReactNode;
  align?: 'right';
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-8 items-center rounded-lg text-left uppercase tracking-wider transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70',
        align === 'right' && 'ml-auto',
      )}
    >
      {children}
    </button>
  );
}

export const tableStyles = {
  table: 'w-full border-collapse text-left text-sm',
  head: 'sticky top-0 z-10 bg-surface-primary/95 backdrop-blur-xl',
  row: 'border-b border-border-default/60 transition hover:bg-indigo-500/5',
  headerRow: 'border-b border-border-default text-xs uppercase tracking-wider text-text-secondary',
  th: 'px-4 py-3 font-semibold',
  td: 'px-4 py-3',
};
