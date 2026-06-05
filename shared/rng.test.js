import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, seedFromDate, pick, shuffle } from './rng.js';

test('makeRng: same seed produces an identical sequence', () => {
  const a = makeRng(12345);
  const b = makeRng(12345);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('makeRng: different seeds diverge', () => {
  const a = makeRng(1)();
  const b = makeRng(2)();
  assert.notEqual(a, b);
});

test('makeRng: values are in [0, 1)', () => {
  const r = makeRng(7);
  for (let i = 0; i < 100; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `value out of range: ${v}`);
  }
});

test('seedFromDate: deterministic and stable for a known string', () => {
  assert.equal(seedFromDate('2026-06-04'), seedFromDate('2026-06-04'));
  assert.notEqual(seedFromDate('2026-06-04'), seedFromDate('2026-06-05'));
});

test('shuffle: deterministic given a seeded rng, and a permutation', () => {
  const input = [1, 2, 3, 4, 5];
  const out1 = shuffle(makeRng(99), input);
  const out2 = shuffle(makeRng(99), input);
  assert.deepEqual(out1, out2);
  assert.deepEqual([...out1].sort((a, b) => a - b), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]); // input not mutated
});

test('pick: returns an element of the array', () => {
  const arr = ['a', 'b', 'c'];
  assert.ok(arr.includes(pick(makeRng(3), arr)));
});
