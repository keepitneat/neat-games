import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, cycleValue, commit, undo, reset, boardIsSolved } from './board.js';

test('createBoard: all cells empty, history empty', () => {
  const b = createBoard(4, Array(16).fill(0));
  assert.equal(b.n, 4);
  assert.equal(b.cells.length, 16);
  assert.ok(b.cells.every((c) => c === 'empty'));
  assert.deepEqual(b.history, []);
});

test('cycleValue: empty -> x -> crown -> empty', () => {
  assert.equal(cycleValue('empty'), 'x');
  assert.equal(cycleValue('x'), 'crown');
  assert.equal(cycleValue('crown'), 'empty');
});

test('commit: replaces cells and pushes the previous snapshot to history', () => {
  const b = createBoard(2, Array(4).fill(0));
  const next = ['crown', 'empty', 'empty', 'empty'];
  const b2 = commit(b, next);
  assert.deepEqual(b2.cells, next);
  assert.equal(b2.history.length, 1);
  assert.deepEqual(b2.history[0], b.cells); // original (all empty)
  assert.notEqual(b2, b); // new object, original untouched
  assert.ok(b.cells.every((c) => c === 'empty'));
});

test('undo: restores the previous snapshot; no-op on empty history', () => {
  const b = createBoard(2, Array(4).fill(0));
  const b2 = commit(b, ['crown', 'empty', 'empty', 'empty']);
  const b3 = undo(b2);
  assert.deepEqual(b3.cells, ['empty', 'empty', 'empty', 'empty']);
  assert.equal(b3.history.length, 0);
  assert.deepEqual(undo(b3).cells, b3.cells); // no-op, no throw
});

test('reset: clears cells and records the prior state for undo', () => {
  const b = commit(createBoard(2, Array(4).fill(0)), ['crown', 'x', 'empty', 'empty']);
  const r = reset(b);
  assert.ok(r.cells.every((c) => c === 'empty'));
  assert.deepEqual(undo(r).cells, ['crown', 'x', 'empty', 'empty']); // reset is undoable
});

test('boardIsSolved: delegates to rules', () => {
  const n = 4;
  const regions = [
    0, 0, 1, 1,
    0, 2, 2, 1,
    3, 2, 2, 1,
    3, 3, 2, 2,
  ];
  const cells = Array(16).fill('empty');
  for (const i of [1, 7, 8, 14]) cells[i] = 'crown';
  const b = { n, regions, cells, history: [] };
  assert.equal(boardIsSolved(b), true);
});
