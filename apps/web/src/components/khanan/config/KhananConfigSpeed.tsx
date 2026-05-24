import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { KhananScraperConfig, SpeedPreset } from '@/lib/scraper-config-types';

const PRESETS: { id: 'safe' | 'balanced' | 'fast'; title: string; hint: string }[] = [
  { id: 'safe', title: 'Safe', hint: 'Slow' },
  { id: 'balanced', title: 'Balanced', hint: 'Default' },
  { id: 'fast', title: 'Fast', hint: 'Risky' },
];

interface Props {
  config: KhananScraperConfig;
  draftPreset: 'safe' | 'balanced' | 'fast' | null;
  showCustom: boolean;
  dirty: boolean;
  saveBusy: boolean;
  justSaved: boolean;
  saveError: string | null;
  onSelectPreset: (preset: 'safe' | 'balanced' | 'fast') => void;
  onToggleCustom: () => void;
  onChange: (patch: Partial<KhananScraperConfig>) => void;
  onSave: () => void;
  disabled?: boolean;
}

export function KhananConfigSpeed({
  config,
  draftPreset,
  showCustom,
  dirty,
  saveBusy,
  justSaved,
  saveError,
  onSelectPreset,
  onToggleCustom,
  onChange,
  onSave,
  disabled,
}: Props) {
  const active: SpeedPreset = draftPreset ?? config.speedPreset;

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Speed</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPreset(p.id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              active === p.id && !showCustom
                ? 'border-indigo-500/60 bg-indigo-500/10'
                : 'border-slate-700/50 bg-surface-deep/40 hover:border-slate-600'
            }`}
          >
            <span className="block font-semibold text-white">{p.title}</span>
            <span className="mt-1 block text-xs text-text-secondary">{p.hint}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
        onClick={onToggleCustom}
      >
        {showCustom ? 'Hide custom' : 'Custom'}
      </button>
      {showCustom ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-text-secondary">
            Parallel (1–8)
            <Input
              type="number"
              min={1}
              max={8}
              className="mt-1"
              value={config.workerConcurrency}
              disabled={disabled}
              onChange={(e) => onChange({ workerConcurrency: Number(e.target.value) })}
            />
          </label>
          <label className="block text-xs text-text-secondary">
            Req/s (1–10)
            <Input
              type="number"
              min={1}
              max={10}
              className="mt-1"
              value={config.rateLimitMax}
              disabled={disabled}
              onChange={(e) => onChange({ rateLimitMax: Number(e.target.value) })}
            />
          </label>
          <label className="block text-xs text-text-secondary sm:col-span-2">
            Delay ms
            <Input
              type="number"
              min={0}
              max={10000}
              className="mt-1"
              value={config.postDelayMs}
              disabled={disabled}
              onChange={(e) => onChange({ postDelayMs: Number(e.target.value) })}
            />
          </label>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-700/50 pt-4">
        <Button disabled={!dirty || saveBusy || disabled} onClick={onSave}>
          Save
        </Button>
        {justSaved && !dirty ? <span className="text-sm text-emerald-400">Saved</span> : null}
        {dirty ? <span className="text-xs text-amber-400">Unsaved</span> : null}
        {saveError ? <span className="text-sm text-red-400">{saveError}</span> : null}
      </div>
    </Card>
  );
}
