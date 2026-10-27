import { Download, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Card, Field, MACRO_COLOR, NumberInput } from '../components/ui';
import { fmt, kcalFromMacros } from '../lib/nutrition';
import { exportBackup, getMeta, requestPersistence, validate } from '../lib/storage';
import { useStore } from '../lib/store';
import type { Macros } from '../lib/types';
import { useUI } from '../lib/ui';

export function Settings({ today }: { today: string }) {
  const { data, targetsOn, setTargets, replaceAll, eraseAll, saveFailed } = useStore();
  const { toast, confirm } = useUI();
  const current = targetsOn(today);
  const [t, setT] = useState<Macros>(current);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lastExport, setLastExport] = useState(getMeta().lastExport);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => setT(current), [current]);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  const dirty = (['kcal', 'p', 'c', 'f'] as const).some((k) => Math.round(t[k]) !== Math.round(current[k]));
  const macroKcal = kcalFromMacros(t);

  const saveTargets = () => {
    setTargets({ kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) }, today);
    toast('Targets updated');
  };

  const exportData = async () => {
    if ((await exportBackup(data, today)) === 'cancelled') return;
    setLastExport(Date.now());
    toast('Backup saved');
  };

  const importData = async (f: File) => {
    try {
      const next = validate(JSON.parse(await f.text()));
      const days = new Set(next.entries.map((e) => e.date)).size;
      const ok = await confirm({
        title: 'Replace your data?',
        body: `This backup has ${next.entries.length} entries across ${days} days, ${next.foods.length} foods and ${next.meals.length} meals. Everything currently on this device will be replaced.`,
        confirm: 'Replace',
        danger: true,
      });
      if (!ok) return;
      replaceAll(next);
      toast('Backup restored');
    } catch (e) {
      toast(e instanceof SyntaxError ? 'That file isn’t valid JSON.' : e instanceof Error ? e.message : 'Import failed');
    }
  };

  const erase = async () => {
    const ok = await confirm({ title: 'Erase everything?', body: 'All entries, saved foods, meals and targets will be deleted from this device. Export a backup first if you might want them.', confirm: 'Erase', danger: true });
    if (ok) {
      eraseAll();
      toast('All data erased');
    }
  };

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-[22px] font-semibold tracking-tight">Settings</h1>
      </header>

      <Card className="p-5">
        <h2 className="text-[15px] font-semibold tracking-tight">Daily targets</h2>
        <p className="mt-1 text-xs text-faint">Changes apply from today; past days keep the targets they had.</p>
        <div className="mt-4 space-y-3">
          <Field label="Calories" hint="kcal">
            <NumberInput value={t.kcal} onChange={(kcal) => setT({ ...t, kcal })} className="text-lg font-semibold" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            {(['p', 'c', 'f'] as const).map((k) => (
              <Field key={k} label={{ p: 'Protein', c: 'Carbs', f: 'Fat' }[k]} accent={MACRO_COLOR[k]}>
                <div className="relative">
                  <NumberInput value={t[k]} onChange={(v) => setT({ ...t, [k]: v })} className="pr-7" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">g</span>
                </div>
              </Field>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-faint">
            <span>
              Macros add up to <span className="tnum text-muted">{fmt(macroKcal)}</span> kcal
            </span>
            {macroKcal > 0 && Math.abs(macroKcal - t.kcal) > 50 && (
              <button className="font-medium text-accent" onClick={() => setT({ ...t, kcal: Math.round(macroKcal) })}>
                Use as calorie target
              </button>
            )}
          </div>
        </div>
        <button className="btn-primary mt-5 w-full" disabled={!dirty || t.kcal <= 0} onClick={saveTargets}>
          Save targets
        </button>
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-semibold tracking-tight">Your data</h2>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          Everything is stored only on this device, in this browser. Export a backup now and then so nothing is ever lost.
        </p>
        {saveFailed && <p className="mt-3 rounded-xl bg-over/10 px-3 py-2 text-xs text-over">The browser refused to save the latest change — storage may be full. Export a backup now.</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="tile" onClick={exportData}>
            <Download size={16} /> Export
          </button>
          <button className="tile" onClick={() => file.current?.click()}>
            <Upload size={16} /> Import
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) importData(f);
            }}
          />
        </div>
        <dl className="mt-4 space-y-2 text-xs">
          <Row label="Entries" value={`${fmt(data.entries.length)} · ${fmt(new Set(data.entries.map((e) => e.date)).size)} days`} />
          <Row label="Saved foods & meals" value={`${data.foods.length} · ${data.meals.length}`} />
          <Row label="Last backup" value={lastExport ? new Date(lastExport).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'} />
          <Row
            label="Protected storage"
            value={
              persisted ? (
                <span className="inline-flex items-center gap-1 text-accent">
                  <ShieldCheck size={13} /> On
                </span>
              ) : persisted === false ? (
                <button className="font-medium text-accent" onClick={() => requestPersistence().then((v) => setPersisted(v))}>
                  Turn on
                </button>
              ) : (
                'Unavailable'
              )
            }
          />
        </dl>
      </Card>

      <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm text-over/80 active:bg-over/10" onClick={erase}>
        <Trash2 size={15} /> Erase all data
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-faint">{label}</dt>
      <dd className="tnum text-muted">{value}</dd>
    </div>
  );
}
