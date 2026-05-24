import { ReactNode } from 'react';

type AlertType = 'error' | 'warning';

const styles: Record<AlertType, string> = {
  error: 'border-red-500/30 bg-red-500/10 text-red-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300 backdrop-blur',
};

export function Alert({
  type = 'error',
  children,
}: {
  type?: AlertType;
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-3 text-sm ${styles[type]}`}
    >
      {children}
    </div>
  );
}
