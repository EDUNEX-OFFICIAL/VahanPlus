'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { AdaptiveDialog } from '@/components/ui/AdaptiveDialog';

const CONFIRM_PHRASE = 'DELETE ALL DATA';

interface Props {
  allowDataWipe: boolean;
  onAllowDataWipeChange: (enabled: boolean) => Promise<void>;
  onClear: () => Promise<string>;
  busy?: boolean;
}

export function KhananConfigDangerZone({
  allowDataWipe,
  onAllowDataWipeChange,
  onClear,
  busy,
}: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  const canConfirm = typed === CONFIRM_PHRASE;

  async function handleClear() {
    setError(null);
    try {
      const msg = await onClear();
      setMessage(msg);
      setOpen(false);
      setTyped('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleToggle(enabled: boolean) {
    setError(null);
    setToggleBusy(true);
    try {
      await onAllowDataWipeChange(enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update setting');
    } finally {
      setToggleBusy(false);
    }
  }

  const controlsDisabled = busy || toggleBusy;

  return (
    <Card className="border-red-500/30">
      <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Danger zone</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Remove all scraped Khanan data. Config and login are kept.
      </p>

      <div className="mt-4 rounded-xl border border-border-default/60 bg-surface-deep/30 p-3">
        <Switch
          id="allowDataWipe"
          label="Allow clear all data"
          checked={allowDataWipe}
          disabled={controlsDisabled}
          onChange={(enabled) => void handleToggle(enabled)}
        />
        <p className="mt-2 text-xs text-text-secondary">
          {allowDataWipe
            ? 'Enabled — the button below will remove all snapshots and scraped rows.'
            : 'Disabled — turn on to enable the clear action.'}
        </p>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <Button
        className="mt-4"
        variant="destructive"
        disabled={controlsDisabled || !allowDataWipe}
        onClick={() => {
          setTyped('');
          setError(null);
          setOpen(true);
        }}
      >
        Clear all data
      </Button>

      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        eyebrow="Confirm"
        title="Clear all data"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canConfirm || busy}
              onClick={() => void handleClear()}
            >
              Clear all data
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Type <span className="font-mono text-white">{CONFIRM_PHRASE}</span> to confirm.
        </p>
        <Input
          className="mt-4"
          value={typed}
          disabled={busy}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          autoComplete="off"
        />
      </AdaptiveDialog>
    </Card>
  );
}
