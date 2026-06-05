import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from '../shared/store.js';
import {
  DEFAULT_SETTINGS,
  loadSettings, saveSettings,
  saveGame, loadGame,
  computeStreak, loadStreak, recordDailySolve,
  recordBestTime, loadStats,
} from './persist.js';

function freshStore() {
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  return makeStore(storage, 'crowns');
}

test('loadSettings: returns defaults when nothing saved', () => {
  assert.deepEqual(loadSettings(freshStore()), DEFAULT_SETTINGS);
});

test('saveSettings then loadSettings round-trips and fills gaps', () => {
  const store = freshStore();
  saveSettings(store, { ...DEFAULT_SETTINGS, autoX: true, skin: 'cat' });
  const s = loadSettings(store);
  assert.equal(s.autoX, true);
  assert.equal(s.skin, 'cat');
  assert.equal(s.showTimer, true); // default preserved
});

test('saveGame then loadGame round-trips by key', () => {
  const store = freshStore();
  const game = { cells: ['crown', 'empty'], elapsedMs: 1200, solved: false };
  saveGame(store, 'daily:2026-06-04', game);
  assert.deepEqual(loadGame(store, 'daily:2026-06-04'), game);
  assert.equal(loadGame(store, 'daily:2026-06-05'), null);
});

test('computeStreak: first solve starts at 1', () => {
  assert.deepEqual(computeStreak(null, '2026-06-04'), { count: 1, lastSolvedDate: '2026-06-04' });
});

test('computeStreak: consecutive day increments', () => {
  const prev = { count: 3, lastSolvedDate: '2026-06-04' };
  assert.deepEqual(computeStreak(prev, '2026-06-05'), { count: 4, lastSolvedDate: '2026-06-05' });
});

test('computeStreak: same day is a no-op', () => {
  const prev = { count: 3, lastSolvedDate: '2026-06-04' };
  assert.deepEqual(computeStreak(prev, '2026-06-04'), prev);
});

test('computeStreak: a gap resets to 1', () => {
  const prev = { count: 9, lastSolvedDate: '2026-06-04' };
  assert.deepEqual(computeStreak(prev, '2026-06-07'), { count: 1, lastSolvedDate: '2026-06-07' });
});

test('recordDailySolve persists the updated streak', () => {
  const store = freshStore();
  recordDailySolve(store, '2026-06-04');
  recordDailySolve(store, '2026-06-05');
  assert.deepEqual(loadStreak(store), { count: 2, lastSolvedDate: '2026-06-05' });
});

test('recordBestTime keeps only the fastest per difficulty', () => {
  const store = freshStore();
  recordBestTime(store, 'medium', 5000);
  recordBestTime(store, 'medium', 8000); // slower, ignored
  recordBestTime(store, 'medium', 4000); // faster, kept
  assert.equal(loadStats(store).medium, 4000);
});
