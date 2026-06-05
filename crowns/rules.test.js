import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crownIndices, attackedCells, conflicts, isSolved } from './rules.js';

// Helper: build a cells array of size n*n, all empty, then set crowns at indices.
function cellsWith(n, crownIdx) {
  const cells = Array(n * n).fill('empty');
  for (const i of crownIdx) cells[i] = 'crown';
  return cells;
}

test('crownIndices: returns indices of crowns only', () => {
  const cells = ['empty', 'crown', 'x', 'crown'];
  assert.deepEqual(crownIndices(cells), [1, 3]);
});

test('attackedCells: same row, same column, and the 8 neighbors (no self)', () => {
  // n=3, crown at center index 4 (r1,c1)
  const a = new Set(attackedCells(4, 3));
  // whole row: 3,4,5 ; whole col: 1,4,7 ; neighbors: 0,1,2,3,5,6,7,8
  assert.ok(!a.has(4)); // not itself
  for (const i of [0, 1, 2, 3, 5, 6, 7, 8]) assert.ok(a.has(i), `missing ${i}`);
});

test('conflicts: two crowns in the same row are flagged', () => {
  const n = 4;
  const regions = Array(n * n).fill(0).map((_, i) => Math.floor(i / n)); // row regions
  const cells = cellsWith(n, [0, 2]); // both in row 0
  const c = conflicts(cells, regions, n);
  assert.ok(c.has(0) && c.has(2));
});

test('conflicts: two crowns in the same region are flagged', () => {
  const n = 4;
  const regions = Array(n * n).fill(0); // everything region 0
  const cells = cellsWith(n, [0, 10]); // different row/col, same region
  const c = conflicts(cells, regions, n);
  assert.ok(c.has(0) && c.has(10));
});

test('conflicts: diagonally touching crowns are flagged', () => {
  const n = 4;
  const regions = Array(n * n).fill(0).map((_, i) => i); // all distinct regions
  const cells = cellsWith(n, [0, 5]); // (0,0) and (1,1) touch diagonally
  const c = conflicts(cells, regions, n);
  assert.ok(c.has(0) && c.has(5));
});

test('conflicts: a valid arrangement reports none', () => {
  // n=4 valid solution: cols [1,3,0,2] per row -> indices 1,7,8,14
  const n = 4;
  const regions = [
    0, 0, 1, 1,
    0, 2, 2, 1,
    3, 2, 2, 1,
    3, 3, 2, 2,
  ];
  const cells = cellsWith(n, [1, 7, 8, 14]);
  assert.equal(conflicts(cells, regions, n).size, 0);
});

test('isSolved: n non-conflicting crowns is solved', () => {
  const n = 4;
  const regions = [
    0, 0, 1, 1,
    0, 2, 2, 1,
    3, 2, 2, 1,
    3, 3, 2, 2,
  ];
  assert.equal(isSolved(cellsWith(n, [1, 7, 8, 14]), regions, n), true);
  assert.equal(isSolved(cellsWith(n, [1, 7, 8]), regions, n), false); // too few
});
