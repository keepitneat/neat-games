// crowns/generate.js
/* Approach A: place a valid crown layout, grow color regions around each crown,
 * then verify the puzzle has exactly one solution. All randomness comes from the
 * injected rng, so generate(makeRng(seed), n) is fully reproducible. */

import { shuffle } from '../shared/rng.js';
import { countSolutions } from './solver.js';

// Backtracking: one crown per row, distinct columns, no diagonal touch between
// consecutive rows. Column order is shuffled by rng for variety. Returns an
// array sol[row] = col, or null if no layout exists (won't happen for n >= 4).
export function placeLayout(rng, n) {
  const sol = Array(n).fill(-1);
  const usedCols = new Set();

  function recurse(row) {
    if (row === n) return true;
    for (const c of shuffle(rng, [...Array(n).keys()])) {
      if (usedCols.has(c)) continue;
      if (row > 0 && Math.abs(c - sol[row - 1]) < 2) continue;
      sol[row] = c;
      usedCols.add(c);
      if (recurse(row + 1)) return true;
      usedCols.delete(c);
      sol[row] = -1;
    }
    return false;
  }

  return recurse(0) ? sol : null;
}

// Multi-source randomized flood fill. Each seed owns a region id; we repeatedly
// take a random un-owned cell adjacent to an owned cell and assign it that
// neighbor's region. Guarantees contiguity and covers the whole grid.
export function growRegions(rng, n, seeds) {
  const regions = Array(n * n).fill(-1);
  seeds.forEach((cell, id) => {
    regions[cell] = id;
  });
  // Frontier: list of [cell, regionId] edges into unassigned cells.
  let frontier = [];
  const pushNeighbors = (cell, id) => {
    const r = Math.floor(cell / n);
    const c = cell % n;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
      const j = rr * n + cc;
      if (regions[j] === -1) frontier.push([j, id]);
    }
  };
  seeds.forEach((cell, id) => pushNeighbors(cell, id));

  while (frontier.length) {
    const k = Math.floor(rng() * frontier.length);
    const [cell, id] = frontier[k];
    frontier.splice(k, 1);
    if (regions[cell] !== -1) continue; // already taken by another region
    regions[cell] = id;
    pushNeighbors(cell, id);
  }
  return regions;
}

const MAX_ATTEMPTS = 2000;

// Generate a uniquely-solvable puzzle. Re-grows regions (and re-lays out as
// needed) until countSolutions === 1, within an attempt budget.
export function generate(rng, n) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = placeLayout(rng, n);
    if (!solution) continue;
    const seeds = solution.map((c, r) => r * n + c);
    // A few region re-grows per layout before abandoning it.
    for (let grow = 0; grow < 10; grow++) {
      const regions = growRegions(rng, n, seeds);
      if (countSolutions(regions, n, null, 2) === 1) {
        return { n, regions, solution };
      }
    }
  }
  throw new Error(`generate: no unique puzzle within ${MAX_ATTEMPTS} attempts (n=${n})`);
}
