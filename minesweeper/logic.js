// minesweeper/logic.js
/* Pure Minesweeper engine — no DOM. Every mutating function returns
 * { state, changed }, where `changed` is the cell ids whose appearance changed
 * (Approach B), so the UI repaints only those cells. The only rng consumer is
 * mine placement on the first reveal (first-click-safe); rng is injected so the
 * engine is fully deterministic and testable. A cell is
 * { id, r, c, mine, adj, state: 'hidden'|'revealed'|'flagged' }. id = r*cols+c. */

import { shuffle } from '../shared/rng.js';

export const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mineCount: 10 },
  medium: { rows: 12, cols: 12, mineCount: 25 },
  hard: { rows: 16, cols: 16, mineCount: 40 },
};

function neighborIds(rows, cols, id) {
  const r = Math.floor(id / cols);
  const c = id % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  return out;
}

export function newGame(difficulty) {
  const { rows, cols, mineCount } = DIFFICULTIES[difficulty];
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ id: r * cols + c, r, c, mine: false, adj: 0, state: 'hidden' });
  return { rows, cols, mineCount, status: 'new', cells, minesPlaced: false, flagsUsed: 0 };
}

// Stubs — implemented in later tasks.
export function reveal() { throw new Error('not yet implemented'); }
export function toggleFlag() { throw new Error('not yet implemented'); }
export function chord() { throw new Error('not yet implemented'); }
export function checkWin() { throw new Error('not yet implemented'); }
