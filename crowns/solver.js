// crowns/solver.js
/* Counts solutions (capped) and finds the next logically-forced X for hints.
 * One crown per row, so we recurse row by row. */

import { attackedCells, conflicts, crownIndices } from './rules.js';

// fixed: array length n of pinned columns (-1 = free), or null for all free.
export function countSolutions(regions, n, fixed = null, limit = 2) {
  const usedCols = new Set();
  const usedRegions = new Set();
  let count = 0;

  function recurse(row, prevCol) {
    if (count >= limit) return;
    if (row === n) {
      count++;
      return;
    }
    const pinned = fixed && fixed[row] >= 0 ? fixed[row] : null;
    for (let c = 0; c < n; c++) {
      if (pinned !== null && c !== pinned) continue;
      if (usedCols.has(c)) continue;
      const region = regions[row * n + c];
      if (usedRegions.has(region)) continue;
      if (row > 0 && Math.abs(c - prevCol) < 2) continue; // no diagonal touch
      usedCols.add(c);
      usedRegions.add(region);
      recurse(row + 1, c);
      usedCols.delete(c);
      usedRegions.delete(region);
      if (count >= limit) return;
    }
  }

  recurse(0, -2);
  return count;
}

// Derive a `fixed` array from the current crowns. Returns null if any row holds
// more than one crown (an inconsistent, user-error state).
function fixedFromCells(cells, n) {
  const fixed = Array(n).fill(-1);
  for (const i of crownIndices(cells)) {
    const r = Math.floor(i / n);
    if (fixed[r] !== -1) return null; // two crowns in one row
    fixed[r] = i % n;
  }
  return fixed;
}

// The next cell that must be empty by current logic.
// Tier 1: an empty cell attacked by a placed crown.
// Tier 2: an empty cell where placing a crown makes the puzzle unsolvable.
export function findForcedX(board) {
  const { cells, regions, n } = board;

  // If the player has already created a conflict, nudge them to fix it instead.
  if (conflicts(cells, regions, n).size > 0) return { type: 'fix' };

  const crowns = crownIndices(cells);

  // Tier 1 — attacked by an existing crown.
  for (const ci of crowns) {
    for (const a of attackedCells(ci, n)) {
      if (cells[a] === 'empty') return { type: 'x', index: a };
    }
  }

  // Tier 2 — deduction. fixed reflects current crowns (consistent here).
  const fixed = fixedFromCells(cells, n);
  if (fixed === null) return { type: 'fix' };
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== 'empty') continue;
    const r = Math.floor(i / n);
    if (fixed[r] >= 0) continue; // row already solved
    const trial = fixed.slice();
    trial[r] = i % n;
    if (countSolutions(regions, n, trial, 1) === 0) return { type: 'x', index: i };
  }

  return null; // nothing forced right now
}
