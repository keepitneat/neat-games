// shared/store.js
/* Namespaced localStorage wrapper. `storage` is any { getItem, setItem,
 * removeItem } so it tests without a browser. Reads never throw: corrupt or
 * missing data returns the caller's fallback. */

export function makeStore(storage, namespace) {
  const prefix = `neatgames:${namespace}:`;
  return {
    get(key, fallback) {
      try {
        const raw = storage.getItem(prefix + key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        storage.setItem(prefix + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        storage.removeItem(prefix + key);
      } catch {
        /* ignore */
      }
    },
  };
}
