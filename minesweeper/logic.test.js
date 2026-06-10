import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../shared/rng.js';
import { DIFFICULTIES, newGame, reveal, toggleFlag, chord, checkWin } from './logic.js';

// Independent neighbor oracle (do NOT import the engine's internal — verify against our own).
function neighborsOf(state, id) {
  const r = Math.floor(id / state.cols);
  const c = id % state.cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) out.push(nr * state.cols + nc);
    }
  return out;
}

test('newGame: easy board is 9x9 with 10 mines, all hidden, no mines placed yet', () => {
  const s = newGame('easy');
  assert.equal(s.rows, 9);
  assert.equal(s.cols, 9);
  assert.equal(s.mineCount, 10);
  assert.equal(s.cells.length, 81);
  assert.equal(s.status, 'new');
  assert.equal(s.minesPlaced, false);
  assert.equal(s.flagsUsed, 0);
  assert.ok(s.cells.every((c) => c.state === 'hidden' && c.mine === false && c.adj === 0));
  assert.deepEqual(s.cells[0], { id: 0, r: 0, c: 0, mine: false, adj: 0, state: 'hidden' });
});

test('DIFFICULTIES: three presets with the agreed sizes', () => {
  assert.deepEqual(DIFFICULTIES.easy, { rows: 9, cols: 9, mineCount: 10 });
  assert.deepEqual(DIFFICULTIES.medium, { rows: 12, cols: 12, mineCount: 25 });
  assert.deepEqual(DIFFICULTIES.hard, { rows: 16, cols: 16, mineCount: 40 });
});
