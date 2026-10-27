import { ChevronDown, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { Segmented } from '../components/ui';
import { useStore } from '../lib/store';
import type { Entry, Slot } from '../lib/types';
import { SLOTS, SLOT_LABEL } from '../lib/types';
import { useUI } from '../lib/ui';
import { finalize, FoodForm, type FoodDraft } from './FoodForm';
import { Portion } from './Portion';

export function EditEntrySheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const { updateEntry, deleteEntry, restoreEntry } = useStore();
  const { toast } = useUI();
  const [qty, setQty] = useState(1);
  const [slot, setSlot] = useState<Slot>('snack');
  const [draft, setDraft] = useState<FoodDraft>({ name: '', unit: '', per: { kcal: 0, p: 0, c: 0, f: 0 } });
  const [details, setDetails] = useState(false);
  const [shown, setShown] = useState<Entry | null>(entry);

  useEffect(() => {
    if (!entry) return;
    setShown(entry);
    setQty(entry.qty);
    setSlot(entry.slot);
    setDraft({ name: entry.name, unit: entry.unit, per: entry.per });
    setDetails(false);
  }, [entry]);

  const save = () => {
    if (!shown) return;
    const d = finalize(draft);
    updateEntry(shown.id, { qty, slot, name: d.name || shown.name, unit: d.unit, per: d.per });
    onClose();
  };

  const remove = () => {
    if (!shown) return;
    const e = deleteEntry(shown.id);
    onClose();
    if (e) toast(`Deleted ${e.name}`, { label: 'Undo', run: () => restoreEntry(e) });
  };

  return (
    <Sheet
      open={!!entry}
      onClose={onClose}
      title={shown?.name}
      left={
        <button aria-label="Delete" className="icon-btn text-over" onPointerDown={(e) => e.stopPropagation()} onClick={remove}>
          <Trash2 size={17} />
        </button>
      }
      footer={
        <button className="btn-primary w-full" onClick={save}>
          Save
        </button>
      }
    >
      {shown && (
        <div className="space-y-5 pt-1">
          <Segmented size="sm" value={slot} options={SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))} onChange={setSlot} />
          <Portion unit={draft.unit} per={finalize(draft).per} qty={qty} onChange={setQty} />
          <div>
            <button className="flex w-full items-center justify-between py-1 text-sm text-muted" onClick={() => setDetails((v) => !v)}>
              Edit name &amp; nutrition
              <ChevronDown size={16} className={`transition-transform ${details ? 'rotate-180' : ''}`} />
            </button>
            {details && (
              <div className="mt-3">
                <FoodForm draft={draft} onChange={setDraft} />
                <p className="mt-2 text-xs text-faint">Values are per serving. Changes apply to this entry only.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
