import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SCRAPER_SPEED_PRESETS } from '@/lib/scraper-speed-presets';
import type { KhananScraperConfig, SpeedPreset } from '@/lib/scraper-config-types';

const PRESETS: { id: 'safe' | 'balanced' | 'fast'; title: string; hint: string }[] = [
  { id: 'safe', title: 'Safe', hint: 'Slow' },
  { id: 'balanced', title: 'Balanced', hint: 'Default' },
  { id: 'fast', title: 'Fast', hint: 'Risky' },
];

function parseIntField(raw: string, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

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
  const usingCustom = showCustom || active === 'custom';

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
              active === p.id && !usingCustom
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
              onChange={(e) =>
                onChange({
                  workerConcurrency: parseIntField(e.target.value, config.workerConcurrency),
                })
              }
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
              onChange={(e) =>
                onChange({ rateLimitMax: parseIntField(e.target.value, config.rateLimitMax) })
              }
            />
          </label>
          <label className="block text-xs text-text-secondary">
            Rate window ms
            <Input
              type="number"
              min={500}
              max={10000}
              className="mt-1"
              value={config.rateLimitDurationMs}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  rateLimitDurationMs: parseIntField(e.target.value, config.rateLimitDurationMs),
                })
              }
            />
          </label>
          <label className="block text-xs text-text-secondary">
            Delay ms
            <Input
              type="number"
              min={0}
              max={10000}
              className="mt-1"
              value={config.postDelayMs}
              disabled={disabled}
              onChange={(e) =>
                onChange({ postDelayMs: parseIntField(e.target.value, config.postDelayMs) })
              }
            />
          </label>
          <label className="block text-xs text-text-secondary sm:col-span-2">
            Fanout stagger ms
            <Input
              type="number"
              min={0}
              max={5000}
              className="mt-1"
              value={config.fanoutStaggerMs}
              disabled={disabled}
              onChange={(e) =>
                onChange({ fanoutStaggerMs: parseIntField(e.target.value, config.fanoutStaggerMs) })
              }
            />
          </label>
        </div>
      ) : null}
      {usingCustom && !showCustom ? (
        <p className="mt-2 text-xs text-text-secondary">
          Custom speed — open Custom to edit values
        </p>
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
