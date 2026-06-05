// 2048/logic.js
/* Pure 2048 game logic — no DOM. move() is rng-free and deterministic; all
 * randomness lives in spawnTile/newGame (via shared/rng). A tile is
 * { id, r, c, value }; ids are stable across moves so the UI can animate by id. */

const DIRS = {
  left: { rows: true, rev: false },
  right: { rows: true, rev: true },
  up: { rows: false, rev: false },
  down: { rows: false, rev: true },
};

// Ordered grid cells for one line, from the wall the move pushes toward, outward.
function lineCells(n, dir, index) {
  const { rows, rev } = DIRS[dir];
  const cells = [];
  for (let k = 0; k < n; k++) {
    const j = rev ? n - 1 - k : k;
    cells.push(rows ? { r: index, c: j } : { r: j, c: index });
  }
  return cells;
}

// Collapse a travel-ordered sequence of tiles (nearest-wall first), merging
// equal neighbours at most once each. Returns output entries (target order) + points.
export function slideLine(seq) {
  const entries = [];
  let gained = 0;
  let i = 0;
  while (i < seq.length) {
    if (i + 1 < seq.length && seq[i].value === seq[i + 1].value) {
      const value = seq[i].value * 2;
      entries.push({ id: seq[i].id, value, consumedId: seq[i + 1].id });
      gained += value;
      i += 2;
    } else {
      entries.push({ id: seq[i].id, value: seq[i].value });
      i += 1;
    }
  }
  return { entries, gained };
}

export function move(tiles, n, dir) {
  const at = new Map(tiles.map((t) => [t.r * n + t.c, t]));
  const oldCell = new Map(tiles.map((t) => [t.id, { r: t.r, c: t.c }]));
  const newTiles = [];
  const moves = [];
  const merges = [];
  let gained = 0;

  for (let index = 0; index < n; index++) {
    const cells = lineCells(n, dir, index);
    const seq = cells.map((cell) => at.get(cell.r * n + cell.c)).filter(Boolean);
    const res = slideLine(seq);
    gained += res.gained;
    res.entries.forEach((entry, k) => {
      const to = cells[k];
      newTiles.push({ id: entry.id, r: to.r, c: to.c, value: entry.value });
      moves.push({ id: entry.id, from: oldCell.get(entry.id), to });
      if (entry.consumedId !== undefined) {
        moves.push({ id: entry.consumedId, from: oldCell.get(entry.consumedId), to });
        merges.push({ id: entry.id, consumedId: entry.consumedId, to, value: entry.value });
      }
    });
  }

  const moved =
    merges.length > 0 || moves.some((m) => m.from.r !== m.to.r || m.from.c !== m.to.c);
  return { tiles: newTiles, moves, merges, gained, moved };
}

function emptyCells(tiles, n) {
  const occupied = new Set(tiles.map((t) => t.r * n + t.c));
  const empties = [];
  for (let i = 0; i < n * n; i++) {
    if (!occupied.has(i)) empties.push({ r: Math.floor(i / n), c: i % n });
  }
  return empties;
}

export function spawnTile(rng, tiles, n, nextId) {
  const empties = emptyCells(tiles, n);
  if (empties.length === 0) return { tiles, spawned: null, nextId };
  const cell = empties[Math.floor(rng() * empties.length)];
  const value = rng() < 0.9 ? 2 : 4;
  const spawned = { id: nextId, r: cell.r, c: cell.c, value };
  return { tiles: [...tiles, spawned], spawned, nextId: nextId + 1 };
}

export function newGame(rng, n = 4) {
  const a = spawnTile(rng, [], n, 1);
  const b = spawnTile(rng, a.tiles, n, a.nextId);
  return { tiles: b.tiles, nextId: b.nextId };
}

export function canMove(tiles, n) {
  if (tiles.length < n * n) return true;
  const at = new Map(tiles.map((t) => [t.r * n + t.c, t.value]));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = at.get(r * n + c);
      if (c + 1 < n && at.get(r * n + (c + 1)) === v) return true;
      if (r + 1 < n && at.get((r + 1) * n + c) === v) return true;
    }
  }
  return false;
}

export function hasReached(tiles, target = 2048) {
  return tiles.some((t) => t.value >= target);
}
