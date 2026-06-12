// minesweeper/persist.js
/* Minesweeper persistence on a namespaced store (shared/store). Stats are per
 * difficulty: best time is monotonic (lower is better), win count increments on
 * wins only. The in-progress board is a single slot, saved after each action. */

export function loadStats(store, difficulty) {
  return store.get(`stats:${difficulty}`, { bestMs: null, wins: 0 });
}

export function recordResult(store, difficulty, { won, timeMs }) {
  const stats = loadStats(store, difficulty);
  if (!won) return stats;
  const bestMs = stats.bestMs === null ? timeMs : Math.min(stats.bestMs, timeMs);
  const next = { bestMs, wins: stats.wins + 1 };
  store.set(`stats:${difficulty}`, next);
  return next;
}

export function saveGame(store, state) {
  store.set('game', state);
}

export function loadGame(store) {
  return store.get('game', null);
}

export function clearGame(store) {
  store.remove('game');
}
