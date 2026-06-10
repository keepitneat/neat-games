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

function placeMines(state, safeId, rng) {
  const { rows, cols, mineCount } = state;
  const exclude = new Set([safeId, ...neighborIds(rows, cols, safeId)]);
  const candidates = [];
  for (let i = 0; i < rows * cols; i++) if (!exclude.has(i)) candidates.push(i);
  const mineSet = new Set(shuffle(rng, candidates).slice(0, mineCount));
  const cells = state.cells.map((cell) => {
    const mine = mineSet.has(cell.id);
    const adj = mine ? 0 : neighborIds(rows, cols, cell.id).filter((n) => mineSet.has(n)).length;
    return { ...cell, mine, adj };
  });
  return { ...state, cells, minesPlaced: true, status: 'playing' };
}

export function checkWin(state) {
  return state.cells.every((c) => c.mine || c.state === 'revealed');
}

export function reveal(state, id, rng) {
  if (state.status === 'won' || state.status === 'lost') return { state, changed: [] };
  let s = state.minesPlaced ? state : placeMines(state, id, rng);
  if (s.cells[id].state !== 'hidden') return { state: s, changed: [] };

  const cells = s.cells.map((c) => ({ ...c }));
  const changed = [];

  if (cells[id].mine) {
    for (const c of cells)
      if (c.mine && c.state !== 'revealed') {
        c.state = 'revealed';
        changed.push(c.id);
      }
    return { state: { ...s, cells, status: 'lost', hitId: id }, changed };
  }

  const stack = [id];
  while (stack.length) {
    const c = cells[stack.pop()];
    if (c.state !== 'hidden') continue;
    c.state = 'revealed';
    changed.push(c.id);
    if (c.adj === 0)
      for (const nid of neighborIds(s.rows, s.cols, c.id))
        if (cells[nid].state === 'hidden') stack.push(nid);
  }

  const next = { ...s, cells };
  return { state: checkWin(next) ? { ...next, status: 'won' } : next, changed };
}

export function toggleFlag(state, id) {
  if (state.status === 'won' || state.status === 'lost') return { state, changed: [] };
  if (state.cells[id].state === 'revealed') return { state, changed: [] };
  const cells = state.cells.map((c) => ({ ...c }));
  const flagging = cells[id].state === 'hidden';
  cells[id].state = flagging ? 'flagged' : 'hidden';
  return {
    state: { ...state, cells, flagsUsed: state.flagsUsed + (flagging ? 1 : -1) },
    changed: [id],
  };
}

export function chord(state, id, rng) {
  if (state.status !== 'playing') return { state, changed: [] };
  const cell = state.cells[id];
  if (cell.state !== 'revealed' || cell.adj === 0) return { state, changed: [] };
  const nids = neighborIds(state.rows, state.cols, id);
  const flagged = nids.filter((n) => state.cells[n].state === 'flagged').length;
  if (flagged !== cell.adj) return { state, changed: [] };

  let s = state;
  const changed = [];
  for (const nid of nids) {
    if (s.cells[nid].state !== 'hidden') continue;
    const res = reveal(s, nid, rng);
    s = res.state;
    changed.push(...res.changed);
    if (s.status === 'lost') break;
  }
  return { state: s, changed };
}
