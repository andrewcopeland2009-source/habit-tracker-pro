import { motion } from 'framer-motion';
import {
  ArrowLeft, Bell, BellOff, Database, Download, FileJson, FlaskConical, Info, ListChecks, Monitor, Moon, Palette, RotateCcw, Smartphone, Sun, Tags, Trash2, Upload, User,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Confirm, Field, Panel, Segmented, Sheet, Toggle } from '../components/ui';
import { ColorPicker } from '../features/HabitEditor';
import { REAL_DB, replaceAll, requestPersistence } from '../lib/db';
import { uid } from '../lib/defaults';
import { swatch } from '../lib/palette';
import { DEFAULT_PREFS, savePrefs, type ThemePref } from '../lib/prefs';
import { isStandalone, notificationsSupported, permission, requestPermission } from '../lib/reminders';
import { buildExport, download, habitCsv, journalCsv, parseImport, wellnessCsv, type ImportResult } from '../lib/transfer';
import { DEFAULT_CATEGORIES } from '../lib/defaults';
import type { Category } from '../lib/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';

function Group({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-muted">
        {icon}
        <span className="label-xs">{title}</span>
      </div>
      <Panel className="divide-y divide-line/70">{children}</Panel>
    </section>
  );
}

function Row({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium">{title}</div>
        {sub && <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Settings({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { prefs, setPrefs, data, toast, dark } = store;
  const ui = useUI();
  const [perm, setPerm] = useState(permission());
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<string>('');
  const [importing, setImporting] = useState<ImportResult | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [confirmCat, setConfirmCat] = useState<Category | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    void navigator.storage?.estimate?.().then((e) => e.usage !== undefined && setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB used`)).catch(() => undefined);
  }, []);

  const stamp = new Date().toISOString().slice(0, 10);
  const exportJson = () => {
    download(`habit-tracker-pro-${stamp}.json`, JSON.stringify(buildExport(data), null, 2), 'application/json');
    toast('Backup exported', 'success');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      if (f.size > 25 * 1024 * 1024) throw new Error('That file is too large to be a backup.');
      setImporting(parseImport(await f.text()));
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setReminder = (k: keyof typeof prefs.reminders, patch: Partial<{ enabled: boolean; time: string }>) =>
    setPrefs({ reminders: { ...prefs.reminders, [k]: { ...prefs.reminders[k], ...patch } } });

  const enableReminder = async (k: keyof typeof prefs.reminders, on: boolean) => {
    setReminder(k, { enabled: on });
    if (on && notificationsSupported() && permission() === 'default') setPerm(await requestPermission());
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-paper"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 40 }}
    >
      <div className="mx-auto max-w-xl pb-[calc(32px+var(--safe-bottom))] pt-safe">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line/70 bg-paper/90 px-3 py-2.5 backdrop-blur-xl">
          <button type="button" onClick={onClose} className="btn-ghost !px-2 !py-1.5" aria-label="Back">
            <ArrowLeft size={18} /> <span className="text-sm">Back</span>
          </button>
          <h1 className="font-serif text-lg font-semibold">Settings</h1>
        </header>

        <div className="space-y-5 px-4 pt-4">
          <Group icon={<User size={13} />} title="Profile">
            <div className="px-3.5 py-3">
              <Field label="Your name">
                <input className="input" value={prefs.name} maxLength={40} placeholder="What should we call you?" onChange={(e) => setPrefs({ name: e.target.value })} />
              </Field>
            </div>
            <Row title="Week starts on">
              <Segmented<'0' | '1'> className="w-36" value={String(prefs.weekStart) as '0' | '1'} onChange={(v) => setPrefs({ weekStart: Number(v) as 0 | 1 })} options={[{ value: '1', label: 'Mon' }, { value: '0', label: 'Sun' }]} />
            </Row>
          </Group>

          <Group icon={<Palette size={13} />} title="Appearance">
            <div className="grid grid-cols-3 gap-2 p-3">
              {([
                ['light', 'Light', Sun, '#fbf7f0', '#f8cdd3'],
                ['dark', 'Dark', Moon, '#1a1716', '#96626c'],
                ['system', 'System', Monitor, 'linear-gradient(135deg,#fbf7f0 50%,#1a1716 50%)', '#d8ccef'],
              ] as [ThemePref, string, typeof Sun, string, string][]).map(([v, l, I, bg, acc]) => (
                <button key={v} type="button" aria-pressed={prefs.theme === v} onClick={() => setPrefs({ theme: v })} className={`rounded-2xl border-2 p-1.5 text-center transition ${prefs.theme === v ? 'border-accent' : 'border-transparent'}`}>
                  <div className="relative h-14 overflow-hidden rounded-xl border border-line" style={{ background: bg }}>
                    <span className="absolute bottom-1.5 left-1.5 h-2 w-8 rounded-full" style={{ background: acc }} />
                    <span className="absolute left-1.5 top-1.5 h-2 w-5 rounded-full bg-[#a9cc9f]" />
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold"><I size={12} /> {l}</div>
                </button>
              ))}
            </div>
          </Group>

          <Group icon={<ListChecks size={13} />} title="Habits & daily reflection">
            <Row title="Manage habits" sub="Edit, reorder, archive or delete">
              <button type="button" className="btn-soft !py-1.5 text-xs" onClick={ui.manageHabits}>Open</button>
            </Row>
            <Row title="Require daily reflection" sub="Show the gratitude reflection before the dashboard on your first visit each day. Recommended.">
              <Toggle label="Require daily reflection" checked={prefs.reflectionRequired} onChange={(v) => setPrefs({ reflectionRequired: v })} />
            </Row>
          </Group>

          <Group icon={<Tags size={13} />} title="Habit categories">
            <div className="flex flex-wrap gap-1.5 p-3">
              {data.categories.map((c) => {
                const s = swatch(c.color, dark);
                return (
                  <button key={c.id} type="button" onClick={() => setEditCat(c)} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: s.fill, color: s.ink }}>
                    {c.name}
                  </button>
                );
              })}
              <button type="button" onClick={() => setEditCat({ id: uid(), name: '', color: 'lavender', builtIn: false })} className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-muted">
                + New category
              </button>
            </div>
          </Group>

          <Group icon={<Bell size={13} />} title="Reminders">
            <div className="px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
              Habit Tracker Pro runs entirely on your device with no server, so it can’t send push notifications while it’s fully closed. Reminders appear
              while the app is open or running in the background. On iPhone, system notifications require iOS 16.4 or later, the app added to your Home
              Screen, and permission. Otherwise reminders show inside the app.
              <div className="mt-2 flex items-center gap-2 font-semibold text-ink">
                {perm === 'granted' ? <Bell size={13} /> : <BellOff size={13} />}
                Notifications: {perm === 'unsupported' ? (isStandalone() ? 'not supported on this device' : 'not available in this browser (try installing to Home Screen)') : perm === 'granted' ? 'allowed' : perm === 'denied' ? 'blocked in system settings' : 'not yet allowed'}
              </div>
              {perm === 'default' && (
                <button type="button" className="btn-soft mt-2 !py-1.5 text-xs" onClick={async () => setPerm(await requestPermission())}>
                  Allow notifications
                </button>
              )}
            </div>
            {([
              ['morning', 'Morning reflection', 'If today’s reflection isn’t done yet'],
              ['habits', 'Habit reminder', 'Lists habits still open today'],
              ['evening', 'Evening check-in', 'Log mood and wrap up the day'],
            ] as const).map(([k, title, sub]) => (
              <Row key={k} title={title} sub={sub}>
                <input type="time" className="input !w-[104px] !px-2 !py-1.5 !text-sm" value={prefs.reminders[k].time} disabled={!prefs.reminders[k].enabled} onChange={(e) => e.target.value && setReminder(k, { time: e.target.value })} aria-label={`${title} time`} />
                <Toggle label={title} checked={prefs.reminders[k].enabled} onChange={(v) => enableReminder(k, v)} />
              </Row>
            ))}
          </Group>

          <Group icon={<Database size={13} />} title="Your data">
            <div className="bg-butter/20 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/80">
              Everything is stored only on this device, in this browser. Clearing website data, deleting the app from your Home Screen, or iOS storage
              cleanup can erase it. Export a backup regularly.
              <div className="mt-1.5 text-muted">
                {persisted === true ? 'Persistent storage is granted.' : persisted === false ? 'Storage may be cleared by the browser under pressure.' : ''} {usage}
              </div>
              {persisted === false && (
                <button type="button" className="btn-soft mt-2 !py-1.5 text-xs" onClick={async () => { const ok = await requestPersistence(); setPersisted(ok); toast(ok ? 'Persistent storage granted' : 'The browser declined — keep regular backups', ok ? 'success' : 'info'); }}>
                  Request persistent storage
                </button>
              )}
            </div>
            {prefs.demo && <div className="bg-lavender/25 px-3.5 py-2.5 text-[11.5px] font-medium">You’re in demo mode. Exports and imports apply to demo data.</div>}
            <Row title="Export backup (JSON)" sub="Complete, re-importable backup">
              <button type="button" className="btn-soft !py-1.5 text-xs" onClick={exportJson}><FileJson size={14} /> Export</button>
            </Row>
            <Row title="Export spreadsheets (CSV)" sub="Open in Numbers, Excel or Google Sheets">
              <div className="flex flex-col gap-1">
                <button type="button" className="btn-soft !py-1 text-[11px]" onClick={() => download(`habits-${stamp}.csv`, habitCsv(data), 'text/csv')}><Download size={12} /> Habits</button>
                <button type="button" className="btn-soft !py-1 text-[11px]" onClick={() => download(`journal-${stamp}.csv`, journalCsv(data), 'text/csv')}><Download size={12} /> Journal</button>
                <button type="button" className="btn-soft !py-1 text-[11px]" onClick={() => download(`wellness-${stamp}.csv`, wellnessCsv(data), 'text/csv')}><Download size={12} /> Wellness</button>
              </div>
            </Row>
            <Row title="Import backup" sub="Replaces current data after you confirm">
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button type="button" className="btn-soft !py-1.5 text-xs" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import</button>
            </Row>
            <Row title="Demo data" sub={prefs.demo ? 'Previewing sample data. Your real data is untouched.' : 'Preview the app with three months of sample data, kept completely separate from yours.'}>
              <button type="button" className="btn-soft !py-1.5 text-xs" onClick={async () => { await store.setDemo(!prefs.demo); toast(prefs.demo ? 'Back to your data' : 'Demo data loaded'); onClose(); }}>
                <FlaskConical size={14} /> {prefs.demo ? 'Exit demo' : 'Try demo'}
              </button>
            </Row>
            <Row title="Reset application" sub="Permanently erase all habits, reflections and history">
              <button type="button" className="btn-danger !py-1.5 text-xs" onClick={() => setConfirmReset(true)}><RotateCcw size={14} /> Reset</button>
            </Row>
          </Group>

          <Group icon={<Info size={13} />} title="About">
            <Row title="Habit Tracker Pro" sub={`Version 1.0 · data schema v${buildExport(data).schema}`} />
            <Row title="Install on iPhone" sub="In Safari, tap Share → Add to Home Screen. The app then opens full-screen and works offline.">
              <Smartphone size={18} className="text-muted" />
            </Row>
            <Row title="Status" sub={`${isStandalone() ? 'Running as an installed app' : 'Running in the browser'} · ${navigator.onLine ? 'online' : 'offline'}`} />
            <Row title="Privacy" sub="No accounts, no tracking, no servers. Your entries never leave this device unless you export them." />
          </Group>
        </div>
      </div>

      <Sheet
        open={!!importing}
        onClose={() => setImporting(null)}
        title="Import backup?"
        footer={
          <div className="flex gap-2">
            <button type="button" className="btn-soft flex-1" onClick={() => setImporting(null)}>Cancel</button>
            <button
              type="button"
              className="btn-danger flex-1"
              onClick={async () => {
                if (!importing) return;
                await store.replaceData(importing.data);
                if (!prefs.demo) setPrefs({ onboarded: true });
                toast('Backup imported', 'success');
                setImporting(null);
              }}
            >
              Replace my data
            </button>
          </div>
        }
      >
        {importing && (
          <div className="space-y-3 text-sm">
            <p className="text-muted">This replaces everything currently stored {prefs.demo ? 'in demo mode' : 'on this device'} with the backup. Consider exporting first.</p>
            <ul className="grid grid-cols-2 gap-1.5 text-xs">
              {Object.entries(importing.counts).map(([k, v]) => (
                <li key={k} className="flex justify-between rounded-lg bg-sunk px-2.5 py-1.5 capitalize"><span>{k}</span><b className="tabular">{v}</b></li>
              ))}
            </ul>
            {importing.skipped > 0 && <p className="text-xs text-coral">{importing.skipped} invalid record{importing.skipped === 1 ? '' : 's'} will be skipped.</p>}
          </div>
        )}
      </Sheet>

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset everything?"
        confirmLabel="Erase all data"
        message="This permanently deletes every habit, completion, reflection, mood, sleep, water and goal record on this device. It cannot be undone. Export a backup first if you might want it later."
        onConfirm={async () => {
          await replaceAll(REAL_DB, { habits: [], completions: [], categories: DEFAULT_CATEGORIES, reflections: [], moods: [], sleep: [], water: [], goals: [] });
          savePrefs(DEFAULT_PREFS);
          window.location.reload();
        }}
      />

      <Sheet
        open={!!editCat}
        onClose={() => setEditCat(null)}
        title={editCat && data.categories.some((c) => c.id === editCat.id) ? 'Edit category' : 'New category'}
        footer={
          editCat && (
            <div className="flex gap-2">
              {!editCat.builtIn && data.categories.some((c) => c.id === editCat.id) && (
                <button type="button" className="btn-soft !px-3" aria-label="Delete category" onClick={() => setConfirmCat(editCat)}><Trash2 size={16} /></button>
              )}
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={async () => {
                  if (!editCat.name.trim()) return toast('Name the category.', 'error');
                  await store.saveCategory({ ...editCat, name: editCat.name.trim().slice(0, 40) });
                  setEditCat(null);
                }}
              >
                Save
              </button>
            </div>
          )
        }
      >
        {editCat && (
          <div className="space-y-4">
            <Field label="Name">
              <input className="input" value={editCat.name} maxLength={40} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} />
            </Field>
            <Field label="Color">
              <ColorPicker value={editCat.color} onChange={(color) => setEditCat({ ...editCat, color })} />
            </Field>
            {editCat.builtIn && <p className="text-[11px] text-muted">Default categories can be renamed and recolored but not deleted.</p>}
          </div>
        )}
      </Sheet>
      <Confirm
        open={!!confirmCat}
        onClose={() => setConfirmCat(null)}
        title="Delete category?"
        message={`Habits and goals in “${confirmCat?.name}” will move to Personal. Their history is kept.`}
        onConfirm={async () => {
          if (confirmCat) await store.deleteCategory(confirmCat.id);
          setEditCat(null);
        }}
      />
    </motion.div>
  );
}
