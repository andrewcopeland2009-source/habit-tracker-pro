import { Plus, Search, Star, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, MacroLine, Segmented } from '../components/ui';
import { fmt, mealPer, rank } from '../lib/nutrition';
import { useStore } from '../lib/store';
import type { Food, Meal } from '../lib/types';

export function Library({ onFood, onMeal }: { onFood: (f: Food | 'new') => void; onMeal: (m: Meal | 'new') => void }) {
  const { data, toggleFoodFav, toggleMealFav } = useStore();
  const [tab, setTab] = useState<'foods' | 'meals'>('foods');
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const foods = useMemo(() => rank(data.foods).filter((f) => f.name.toLowerCase().includes(query)), [data.foods, query]);
  const meals = useMemo(() => rank(data.meals).filter((m) => m.name.toLowerCase().includes(query)), [data.meals, query]);

  const empty = tab === 'foods' ? data.foods.length === 0 : data.meals.length === 0;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[22px] font-semibold tracking-tight">Library</h1>
        <button className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 py-2 text-sm font-medium active:bg-white/[0.12]" onClick={() => (tab === 'foods' ? onFood('new') : onMeal('new'))}>
          <Plus size={16} /> {tab === 'foods' ? 'Food' : 'Meal'}
        </button>
      </header>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'foods', label: `Foods${data.foods.length ? ` · ${data.foods.length}` : ''}` },
          { value: 'meals', label: `Meals${data.meals.length ? ` · ${data.meals.length}` : ''}` },
        ]}
      />

      {!empty && (
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input pl-10" placeholder={`Search ${tab}`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {empty ? (
        <Card className="px-6 py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] text-muted">{tab === 'foods' ? <Star size={20} /> : <Utensils size={20} />}</div>
          <p className="mx-auto mt-4 max-w-[17rem] text-sm leading-relaxed text-muted">
            {tab === 'foods'
              ? 'Every food you log is saved here automatically. Pin favourites with the star to keep them on top.'
              : 'Combine foods you often eat together into one tap. You can also save any logged meal from its ••• menu.'}
          </p>
          <button className="btn-primary mx-auto mt-6 px-6" onClick={() => (tab === 'foods' ? onFood('new') : onMeal('new'))}>
            {tab === 'foods' ? 'Add a food' : 'Create a meal'}
          </button>
        </Card>
      ) : (
        <Card className="px-4">
          <ul className="divide-y divide-line">
            {tab === 'foods'
              ? foods.map((f) => (
                  <Item key={f.id} name={f.name} sub={f.unit} kcal={f.per.kcal} macros={f.per} fav={f.fav} uses={f.uses} onFav={() => toggleFoodFav(f.id)} onOpen={() => onFood(f)} />
                ))
              : meals.map((m) => {
                  const per = mealPer(m.items);
                  return (
                    <Item
                      key={m.id}
                      name={m.name}
                      sub={`${m.items.length} item${m.items.length === 1 ? '' : 's'}`}
                      kcal={per.kcal}
                      macros={per}
                      fav={m.fav}
                      uses={m.uses}
                      onFav={() => toggleMealFav(m.id)}
                      onOpen={() => onMeal(m)}
                    />
                  );
                })}
          </ul>
          {((tab === 'foods' && !foods.length) || (tab === 'meals' && !meals.length)) && <p className="py-8 text-center text-sm text-faint">No matches.</p>}
        </Card>
      )}
    </div>
  );
}

function Item(props: { name: string; sub: string; kcal: number; macros: { p: number; c: number; f: number }; fav: boolean; uses: number; onFav: () => void; onOpen: () => void }) {
  return (
    <li className="flex items-center gap-2">
      <button className="-ml-1 p-1.5 text-faint active:scale-90" aria-label={props.fav ? 'Unpin' : 'Pin'} onClick={props.onFav}>
        <Star size={16} className={props.fav ? 'fill-carbs text-carbs' : ''} />
      </button>
      <button className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left active:opacity-60" onClick={props.onOpen}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium">{props.name}</div>
          <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-faint">
            {props.sub && <span className="truncate">{props.sub}</span>}
            <MacroLine {...props.macros} />
          </div>
        </div>
        <div className="text-right">
          <div className="tnum text-sm text-muted">{fmt(props.kcal)}</div>
          {props.uses > 0 && <div className="tnum text-[11px] text-faint">×{props.uses}</div>}
        </div>
      </button>
    </li>
  );
}
