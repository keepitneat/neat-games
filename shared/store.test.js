import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from './store.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

test('set then get round-trips an object', () => {
  const s = makeStore(fakeStorage(), 'crowns');
  s.set('settings', { autoX: true });
  assert.deepEqual(s.get('settings', null), { autoX: true });
});

test('get returns fallback when key is missing', () => {
  const s = makeStore(fakeStorage(), 'crowns');
  assert.equal(s.get('nope', 42), 42);
});

test('get returns fallback on corrupt JSON', () => {
  const storage = fakeStorage({ 'neatgames:crowns:bad': '{not json' });
  const s = makeStore(storage, 'crowns');
  assert.equal(s.get('bad', 'default'), 'default');
});

test('keys are namespaced as neatgames:<ns>:<key>', () => {
  const storage = fakeStorage();
  makeStore(storage, 'crowns').set('x', 1);
  assert.ok(storage._map.has('neatgames:crowns:x'));
});

test('remove deletes a key', () => {
  const s = makeStore(fakeStorage(), 'crowns');
  s.set('x', 1);
  s.remove('x');
  assert.equal(s.get('x', 'gone'), 'gone');
});
