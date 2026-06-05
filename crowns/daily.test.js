import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_N, dailyPuzzle } from './daily.js';
import { countSolutions } from './solver.js';

test('DAILY_N is 8', () => {
  assert.equal(DAILY_N, 8);
});

test('dailyPuzzle: a given date always yields the identical board (only one daily game)', () => {
  const a = dailyPuzzle('2026-06-05');
  const b = dailyPuzzle('2026-06-05');
  assert.deepEqual(a.regions, b.regions);
  assert.deepEqual(a.solution, b.solution);
  assert.equal(a.n, DAILY_N);
});

test('dailyPuzzle: the board is uniquely solvable', () => {
  const p = dailyPuzzle('2026-06-05');
  assert.equal(countSolutions(p.regions, p.n, null, 2), 1);
});

test('dailyPuzzle: different dates generally differ', () => {
  const a = dailyPuzzle('2026-06-05');
  const b = dailyPuzzle('2026-07-04');
  assert.notDeepEqual(a.regions, b.regions);
});
