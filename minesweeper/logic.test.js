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

// Hand-built 3x3 with a single mine at corner 8, adjacencies precomputed,
// minesPlaced already true — lets us test flood/win/chord without rng.
function board3x3() {
  const mine = new Set([8]);
  const cells = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const id = r * 3 + c;
      cells.push({ id, r, c, mine: mine.has(id), adj: 0, state: 'hidden' });
    }
  for (const cell of cells) {
    if (cell.mine) continue;
    cell.adj = neighborsOf({ rows: 3, cols: 3 }, cell.id).filter((n) => mine.has(n)).length;
  }
  return { rows: 3, cols: 3, mineCount: 1, status: 'playing', cells, minesPlaced: true, flagsUsed: 0 };
}

test('reveal: first tap is safe AND opens an area; mines appear after', () => {
  const rng = makeRng(7);
  const safe = 40; // center of 9x9
  const { state, changed } = reveal(newGame('easy'), safe, rng);
  assert.equal(state.minesPlaced, true);
  assert.equal(state.status, 'playing');
  assert.equal(state.cells[safe].mine, false);
  for (const nid of neighborsOf(state, safe)) assert.equal(state.cells[nid].mine, false);
  assert.equal(state.cells[safe].adj, 0); // opening guaranteed
  assert.ok(changed.length > 1); // a cascade, not a single cell
  assert.ok(changed.includes(safe));
});

test('reveal: places exactly mineCount mines', () => {
  const rng = makeRng(123);
  const { state } = reveal(newGame('hard'), 0, rng);
  assert.equal(state.cells.filter((c) => c.mine).length, 40);
});

test('reveal: every non-mine adj equals its real mine-neighbor count', () => {
  const rng = makeRng(42);
  const { state } = reveal(newGame('easy'), 40, rng);
  for (const cell of state.cells) {
    if (cell.mine) continue;
    const expected = neighborsOf(state, cell.id).filter((n) => state.cells[n].mine).length;
    assert.equal(cell.adj, expected);
  }
});

test('reveal: hitting a mine loses and reveals all mines', () => {
  const rng = makeRng(99);
  const { state } = reveal(newGame('easy'), 40, rng);
  const mineId = state.cells.find((c) => c.mine).id;
  const res = reveal(state, mineId, rng);
  assert.equal(res.state.status, 'lost');
  for (const c of res.state.cells) if (c.mine) assert.equal(c.state, 'revealed');
});

test('reveal: hitting a mine tags hitId with the struck cell', () => {
  const rng = makeRng(99);
  const { state } = reveal(newGame('easy'), 40, rng);
  const mineId = state.cells.find((c) => c.mine).id;
  const res = reveal(state, mineId, rng);
  assert.equal(res.state.status, 'lost');
  assert.equal(res.state.hitId, mineId);
});

test('reveal: flood fill clears the zero region and wins when only mines remain', () => {
  const res = reveal(board3x3(), 0, makeRng(1));
  for (const c of res.state.cells) {
    if (c.mine) assert.equal(c.state, 'hidden');
    else assert.equal(c.state, 'revealed');
  }
  assert.equal(res.state.status, 'won');
});

test('reveal: does not cross or reveal flagged cells', () => {
  let s = board3x3();
  s = toggleFlag(s, 1).state; // flag a cell next to the cascade
  const res = reveal(s, 0, makeRng(1));
  assert.equal(res.state.cells[1].state, 'flagged');
  assert.ok(!res.changed.includes(1));
});

test('reveal: no-op after game over', () => {
  const lost = { ...board3x3(), status: 'lost' };
  const res = reveal(lost, 0, makeRng(1));
  assert.deepEqual(res.changed, []);
  assert.equal(res.state, lost);
});

test('checkWin: true only when every non-mine cell is revealed', () => {
  const s = board3x3();
  assert.equal(checkWin(s), false);
  const all = { ...s, cells: s.cells.map((c) => (c.mine ? c : { ...c, state: 'revealed' })) };
  assert.equal(checkWin(all), true);
});

test('toggleFlag: flags a hidden cell and counts it', () => {
  const s = board3x3();
  const r = toggleFlag(s, 0);
  assert.equal(r.state.cells[0].state, 'flagged');
  assert.equal(r.state.flagsUsed, 1);
  assert.deepEqual(r.changed, [0]);
});

test('toggleFlag: unflags a flagged cell', () => {
  let s = board3x3();
  s = toggleFlag(s, 0).state;
  const r = toggleFlag(s, 0);
  assert.equal(r.state.cells[0].state, 'hidden');
  assert.equal(r.state.flagsUsed, 0);
});

test('toggleFlag: no-op on a revealed cell', () => {
  const s = reveal(board3x3(), 0, makeRng(1)).state; // most cells now revealed
  const revealedId = s.cells.find((c) => c.state === 'revealed').id;
  const r = toggleFlag(s, revealedId);
  assert.deepEqual(r.changed, []);
  assert.equal(r.state, s);
});

test('toggleFlag: no-op after game over', () => {
  const won = { ...board3x3(), status: 'won' };
  const r = toggleFlag(won, 0);
  assert.deepEqual(r.changed, []);
});

test('chord: reveals non-flagged neighbors when flag count matches the number', () => {
  // 3x3, mine at 8. Reveal cell 4 only (adj=1). Flag the mine (8). Chord 4.
  let s = board3x3();
  s = { ...s, cells: s.cells.map((c) => (c.id === 4 ? { ...c, state: 'revealed' } : c)) };
  s = toggleFlag(s, 8).state; // correct flag on the mine
  const res = chord(s, 4, makeRng(1));
  for (const nid of neighborsOf(res.state, 4))
    if (!res.state.cells[nid].mine) assert.equal(res.state.cells[nid].state, 'revealed');
  assert.notEqual(res.state.status, 'lost');
});

test('chord: a wrong flag makes chording reveal a mine and lose', () => {
  // 3x3, mine at 8. Reveal 4 (adj=1). Wrongly flag 0 (no mine) so count matches adj=1.
  let s = board3x3();
  s = { ...s, cells: s.cells.map((c) => (c.id === 4 ? { ...c, state: 'revealed' } : c)) };
  s = toggleFlag(s, 0).state; // wrong flag
  const res = chord(s, 4, makeRng(1));
  assert.equal(res.state.status, 'lost');
});

test('chord: no-op when flag count does not match', () => {
  let s = board3x3();
  s = { ...s, cells: s.cells.map((c) => (c.id === 4 ? { ...c, state: 'revealed' } : c)) };
  const res = chord(s, 4, makeRng(1)); // no flags placed, adj=1
  assert.deepEqual(res.changed, []);
  assert.equal(res.state, s);
});

test('chord: no-op on a hidden or zero cell', () => {
  const s = board3x3();
  assert.deepEqual(chord(s, 0, makeRng(1)).changed, []); // 0 is hidden
});

test('chord: can win by clearing the last safe cells', () => {
  // 3x3, mine at 8. Pre-reveal all safe cells except 7 (r2c1, adj=1).
  // Flag the mine (8). Chord cell 5 (r1c2, adj=1) — its only hidden neighbor is 7.
  // Revealing 7 exhausts all safe cells → status should become 'won'.
  const revealed = new Set([0, 1, 2, 3, 4, 5, 6]);
  let s = board3x3();
  s = { ...s, cells: s.cells.map((c) => (revealed.has(c.id) ? { ...c, state: 'revealed' } : c)) };
  s = toggleFlag(s, 8).state; // correct flag on the mine
  const res = chord(s, 5, makeRng(1));
  assert.equal(res.state.cells[7].state, 'revealed');
  assert.equal(res.state.status, 'won');
});
