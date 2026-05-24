interface SwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ id, label, description, checked, onChange, disabled }: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700/50 bg-surface-deep/40 px-4 py-3 ${disabled ? 'opacity-50' : ''}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-600 accent-indigo-500"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-text-secondary">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
