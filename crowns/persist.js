// crowns/persist.js
/* Crowns persistence on top of a namespaced store. Pure day-math
 * (computeStreak) is separated so it tests without storage. */

export const DEFAULT_SETTINGS = {
  autoX: false,
  conflictHighlight: false,
  showTimer: true,
  skin: 'crown',
};

export function loadSettings(store) {
  const saved = store.get('settings', {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(store, settings) {
  store.set('settings', settings);
}

// key examples: 'daily:2026-06-04', 'endless'
export function saveGame(store, key, game) {
  store.set(`game:${key}`, game);
}

export function loadGame(store, key) {
  return store.get(`game:${key}`, null);
}

// --- streak (pure day-math) ---

function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function computeStreak(prev, dateStr) {
  if (!prev || !prev.lastSolvedDate) {
    return { count: 1, lastSolvedDate: dateStr };
  }
  const today = dayNumber(dateStr);
  const last = dayNumber(prev.lastSolvedDate);
  if (today === last) return prev; // already counted today
  if (today === last + 1) return { count: prev.count + 1, lastSolvedDate: dateStr };
  return { count: 1, lastSolvedDate: dateStr }; // gap -> reset
}

export function loadStreak(store) {
  return store.get('streak', { count: 0, lastSolvedDate: null });
}

export function recordDailySolve(store, dateStr) {
  const next = computeStreak(loadStreak(store), dateStr);
  store.set('streak', next);
  return next;
}

// --- stats: best time per difficulty ---

export function loadStats(store) {
  return store.get('stats', {});
}

export function recordBestTime(store, difficulty, ms) {
  const stats = loadStats(store);
  if (stats[difficulty] === undefined || ms < stats[difficulty]) {
    stats[difficulty] = ms;
    store.set('stats', stats);
  }
  return stats[difficulty];
}
