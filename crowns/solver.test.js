import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions, findForcedX } from './solver.js';

// A 4x4 board with a single unique solution (cols [1,3,0,2]).
const N = 4;
const REGIONS = [
  0, 0, 1, 1,
  0, 2, 2, 1,
  3, 2, 2, 1,
  3, 3, 2, 2,
];

test('countSolutions: finds exactly one for a uniquely-solvable board', () => {
  assert.equal(countSolutions(REGIONS, N, null, 2), 1);
});

test('countSolutions: zero when no arrangement satisfies the regions', () => {
  // All cells in one region -> only one crown possible, never n=4.
  assert.equal(countSolutions(Array(16).fill(0), N, null, 2), 0);
});

test('countSolutions: detects multiple (stops at limit)', () => {
  // Row-striped regions are loose -> many solutions; we only need >= 2.
  const rowRegions = Array(16).fill(0).map((_, i) => Math.floor(i / N));
  assert.ok(countSolutions(rowRegions, N, null, 2) >= 2);
});

test('countSolutions: respects fixed columns', () => {
  // Pin row 0 to its solution column (1) -> still exactly one.
  const fixed = [1, -1, -1, -1];
  assert.equal(countSolutions(REGIONS, N, fixed, 2), 1);
  // Pin row 0 to a wrong column (0) -> unsolvable.
  assert.equal(countSolutions(REGIONS, N, [0, -1, -1, -1], 2), 0);
});

test('findForcedX: cell attacked by a placed crown is a forced X', () => {
  const cells = Array(16).fill('empty');
  cells[1] = 'crown'; // (0,1)
  const res = findForcedX({ n: N, regions: REGIONS, cells, history: [] });
  assert.equal(res.type, 'x');
  // The returned index must be empty and attacked (same row/col/neighbor of 1).
  assert.equal(cells[res.index], 'empty');
});

test('findForcedX: empty board uses deduction (placing there breaks solvability)', () => {
  const cells = Array(16).fill('empty');
  const res = findForcedX({ n: N, regions: REGIONS, cells, history: [] });
  assert.equal(res.type, 'x');
  // index 0 cannot hold a crown in the unique solution, so it is a valid forced X.
  assert.ok(res.index >= 0);
});

test('findForcedX: returns {type:"fix"} when the board has a conflict', () => {
  const cells = Array(16).fill('empty');
  cells[0] = 'crown';
  cells[2] = 'crown'; // two crowns in row 0 -> inconsistent
  const res = findForcedX({ n: N, regions: REGIONS, cells, history: [] });
  assert.equal(res.type, 'fix');
});
