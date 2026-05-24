'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/Switch';
import { Card } from '@/components/ui/Card';
import type { KhananScraperConfig } from '@/lib/scraper-config-types';

interface Props {
  config: KhananScraperConfig;
  onChange: (patch: Partial<KhananScraperConfig>) => void;
  disabled?: boolean;
}

export function KhananConfigPipeline({ config, onChange, disabled }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Auto fetch</h3>
      <div className="mt-4 space-y-2">
        <Switch
          id="autoFanout"
          label="On"
          checked={config.autoFanout}
          disabled={disabled}
          onChange={(v) => onChange({ autoFanout: v })}
        />
      </div>
      <button
        type="button"
        className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
        onClick={() => setMoreOpen((v) => !v)}
      >
        {moreOpen ? 'Hide skips' : 'Skip steps'}
      </button>
      {moreOpen ? (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-700/50 bg-surface-deep/30 p-3">
          <Switch
            id="skipChallan"
            label="Skip challan"
            checked={config.skipChallan}
            disabled={disabled || !config.autoFanout}
            onChange={(v) => onChange({ skipChallan: v })}
          />
          <Switch
            id="skipChallanPass"
            label="Skip pass"
            checked={config.skipChallanPass}
            disabled={disabled || !config.autoFanout}
            onChange={(v) => onChange({ skipChallanPass: v })}
          />
          <Switch
            id="skipVehicleStatus"
            label="Skip vehicle"
            checked={config.skipVehicleStatus}
            disabled={disabled || !config.autoFanout}
            onChange={(v) => onChange({ skipVehicleStatus: v })}
          />
        </div>
      ) : null}
    </Card>
  );
}
