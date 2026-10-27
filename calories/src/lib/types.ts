export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const SLOT_LABEL: Record<Slot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

/** Calories plus protein, carbs and fat in grams. */
export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

/** One logged item. `per` is the nutrition of a single serving; `qty` is how many servings. */
export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD, local
  slot: Slot;
  name: string;
  unit: string; // serving label, e.g. "1 cup" or "100 g"
  qty: number;
  per: Macros;
  at: number; // created timestamp
  ref?: string; // id of the saved food or meal it came from
}

export interface Food {
  id: string;
  name: string;
  unit: string;
  per: Macros;
  fav: boolean;
  uses: number;
  last: number;
}

export interface MealItem {
  name: string;
  unit: string;
  qty: number;
  per: Macros;
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
  fav: boolean;
  uses: number;
  last: number;
}

/** Targets apply from `from` onward, so changing them never rewrites history. */
export interface TargetChange {
  from: string;
  t: Macros;
}

export interface Data {
  version: 1;
  targets: TargetChange[];
  entries: Entry[];
  foods: Food[];
  meals: Meal[];
}
