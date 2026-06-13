// crowns/app.js
/* The only file that touches the DOM. Wires the pure engine modules to the
 * board UI, settings, timer, persistence, and the daily/endless modes. */

import { makeRng } from '../shared/rng.js';
import { makeStore } from '../shared/store.js';
import { createBoard, cycleValue, commit, undo, reset, boardIsSolved } from './board.js';
import { attackedCells, conflicts } from './rules.js';
import { findForcedX } from './solver.js';
import { generate } from './generate.js';
import { dailyPuzzle, DAILY_N } from './daily.js';
import { resultText } from './share.js';
import { formatTime, cap } from './format.js';
import { tokenSvg, normalizeSkin } from './skins.js';
import {
  loadSettings, saveSettings,
  saveGame, loadGame,
  recordDailySolve, loadStreak, recordBestTime,
} from './persist.js';
import { wireThemeToggle } from '../shared/theme.js';

const DIFFICULTY = { easy: 6, medium: 7, hard: 8 };
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];
const PALETTE = ['#c7b8ea', '#f6c89a', '#9ec5f0', '#a8d5a2', '#e8716a',
  '#eef07e', '#cbd5d1', '#f3b0c3', '#b8e0d2', '#d9c2a0'];

const $ = (id) => document.getElementById(id);
const store = makeStore(localStorage, 'crowns');

const state = {
  mode: 'daily',
  difficulty: 'medium',
  dateStr: todayStr(),
  puzzle: null,
  board: null,
  settings: loadSettings(store),
  solved: false,
  seed: 0,
  timer: { elapsedMs: 0, running: false, baseMs: 0, intervalId: null },
};

function todayStr() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  // Local date on purpose: "today's puzzle" should follow the player's calendar day.
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function gameKey() {
  return state.mode === 'daily' ? `daily:${state.dateStr}` : 'endless';
}

// --- puzzle lifecycle ---

function buildPuzzle() {
  if (state.mode === 'daily') {
    state.puzzle = dailyPuzzle(state.dateStr);
  } else {
    const meta = loadGame(store, 'endless-meta');
    if (meta && DIFFICULTY[meta.difficulty]) {
      state.difficulty = meta.difficulty;
      state.seed = meta.seed;
    } else {
      state.seed = Math.floor(Math.random() * 0x7fffffff); // endless: any seed
    }
    state.puzzle = generate(makeRng(state.seed), DIFFICULTY[state.difficulty]);
    saveGame(store, 'endless-meta', { seed: state.seed, difficulty: state.difficulty });
  }
  state.board = createBoard(state.puzzle.n, state.puzzle.regions);
  state.solved = false;
  resetTimer();

  const saved = loadGame(store, gameKey());
  if (saved && Array.isArray(saved.cells) && saved.cells.length === state.board.cells.length) {
    state.board = { ...state.board, cells: saved.cells };
    state.timer.elapsedMs = saved.elapsedMs || 0;
    state.solved = !!saved.solved;
  }
  checkSolved();
}

function newEndless() {
  state.seed = Math.floor(Math.random() * 0x7fffffff);
  state.puzzle = generate(makeRng(state.seed), DIFFICULTY[state.difficulty]);
  state.board = createBoard(state.puzzle.n, state.puzzle.regions);
  state.solved = false;
  resetTimer();
  saveGame(store, 'endless-meta', { seed: state.seed, difficulty: state.difficulty });
  persistGame();
  render();
}

function persistGame() {
  saveGame(store, gameKey(), {
    cells: state.board.cells,
    elapsedMs: currentElapsed(),
    solved: state.solved,
  });
}

// --- timer ---

function currentElapsed() {
  if (state.timer.running) return Date.now() - state.timer.baseMs;
  return state.timer.elapsedMs;
}
function resetTimer() {
  stopTimer();
  state.timer.elapsedMs = 0;
}
function startTimerIfNeeded() {
  if (state.timer.running || state.solved) return;
  state.timer.running = true;
  state.timer.baseMs = Date.now() - state.timer.elapsedMs;
  state.timer.intervalId = setInterval(renderTimer, 250);
}
function stopTimer() {
  if (state.timer.running) {
    state.timer.elapsedMs = Date.now() - state.timer.baseMs;
    state.timer.running = false;
  }
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}
// --- rendering ---

function regionColor(id) {
  return PALETTE[id % PALETTE.length];
}

function render() {
  renderBoard();
  renderStatus();
  renderControls();
  renderSettings();
  renderWin();
}

function renderBoard() {
  const { board, puzzle } = state;
  const boardEl = $('board');
  boardEl.style.setProperty('--n', puzzle.n);
  const conflictSet = state.settings.conflictHighlight
    ? conflicts(board.cells, board.regions, puzzle.n)
    : new Set();
  const skin = normalizeSkin(state.settings.skin);

  const frag = document.createDocumentFragment();
  for (let i = 0; i < board.cells.length; i++) {
    const r = Math.floor(i / puzzle.n);
    const c = i % puzzle.n;
    const cell = document.createElement('button');
    cell.className = 'cell' + (conflictSet.has(i) ? ' conflict' : '');
    cell.style.background = regionColor(puzzle.regions[i]);
    cell.dataset.index = String(i);
    const value = board.cells[i];
    if (value === 'crown') cell.innerHTML = tokenSvg(skin);
    else if (value === 'x') cell.innerHTML = '<span class="x" aria-hidden="true">&times;</span>';
    const conflictNote = conflictSet.has(i) ? ' (conflict)' : '';
    cell.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}: ${value}${conflictNote}`);
    frag.appendChild(cell);
  }
  const prevIndex = document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.index : undefined;
  boardEl.replaceChildren(frag);
  if (prevIndex !== undefined) {
    const refocus = boardEl.querySelector(`[data-index="${prevIndex}"]`);
    if (refocus) refocus.focus();
  }
}

function renderStatus() {
  if (state.mode === 'daily') {
    const nice = new Date(state.dateStr + 'T00:00:00').toLocaleDateString(undefined,
      { month: 'long', day: 'numeric' });
    $('status-left').textContent = `${nice} · Daily ${state.puzzle.n}×${state.puzzle.n}`;
    const streak = loadStreak(store);
    const s = $('streak');
    s.hidden = streak.count < 1;
    s.textContent = `🔥 ${streak.count} day${streak.count === 1 ? '' : 's'}`;
  } else {
    $('status-left').textContent = `Endless · ${cap(state.difficulty)} ${state.puzzle.n}×${state.puzzle.n}`;
    $('streak').hidden = true;
  }
  renderTimer();
}

function renderTimer() {
  const t = $('timer');
  t.textContent = formatTime(currentElapsed());
  t.classList.toggle('hidden', !state.settings.showTimer);
}

function renderControls() {
  $('mode-daily').setAttribute('aria-pressed', String(state.mode === 'daily'));
  $('mode-endless').setAttribute('aria-pressed', String(state.mode === 'endless'));
  const diffBtn = $('difficulty-btn');
  const newBtn = $('new-puzzle');
  if (state.mode === 'endless') {
    diffBtn.hidden = false;
    diffBtn.textContent = cap(state.difficulty);
    newBtn.hidden = false;
  } else {
    diffBtn.hidden = true;
    newBtn.hidden = true;
  }
}

function renderSettings() {
  $('set-autox').checked = state.settings.autoX;
  $('set-conflict').checked = state.settings.conflictHighlight;
  $('set-timer').checked = state.settings.showTimer;
  const skin = normalizeSkin(state.settings.skin);
  $('skin-crown').setAttribute('aria-pressed', String(skin === 'crown'));
  $('skin-cat').setAttribute('aria-pressed', String(skin === 'cat'));
}

function renderWin() {
  const win = $('win');
  win.classList.toggle('hidden', !state.solved);
  if (state.solved) $('win-time').textContent = `Time: ${formatTime(currentElapsed())}`;
}

function toast(msg) {
  $('toast').textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { $('toast').textContent = ''; }, 2500);
}

// --- interactions ---

function onCellClick(i) {
  if (state.solved) return;
  const next = cycleValue(state.board.cells[i]);
  const cells = state.board.cells.slice();
  cells[i] = next;
  if (next === 'crown' && state.settings.autoX) {
    for (const a of attackedCells(i, state.puzzle.n)) {
      if (cells[a] === 'empty') cells[a] = 'x';
    }
  }
  state.board = commit(state.board, cells);
  startTimerIfNeeded();
  checkSolved();
  persistGame();
  render();
}

function onHint() {
  const res = findForcedX(state.board);
  if (!res) { toast('No forced move right now — keep deducing!'); return; }
  if (res.type === 'fix') { toast('There’s a conflict — check your crowns.'); return; }
  const cells = state.board.cells.slice();
  cells[res.index] = 'x';
  state.board = commit(state.board, cells);
  startTimerIfNeeded();
  persistGame();
  render();
}

function onUndo() {
  state.board = undo(state.board);
  persistGame();
  render();
}

function onReset() {
  state.board = reset(state.board);
  persistGame();
  render();
}

function checkSolved() {
  if (state.solved || !boardIsSolved(state.board)) return;
  state.solved = true;
  stopTimer();
  const elapsed = currentElapsed();
  const diffKey = state.mode === 'daily' ? 'daily' : state.difficulty;
  recordBestTime(store, diffKey, elapsed);
  if (state.mode === 'daily') recordDailySolve(store, state.dateStr);
}

async function onCopyResult() {
  try {
    await navigator.clipboard.writeText(resultText({
      mode: state.mode,
      dateStr: state.dateStr,
      difficulty: state.difficulty,
      n: state.puzzle.n,
      regions: state.puzzle.regions,
      elapsedMs: currentElapsed(),
    }));
    toast('Result copied to clipboard!');
  } catch {
    toast('Copy failed — clipboard not available.');
  }
}

// --- mode / difficulty / settings handlers ---

function setMode(mode) {
  if (state.mode === mode) return;
  stopTimer();
  state.mode = mode;
  location.hash = mode === 'endless' ? 'endless' : '';
  buildPuzzle();
  render();
}

function cycleDifficulty() {
  const idx = DIFFICULTY_ORDER.indexOf(state.difficulty);
  state.difficulty = DIFFICULTY_ORDER[(idx + 1) % DIFFICULTY_ORDER.length];
  newEndless();
}

function toggleSetting(key) {
  state.settings = { ...state.settings, [key]: !state.settings[key] };
  saveSettings(store, state.settings);
  render();
}

function setSkin(skin) {
  state.settings = { ...state.settings, skin: normalizeSkin(skin) };
  saveSettings(store, state.settings);
  render();
}

// --- wiring ---

function wire() {
  $('board').addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (cell) onCellClick(Number(cell.dataset.index));
  });
  $('board').addEventListener('keydown', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const n = state.puzzle.n;
    const i = Number(cell.dataset.index);
    let t;
    if (e.key === 'ArrowRight') { if (i % n === n - 1) return; t = i + 1; }
    else if (e.key === 'ArrowLeft') { if (i % n === 0) return; t = i - 1; }
    else if (e.key === 'ArrowUp') { t = i - n; }
    else if (e.key === 'ArrowDown') { t = i + n; }
    else return;
    if (t < 0 || t >= n * n) return;
    e.preventDefault();
    const next = $('board').querySelector(`[data-index="${t}"]`);
    if (next) next.focus();
  });
  $('undo').addEventListener('click', onUndo);
  $('hint').addEventListener('click', onHint);
  $('reset').addEventListener('click', onReset);
  $('copy-result').addEventListener('click', onCopyResult);
  $('mode-daily').addEventListener('click', () => setMode('daily'));
  $('mode-endless').addEventListener('click', () => setMode('endless'));
  $('difficulty-btn').addEventListener('click', cycleDifficulty);
  $('new-puzzle').addEventListener('click', newEndless);
  $('settings-toggle').addEventListener('click', () => {
    const panel = $('settings-panel');
    const open = panel.classList.toggle('hidden');
    $('settings-toggle').setAttribute('aria-expanded', String(!open));
  });
  $('set-autox').addEventListener('change', () => toggleSetting('autoX'));
  $('set-conflict').addEventListener('change', () => toggleSetting('conflictHighlight'));
  $('set-timer').addEventListener('change', () => toggleSetting('showTimer'));
  $('skin-crown').addEventListener('click', () => setSkin('crown'));
  $('skin-cat').addEventListener('click', () => setSkin('cat'));
  // Theme buttons are painted once here and repainted on click by wireThemeToggle — nothing else mutates the theme.
  wireThemeToggle();
  window.addEventListener('beforeunload', persistGame);
}

// --- boot ---

state.mode = location.hash === '#endless' ? 'endless' : 'daily';
buildPuzzle();
wire();
render();
