// crowns/board.js
/* The board model and interaction state. Pure: every function returns a new
 * board; nothing is mutated. The app computes the next cells array (cycle +
 * optional auto-X) and commits it once, so a single user action is one undo. */

import { isSolved } from './rules.js';

// Cap undo history so a long session can't grow memory without bound; 100 moves is far more than any single puzzle needs.
const HISTORY_CAP = 100;

export function createBoard(n, regions) {
  return { n, regions, cells: Array(n * n).fill('empty'), history: [] };
}

export function cycleValue(value) {
  if (value === 'empty') return 'x';
  if (value === 'x') return 'crown';
  return 'empty';
}

// Replace the whole cells array, pushing the current cells onto history.
export function commit(board, nextCells) {
  const history = [...board.history, board.cells].slice(-HISTORY_CAP);
  return { ...board, cells: nextCells, history };
}

export function undo(board) {
  if (board.history.length === 0) return board;
  const history = board.history.slice();
  const cells = history.pop();
  return { ...board, cells, history };
}

export function reset(board) {
  return commit(board, Array(board.n * board.n).fill('empty'));
}

export function boardIsSolved(board) {
  return isSolved(board.cells, board.regions, board.n);
}
