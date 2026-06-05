import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../shared/rng.js';
import { slideLine, move, spawnTile, newGame, canMove, hasReached } from './logic.js';

const T = (id, r, c, value) => ({ id, r, c, value });

// ---- slideLine (travel-ordered tile sequence, nearest-wall first) ----
test('slideLine: two equal tiles merge once', () => {
  const { entries, gained } = slideLine([{ id: 1, value: 2 }, { id: 2, value: 2 }]);
  assert.deepEqual(entries, [{ id: 1, value: 4, consumedId: 2 }]);
  assert.equal(gained, 4);
});

test('slideLine: four equal tiles make two merges, not one', () => {
  const seq = [{ id: 1, value: 2 }, { id: 2, value: 2 }, { id: 3, value: 2 }, { id: 4, value: 2 }];
  const { entries, gained } = slideLine(seq);
  assert.deepEqual(entries, [
    { id: 1, value: 4, consumedId: 2 },
    { id: 3, value: 4, consumedId: 4 },
  ]);
  assert.equal(gained, 8);
});

test('slideLine: [4,2,2] -> 4 then merged 4', () => {
  const seq = [{ id: 1, value: 4 }, { id: 2, value: 2 }, { id: 3, value: 2 }];
  const { entries, gained } = slideLine(seq);
  assert.deepEqual(entries, [{ id: 1, value: 4 }, { id: 2, value: 4, consumedId: 3 }]);
  assert.equal(gained, 4);
});

test('slideLine: [2,2,4] -> merged 4 then 4', () => {
  const seq = [{ id: 1, value: 2 }, { id: 2, value: 2 }, { id: 3, value: 4 }];
  const { entries, gained } = slideLine(seq);
  assert.deepEqual(entries, [{ id: 1, value: 4, consumedId: 2 }, { id: 3, value: 4 }]);
  assert.equal(gained, 4);
});

test('slideLine: empty and single', () => {
  assert.deepEqual(slideLine([]), { entries: [], gained: 0 });
  assert.deepEqual(slideLine([{ id: 9, value: 8 }]), { entries: [{ id: 9, value: 8 }], gained: 0 });
});

// ---- move (pure; produces the move-plan) ----
test('move left: a row of two 2s merges to one 4 at the wall', () => {
  const tiles = [T(1, 0, 0, 2), T(2, 0, 1, 2)];
  const r = move(tiles, 4, 'left');
  assert.equal(r.moved, true);
  assert.equal(r.gained, 4);
  assert.deepEqual(r.tiles, [{ id: 1, r: 0, c: 0, value: 4 }]);
  assert.equal(r.moves.length, 2);
  assert.deepEqual(r.merges, [{ id: 1, consumedId: 2, to: { r: 0, c: 0 }, value: 4 }]);
});

test('move right: tiles pack to the right wall', () => {
  const tiles = [T(1, 0, 0, 2), T(2, 0, 1, 4)];
  const r = move(tiles, 4, 'right');
  assert.equal(r.moved, true);
  const byId = Object.fromEntries(r.tiles.map((t) => [t.id, t]));
  assert.deepEqual({ r: byId[2].r, c: byId[2].c }, { r: 0, c: 3 });
  assert.deepEqual({ r: byId[1].r, c: byId[1].c }, { r: 0, c: 2 });
  assert.deepEqual(r.merges, []);
});

test('move up: a column of two 2s merges at the top', () => {
  const tiles = [T(1, 1, 2, 2), T(2, 2, 2, 2)];
  const r = move(tiles, 4, 'up');
  assert.deepEqual(r.tiles, [{ id: 1, r: 0, c: 2, value: 4 }]);
});

test('move: a no-op move reports moved:false (and no merges)', () => {
  const tiles = [T(1, 0, 0, 2), T(2, 0, 1, 4)];
  const r = move(tiles, 4, 'left');
  assert.equal(r.moved, false);
  assert.equal(r.merges.length, 0);
});

// ---- spawnTile / newGame (seeded rng) ----
test('spawnTile: places one tile in an empty cell with a fresh id', () => {
  const r = spawnTile(makeRng(1), [T(1, 0, 0, 2)], 4, 2);
  assert.equal(r.spawned.id, 2);
  assert.equal(r.nextId, 3);
  assert.equal(r.tiles.length, 2);
  assert.ok([2, 4].includes(r.spawned.value));
  assert.ok(!(r.spawned.r === 0 && r.spawned.c === 0));
});

test('spawnTile: full board yields spawned=null', () => {
  const full = [];
  let id = 1;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) full.push(T(id++, r, c, 2));
  const res = spawnTile(makeRng(1), full, 4, 99);
  assert.equal(res.spawned, null);
  assert.equal(res.nextId, 99);
});

test('spawnTile: deterministic for a given seed', () => {
  const a = spawnTile(makeRng(42), [], 4, 1);
  const b = spawnTile(makeRng(42), [], 4, 1);
  assert.deepEqual(a.spawned, b.spawned);
});

test('newGame: two tiles and nextId past them', () => {
  const g = newGame(makeRng(7), 4);
  assert.equal(g.tiles.length, 2);
  assert.equal(g.nextId, 3);
});

// ---- canMove / hasReached ----
test('canMove: true when an empty cell exists', () => {
  assert.equal(canMove([T(1, 0, 0, 2)], 4), true);
});

test('canMove: full but with an adjacent equal pair is still movable', () => {
  const tiles = [];
  let id = 1;
  const vals = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 4,
  ];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) tiles.push(T(id, r, c, vals[id - 1])), id++;
  assert.equal(canMove(tiles, 4), true);
});

test('canMove: full checkerboard with no equal neighbours is game over', () => {
  const tiles = [];
  let id = 1;
  const vals = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2,
  ];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) tiles.push(T(id, r, c, vals[id - 1])), id++;
  assert.equal(canMove(tiles, 4), false);
});

test('hasReached: true once a tile hits the target', () => {
  assert.equal(hasReached([T(1, 0, 0, 1024)], 2048), false);
  assert.equal(hasReached([T(1, 0, 0, 2048)], 2048), true);
});
