// 2048/persist.js
/* 2048 persistence on a namespaced store (shared/store). Best is monotonic;
 * the resume state is saved after each move. */

export function loadBest(store) {
  return store.get('best', 0);
}

export function recordBest(store, score) {
  const best = loadBest(store);
  if (score > best) {
    store.set('best', score);
    return score;
  }
  return best;
}

export function saveGame(store, state) {
  store.set('game', state);
}

export function loadGame(store) {
  return store.get('game', null);
}
