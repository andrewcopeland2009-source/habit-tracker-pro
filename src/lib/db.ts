import { openDB, type IDBPDatabase } from 'idb';
import { STORE_NAMES, type AppData, type StoreName } from './types';

/**
 * IndexedDB schema version. Bump and add a branch to `upgrade` whenever a
 * store or index changes; existing user data is preserved by each step.
 */
export const DB_VERSION = 1;

export const REAL_DB = 'habit-tracker-pro';
export const DEMO_DB = 'habit-tracker-pro-demo';

const KEY_PATHS: Record<StoreName, string> = {
  habits: 'id',
  completions: 'id',
  categories: 'id',
  reflections: 'date',
  moods: 'date',
  sleep: 'date',
  water: 'date',
  goals: 'id',
};

const connections = new Map<string, Promise<IDBPDatabase>>();

export function getDB(name: string) {
  let p = connections.get(name);
  if (!p) {
    p = openDB(name, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          for (const store of STORE_NAMES) {
            const os = db.createObjectStore(store, { keyPath: KEY_PATHS[store] });
            if (store === 'completions') {
              os.createIndex('date', 'date');
              os.createIndex('habitId', 'habitId');
            }
          }
          db.createObjectStore('meta');
        }
        // Future migrations: if (oldVersion < 2) { … }
      },
      blocking() {
        // Another tab wants a newer schema: close so it can upgrade.
        void p?.then((d) => d.close());
        connections.delete(name);
      },
    });
    connections.set(name, p);
  }
  return p;
}

export async function loadAll(name: string): Promise<AppData> {
  const db = await getDB(name);
  const entries = await Promise.all(STORE_NAMES.map((s) => db.getAll(s)));
  return Object.fromEntries(STORE_NAMES.map((s, i) => [s, entries[i]])) as unknown as AppData;
}

export async function put<T>(name: string, store: StoreName, value: T) {
  const db = await getDB(name);
  await db.put(store, value);
}

export async function putMany<T>(name: string, store: StoreName, values: T[]) {
  const db = await getDB(name);
  const tx = db.transaction(store, 'readwrite');
  await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
}

export async function remove(name: string, store: StoreName, key: string) {
  const db = await getDB(name);
  await db.delete(store, key);
}

export async function removeMany(name: string, store: StoreName, keys: string[]) {
  const db = await getDB(name);
  const tx = db.transaction(store, 'readwrite');
  await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done]);
}

/** Replace every store atomically (used by import, reset and demo seeding). */
export async function replaceAll(name: string, data: AppData) {
  const db = await getDB(name);
  const tx = db.transaction([...STORE_NAMES, 'meta'], 'readwrite');
  const ops: Promise<unknown>[] = [];
  for (const s of STORE_NAMES) {
    const os = tx.objectStore(s);
    ops.push(os.clear());
    for (const v of data[s] as unknown[]) ops.push(os.put(v));
  }
  ops.push(tx.objectStore('meta').put({ schema: DB_VERSION, writtenAt: Date.now() }, 'info'));
  await Promise.all([...ops, tx.done]);
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      return await navigator.storage.persist();
    }
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
