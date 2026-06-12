// minesweeper/app.js
/* The only DOM file. Wires the pure engine to the board: renders cells, applies
 * only the `changed` ids the engine returns, and handles input (desktop click /
 * right-click / chord, touch tap / long-press / mode toggle), the timer, and
 * persistence. */

import { makeRng } from '../shared/rng.js';
import { makeStore } from '../shared/store.js';
import { DIFFICULTIES, newGame, reveal, toggleFlag, chord } from './logic.js';
import { loadStats, recordResult, saveGame, loadGame, clearGame } from './persist.js';
import { wireThemeToggle } from '../shared/theme.js';

const $ = (id) => document.getElementById(id);
const store = makeStore(localStorage, 'minesweeper');
const LONG_PRESS_MS = 400;
const MOVE_CANCEL_PX = 10; // finger travel that cancels a long-press

const ui = {
  difficulty: 'easy',
  state: null,
  rng: makeRng(randomSeed()),
  flagMode: false,
  suppressClick: false,
  startedAt: null,
  timerId: null,
  nodes: new Map(), // cell id -> button element
};

function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

// ---------- rendering ----------
function buildBoard() {
  const board = $('board');
  board.style.setProperty('--cols', ui.state.cols);
  board.replaceChildren();
  ui.nodes.clear();
  const frag = document.createDocumentFragment();
  for (const cell of ui.state.cells) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ms-cell';
    el.dataset.id = cell.id;
    paintCell(el, cell);
    frag.appendChild(el);
    ui.nodes.set(cell.id, el);
  }
  board.appendChild(frag);
}

function paintCell(el, cell) {
  el.className = 'ms-cell';
  el.removeAttribute('data-n');
  let label = 'hidden';
  if (cell.state === 'flagged') {
    el.textContent = '🚩';
    label = 'flagged';
    if (ui.state.status === 'lost' && !cell.mine) el.classList.add('flag-wrong');
  } else if (cell.state === 'revealed') {
    el.classList.add('revealed');
    if (cell.mine) {
      el.textContent = '💣';
      el.classList.add('mine');
      if (ui.state.hitId === cell.id) el.classList.add('mine-hit');
      label = 'mine';
    } else if (cell.adj > 0) {
      el.textContent = String(cell.adj);
      el.dataset.n = cell.adj;
      label = String(cell.adj);
    } else {
      el.textContent = '';
      label = 'empty';
    }
  } else {
    el.textContent = '';
  }
  el.setAttribute('aria-label', `Row ${cell.r + 1}, column ${cell.c + 1}: ${label}`);
}

function repaint(changed) {
  for (const id of changed) paintCell(ui.nodes.get(id), ui.state.cells[id]);
}

// ---------- status ----------
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderStatus() {
  const flags = ui.state.flagsUsed;
  $('mines-left').textContent = ui.state.mineCount - flags;
  const stats = loadStats(store, ui.difficulty);
  $('best').textContent = stats.bestMs === null ? '—' : fmtTime(stats.bestMs);
  $('wins').textContent = stats.wins;
}

function tickTimer() {
  if (ui.startedAt === null) {
    $('timer').textContent = '0:00';
    return;
  }
  $('timer').textContent = fmtTime(Date.now() - ui.startedAt);
}

function startTimer() {
  if (ui.timerId !== null) return;
  // If startedAt was already set by the caller (resumed game), preserve it.
  if (ui.startedAt === null) ui.startedAt = Date.now();
  ui.timerId = setInterval(tickTimer, 250);
}

function stopTimer() {
  if (ui.timerId !== null) {
    clearInterval(ui.timerId);
    ui.timerId = null;
  }
}

// ---------- game lifecycle ----------
function startGame(difficulty, restored) {
  ui.difficulty = difficulty;
  stopTimer();
  ui.startedAt = null;
  if (restored) {
    ui.state = restored;
    if (restored.status === 'playing') {
      // Resume clock from saved elapsed so best-time stays honest.
      // (Time while the tab was closed is not counted — just continue from saved.)
      ui.startedAt = Date.now() - (restored.elapsedMs || 0);
      startTimer();
    }
  } else {
    ui.state = newGame(difficulty);
    ui.rng = makeRng(randomSeed());
    clearGame(store);
  }
  hideOverlay();
  buildBoard();
  tickTimer();
  renderStatus();
  $('live').textContent = '';
  syncDiffButtons();
}

function applyResult(res) {
  ui.state = res.state;
  repaint(res.changed);
  renderStatus();
  // The clock owns one start point: the moment mines are placed (first real reveal).
  if (ui.state.minesPlaced && ui.startedAt === null) ui.startedAt = Date.now();
  if (ui.state.status === 'playing') {
    startTimer();
    const elapsedMs = ui.startedAt === null ? 0 : Date.now() - ui.startedAt;
    saveGame(store, { ...ui.state, difficultyKey: ui.difficulty, elapsedMs });
  } else if (ui.state.status === 'won' || ui.state.status === 'lost') {
    stopTimer();
    clearGame(store);
    endGame();
  }
}

function endGame() {
  const won = ui.state.status === 'won';
  // OK only dismisses the banner so the finished board stays visible;
  // a fresh game starts from the toolbar "New game" button.
  const dismiss = [{ label: 'OK', action: hideOverlay }];
  if (won) {
    const elapsed = ui.startedAt === null ? 0 : Date.now() - ui.startedAt;
    const before = loadStats(store, ui.difficulty);
    recordResult(store, ui.difficulty, { won: true, timeMs: elapsed });
    const record = before.bestMs === null || elapsed < before.bestMs;
    $('live').textContent = record ? `You win! New best: ${fmtTime(elapsed)}` : 'You win!';
    showOverlay(
      'You win! 🎉',
      record ? `New best · ${fmtTime(elapsed)}` : `Time · ${fmtTime(elapsed)}`,
      dismiss
    );
  } else {
    // Engine already revealed all mines + tagged the hit; repaint every cell so
    // wrong flags and the struck mine render.
    ui.state.cells.forEach((c) => paintCell(ui.nodes.get(c.id), c));
    $('live').textContent = 'Boom — you hit a mine.';
    showOverlay('💥 Boom', 'You hit a mine.', dismiss);
  }
  renderStatus();
}

// ---------- win/loss overlay ----------
function showOverlay(title, sub, actions) {
  $('overlay-title').textContent = title;
  $('overlay-sub').textContent = sub;
  const row = $('overlay-actions');
  row.replaceChildren();
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a.label;
    b.addEventListener('click', a.action);
    row.appendChild(b);
  }
  $('overlay').classList.remove('hidden');
}

function hideOverlay() {
  $('overlay').classList.add('hidden');
}

// ---------- input ----------
function doReveal(id) {
  if (ui.state.status === 'won' || ui.state.status === 'lost') return;
  const cell = ui.state.cells[id];
  if (cell.state === 'revealed' && cell.adj > 0) {
    applyResult(chord(ui.state, id, ui.rng));
  } else {
    applyResult(reveal(ui.state, id, ui.rng));
  }
}

function doFlag(id) {
  if (ui.state.status === 'won' || ui.state.status === 'lost') return;
  applyResult(toggleFlag(ui.state, id));
}

function cellIdFromEvent(e) {
  const el = e.target.closest('.ms-cell');
  return el ? Number(el.dataset.id) : null;
}

function wireInput() {
  const board = $('board');

  board.addEventListener('click', (e) => {
    const id = cellIdFromEvent(e);
    if (id === null || ui.suppressClick) {
      ui.suppressClick = false;
      return;
    }
    if (ui.flagMode) doFlag(id);
    else doReveal(id);
  });

  board.addEventListener('contextmenu', (e) => {
    const id = cellIdFromEvent(e);
    if (id === null) return;
    e.preventDefault();
    doFlag(id);
  });

  // Long-press to flag (touch). Cancels the synthetic click that follows.
  let pressTimer = null;
  let pressX = 0;
  let pressY = 0;
  board.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const id = cellIdFromEvent(e);
    if (id === null) return;
    // Reset any stuck flag from a previous gesture before starting fresh.
    ui.suppressClick = false;
    pressX = e.clientX;
    pressY = e.clientY;
    pressTimer = setTimeout(() => {
      pressTimer = null;
      ui.suppressClick = true;
      doFlag(id);
    }, LONG_PRESS_MS);
  });
  const cancelPress = () => {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };
  board.addEventListener('pointerup', cancelPress);
  board.addEventListener('pointercancel', cancelPress);
  board.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') return;
    // Allow minor finger jitter; only cancel long-press if finger moved >10px.
    const dx = e.clientX - pressX;
    const dy = e.clientY - pressY;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cancelPress();
  });

  $('mode-toggle').addEventListener('click', () => {
    ui.flagMode = !ui.flagMode;
    $('mode-toggle').setAttribute('aria-pressed', String(ui.flagMode));
  });

  $('new-game').addEventListener('click', () => startGame(ui.difficulty));

  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.addEventListener('click', () => startGame(btn.dataset.diff));
  });
}

function syncDiffButtons() {
  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.diff === ui.difficulty));
  });
}

// ---------- boot ----------
function boot() {
  wireThemeToggle();
  wireInput();
  const saved = loadGame(store);
  if (
    saved &&
    saved.status === 'playing' &&
    DIFFICULTIES[saved.difficultyKey] &&
    Array.isArray(saved.cells) &&
    saved.cells.length === saved.rows * saved.cols
  ) {
    startGame(saved.difficultyKey, saved);
  } else {
    startGame('easy');
  }
}

boot();
