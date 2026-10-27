import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { useStore } from '../lib/store';
import type { Food } from '../lib/types';
import { useUI } from '../lib/ui';
import { blankDraft, finalize, FoodForm, type FoodDraft } from './FoodForm';

/** Create or edit a saved food. `food === 'new'` creates one. */
export function FoodSheet({ food, onClose }: { food: Food | 'new' | null; onClose: () => void }) {
  const { saveFood, deleteFood } = useStore();
  const { confirm } = useUI();
  const [draft, setDraft] = useState<FoodDraft>(blankDraft());
  const editing = food && food !== 'new' ? food : null;

  useEffect(() => {
    if (food === 'new') setDraft(blankDraft());
    else if (food) setDraft({ name: food.name, unit: food.unit, per: food.per });
  }, [food]);

  const save = () => {
    saveFood({ ...(editing ?? {}), ...finalize(draft) });
    onClose();
  };

  const remove = async () => {
    if (!editing) return;
    if (await confirm({ title: `Delete ${editing.name}?`, body: 'It’s removed from your saved foods. Past entries stay as they are.', confirm: 'Delete', danger: true })) {
      deleteFood(editing.id);
      onClose();
    }
  };

  return (
    <Sheet
      open={!!food}
      onClose={onClose}
      title={editing ? 'Edit food' : 'New food'}
      left={
        editing && (
          <button aria-label="Delete" className="icon-btn text-over" onPointerDown={(e) => e.stopPropagation()} onClick={remove}>
            <Trash2 size={17} />
          </button>
        )
      }
      footer={
        <button className="btn-primary w-full" disabled={!draft.name.trim()} onClick={save}>
          Save
        </button>
      }
    >
      <div className="pt-1">
        <FoodForm draft={draft} onChange={setDraft} autoFocus={food === 'new'} />
      </div>
    </Sheet>
  );
}
