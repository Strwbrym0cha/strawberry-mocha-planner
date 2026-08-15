// V17 storage service. Tabs should use this instead of talking to Supabase directly.
import { loadLocalData, saveLocalData } from './data.js';

export function createStore() {
  let data = loadLocalData();
  const listeners = new Set();
  return {
    get() { return data; },
    set(next) { data = next; saveLocalData(data); listeners.forEach(fn => fn(data)); },
    update(fn) { data = fn(data) || data; saveLocalData(data); listeners.forEach(listener => listener(data)); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reload() { data = loadLocalData(); listeners.forEach(fn => fn(data)); }
  };
}

export async function cloudSync(_session, _data) {
  // Supabase remains owned by the existing V16 shell during the migration.
  // This boundary is intentionally empty until the new app shell is tested.
  return { ok: true, migrated: false };
}
