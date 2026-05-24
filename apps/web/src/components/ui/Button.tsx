import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'warning' | 'success';

const variants: Record<Variant, string> = {
  primary:
    'bg-indigo-500/15 border-indigo-500/40 text-indigo-100 hover:bg-indigo-500/25 active:scale-95',
  secondary:
    'bg-slate-700/20 border-slate-600/50 text-slate-200 hover:bg-slate-700/30',
  ghost: 'bg-transparent border-transparent text-indigo-400 hover:text-indigo-300',
  destructive:
    'bg-red-500/15 border-red-500/50 text-red-100 hover:bg-red-500/25 active:scale-95',
  warning:
    'bg-amber-500/10 border-amber-500/45 text-amber-100 hover:bg-amber-500/20 active:scale-95',
  success:
    'bg-emerald-500/15 border-emerald-500/45 text-emerald-100 hover:bg-emerald-500/25 active:scale-95',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
