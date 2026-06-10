import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from '../shared/store.js';
import { loadStats, recordResult, saveGame, loadGame, clearGame } from './persist.js';

function freshStore() {
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  return makeStore(storage, 'minesweeper');
}

test('loadStats: defaults when nothing saved', () => {
  assert.deepEqual(loadStats(freshStore(), 'easy'), { bestMs: null, wins: 0 });
});

test('recordResult: a win sets best time and increments wins', () => {
  const s = freshStore();
  assert.deepEqual(recordResult(s, 'easy', { won: true, timeMs: 5000 }), { bestMs: 5000, wins: 1 });
  assert.deepEqual(recordResult(s, 'easy', { won: true, timeMs: 8000 }), { bestMs: 5000, wins: 2 });
  assert.deepEqual(recordResult(s, 'easy', { won: true, timeMs: 3000 }), { bestMs: 3000, wins: 3 });
});

test('recordResult: a loss does not change stats', () => {
  const s = freshStore();
  recordResult(s, 'easy', { won: true, timeMs: 5000 });
  assert.deepEqual(recordResult(s, 'easy', { won: false, timeMs: 1 }), { bestMs: 5000, wins: 1 });
});

test('recordResult: difficulties are tracked separately', () => {
  const s = freshStore();
  recordResult(s, 'easy', { won: true, timeMs: 5000 });
  assert.deepEqual(loadStats(s, 'hard'), { bestMs: null, wins: 0 });
});

test('saveGame/loadGame: round-trips the in-progress board', () => {
  const s = freshStore();
  const state = {
    rows: 2, cols: 2, mineCount: 1, status: 'playing', minesPlaced: true, flagsUsed: 1,
    difficultyKey: 'easy', elapsedMs: 4200,
    cells: [
      { id: 0, r: 0, c: 0, mine: false, adj: 1, state: 'revealed' },
      { id: 1, r: 0, c: 1, mine: true, adj: 0, state: 'flagged' },
      { id: 2, r: 1, c: 0, mine: false, adj: 1, state: 'hidden' },
      { id: 3, r: 1, c: 1, mine: false, adj: 1, state: 'hidden' },
    ],
  };
  saveGame(s, state);
  assert.deepEqual(loadGame(s), state);
});

test('loadGame: null when nothing saved', () => {
  assert.equal(loadGame(freshStore()), null);
});

test('clearGame: removes the saved board', () => {
  const s = freshStore();
  saveGame(s, { a: 1 });
  clearGame(s);
  assert.equal(loadGame(s), null);
});
