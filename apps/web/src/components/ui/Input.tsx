import { InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const inputClassName =
  'h-12 w-full rounded-xl border border-border-default bg-surface-deep px-4 text-sm text-slate-200 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20';

export function Input({ label, className = '', id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : autoId);

  const input = (
    <input
      id={inputId}
      className={`${inputClassName} ${className}`}
      {...props}
    />
  );

  if (!label) {
    return input;
  }

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </span>
      {input}
    </label>
  );
}
