import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from '../shared/store.js';
import { loadBest, recordBest, saveGame, loadGame } from './persist.js';

function freshStore() {
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  return makeStore(storage, '2048');
}

test('loadBest: 0 when nothing saved', () => {
  assert.equal(loadBest(freshStore()), 0);
});

test('recordBest: only increases', () => {
  const s = freshStore();
  assert.equal(recordBest(s, 100), 100);
  assert.equal(recordBest(s, 50), 100);
  assert.equal(recordBest(s, 250), 250);
  assert.equal(loadBest(s), 250);
});

test('saveGame/loadGame: round-trips the resume state', () => {
  const s = freshStore();
  const state = { tiles: [{ id: 1, r: 0, c: 0, value: 2 }], score: 8, won: false, keepGoing: false, nextId: 2 };
  saveGame(s, state);
  assert.deepEqual(loadGame(s), state);
});

test('loadGame: null when nothing saved', () => {
  assert.equal(loadGame(freshStore()), null);
});

test('loadGame: corrupt data falls back to null', () => {
  const map = new Map([['neatgames:2048:game', '{not json']]);
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  assert.equal(loadGame(makeStore(storage, '2048')), null);
});
