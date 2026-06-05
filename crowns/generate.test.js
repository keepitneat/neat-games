import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../shared/rng.js';
import { placeLayout, growRegions, generate } from './generate.js';
import { countSolutions } from './solver.js';

test('placeLayout: returns a valid no-touch, distinct-column layout', () => {
  const n = 8;
  const sol = placeLayout(makeRng(1), n);
  assert.equal(sol.length, n);
  const cols = new Set(sol);
  assert.equal(cols.size, n); // distinct columns
  for (let r = 1; r < n; r++) {
    assert.ok(Math.abs(sol[r] - sol[r - 1]) >= 2, `rows ${r - 1},${r} touch`);
  }
});

test('growRegions: partitions the grid into n contiguous regions', () => {
  const n = 6;
  const sol = placeLayout(makeRng(5), n);
  const seeds = sol.map((c, r) => r * n + c);
  const regions = growRegions(makeRng(5), n, seeds);
  assert.equal(regions.length, n * n);
  // n regions, each non-empty
  const counts = Array(n).fill(0);
  for (const id of regions) counts[id]++;
  assert.ok(counts.every((c) => c > 0));
  // each seed sits in its own region id
  seeds.forEach((s, id) => assert.equal(regions[s], id));
  // contiguity: flood each region id from its seed, must reach every member
  for (let id = 0; id < n; id++) {
    const members = new Set();
    for (let i = 0; i < regions.length; i++) if (regions[i] === id) members.add(i);
    const seen = new Set([seeds[id]]);
    const stack = [seeds[id]];
    while (stack.length) {
      const i = stack.pop();
      const r = Math.floor(i / n);
      const c = i % n;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        const j = rr * n + cc;
        if (regions[j] === id && !seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
    assert.equal(seen.size, members.size, `region ${id} not contiguous`);
  }
});

test('generate: produces a uniquely-solvable puzzle for several seeds and sizes', () => {
  for (const n of [6, 8]) {
    for (let seed = 1; seed <= 15; seed++) {
      const puzzle = generate(makeRng(seed), n);
      assert.equal(puzzle.n, n);
      assert.equal(puzzle.regions.length, n * n);
      assert.equal(puzzle.solution.length, n);
      assert.equal(countSolutions(puzzle.regions, n, null, 2), 1,
        `seed ${seed} n ${n} not unique`);
    }
  }
});

test('generate: is deterministic — same seed yields byte-identical regions', () => {
  const a = generate(makeRng(42), 8);
  const b = generate(makeRng(42), 8);
  assert.deepEqual(a.regions, b.regions);
  assert.deepEqual(a.solution, b.solution);
});
