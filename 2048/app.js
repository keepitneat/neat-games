// 2048/app.js
/* The only DOM file. Wires pure logic to the board, animates tiles by updating
 * each id-keyed node's CSS transform, and handles input + persistence. */

import { makeRng } from '../shared/rng.js';
import { makeStore } from '../shared/store.js';
import { move, spawnTile, newGame, canMove, hasReached } from './logic.js';
import { loadBest, recordBest, saveGame, loadGame } from './persist.js';
import { wireThemeToggle } from '../shared/theme.js';

const N = 4;
const SLIDE_MS = 120;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (id) => document.getElementById(id);
const store = makeStore(localStorage, '2048');
const nodes = new Map(); // tile id -> .tile element

const state = {
  tiles: [],
  score: 0,
  best: loadBest(store),
  won: false,
  keepGoing: false,
  over: false,
  nextId: 1,
  rng: makeRng(1),
  animating: false,
};

function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

// --- setup board background cells ---
function buildCells() {
  $('board').style.setProperty('--n', N);
  const cells = $('cells');
  cells.style.setProperty('--n', N);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < N * N; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    frag.appendChild(cell);
  }
  cells.replaceChildren(frag);
}

// --- tile nodes ---
function makeTileNode(tile, spawn) {
  const el = document.createElement('div');
  el.className = 'tile' + (spawn ? ' spawn' : '');
  el.style.setProperty('--r', tile.r);
  el.style.setProperty('--c', tile.c);
  setTileValue(el, tile.value);
  const inner = document.createElement('div');
  inner.className = 'tile-inner';
  inner.textContent = tile.value;
  el.appendChild(inner);
  return el;
}

function setTileValue(el, value) {
  el.dataset.value = value;
  el.classList.toggle('big', value > 2048);
}

function renderAll() {
  nodes.clear();
  const layer = $('tiles');
  const frag = document.createDocumentFragment();
  for (const tile of state.tiles) {
    const el = makeTileNode(tile, false);
    nodes.set(tile.id, el);
    frag.appendChild(el);
  }
  layer.replaceChildren(frag);
  renderScores();
}

function renderScores() {
  $('score').textContent = state.score;
  $('best').textContent = state.best;
}

function persist() {
  saveGame(store, {
    tiles: state.tiles, score: state.score, won: state.won,
    keepGoing: state.keepGoing, nextId: state.nextId,
  });
}

// --- a move ---
function applyMove(dir) {
  if (state.animating || state.over) return;
  const result = move(state.tiles, N, dir);
  if (!result.moved) return;

  state.animating = true;
  state.tiles = result.tiles;
  state.score += result.gained;
  state.best = recordBest(store, state.score);

  // 1) slide every pre-move tile to its destination cell
  for (const m of result.moves) {
    const el = nodes.get(m.id);
    if (!el) continue;
    el.style.setProperty('--r', m.to.r);
    el.style.setProperty('--c', m.to.c);
  }
  renderScores();

  const finalize = () => {
    // 2) merges: drop consumed nodes, pop survivors, update value
    for (const mg of result.merges) {
      const consumed = nodes.get(mg.consumedId);
      if (consumed) { consumed.remove(); nodes.delete(mg.consumedId); }
      const survivor = nodes.get(mg.id);
      if (survivor) {
        const inner = survivor.firstChild;
        setTileValue(survivor, mg.value);
        inner.textContent = mg.value;
        inner.classList.remove('merged');
        void inner.offsetWidth; // restart animation
        inner.classList.add('merged');
      }
    }
    // 3) spawn a new tile
    const sp = spawnTile(state.rng, state.tiles, N, state.nextId);
    state.tiles = sp.tiles;
    state.nextId = sp.nextId;
    if (sp.spawned) {
      const el = makeTileNode(sp.spawned, true);
      nodes.set(sp.spawned.id, el);
      $('tiles').appendChild(el);
    }
    checkEnd();
    persist();
    state.animating = false;
  };

  if (reduceMotion) finalize();
  else setTimeout(finalize, SLIDE_MS);
}

function checkEnd() {
  if (!state.won && hasReached(state.tiles, 2048)) {
    state.won = true;
    announce('You reached 2048!');
    showOverlay('You win! 🎉', [
      { label: 'Keep going', ghost: true, action: hideOverlay },
      { label: 'New game', ghost: false, action: startNew },
    ]);
    return;
  }
  if (!canMove(state.tiles, N)) {
    state.over = true;
    announce('Game over. Score ' + state.score + '.');
    showOverlay('Game over', [{ label: 'New game', ghost: false, action: startNew }]);
  }
}

// --- overlay ---
function showOverlay(title, actions) {
  $('overlay-title').textContent = title;
  const row = $('overlay-actions');
  row.replaceChildren();
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a.label;
    if (a.ghost) b.className = 'ghost';
    b.addEventListener('click', a.action);
    row.appendChild(b);
  }
  $('overlay').classList.remove('hidden');
}
function hideOverlay() {
  $('overlay').classList.add('hidden');
  state.keepGoing = true;
  persist();
  if (!canMove(state.tiles, N)) {
    state.over = true;
    announce('Game over. Score ' + state.score + '.');
    showOverlay('Game over', [{ label: 'New game', ghost: false, action: startNew }]);
  }
}
function announce(msg) { $('status').textContent = msg; }

// --- new game ---
function startNew() {
  const seed = randomSeed();
  state.rng = makeRng(seed);
  const g = newGame(state.rng, N);
  state.tiles = g.tiles;
  state.nextId = g.nextId;
  state.score = 0;
  state.won = false;
  state.keepGoing = false;
  state.over = false;
  $('overlay').classList.add('hidden');
  renderAll();
  persist();
}

// --- input ---
const KEY_DIR = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down',
};
function onKey(e) {
  const dir = KEY_DIR[e.key];
  if (!dir) return;
  e.preventDefault();
  applyMove(dir);
}

let touch = null;
function onTouchStart(e) {
  const t = e.changedTouches[0];
  touch = { x: t.clientX, y: t.clientY };
}
function onTouchEnd(e) {
  if (!touch) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < 24) return; // too small
  applyMove(ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}

function wire() {
  window.addEventListener('keydown', onKey);
  const board = $('board');
  board.addEventListener('touchstart', onTouchStart, { passive: true });
  board.addEventListener('touchend', onTouchEnd, { passive: true });
  $('new-game').addEventListener('click', startNew);
  wireThemeToggle();
  window.addEventListener('beforeunload', persist);
}

// --- boot ---
function boot() {
  buildCells();
  wire();
  const saved = loadGame(store);
  if (saved && Array.isArray(saved.tiles) && saved.tiles.length) {
    state.tiles = saved.tiles;
    state.score = saved.score || 0;
    state.won = !!saved.won;
    state.keepGoing = !!saved.keepGoing;
    state.nextId = saved.nextId || (Math.max(0, ...saved.tiles.map((t) => t.id)) + 1);
    state.rng = makeRng(randomSeed());
    renderAll();
    if (!canMove(state.tiles, N)) { state.over = true; checkEnd(); }
  } else {
    startNew();
  }
}

boot();
