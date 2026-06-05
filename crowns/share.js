// crowns/share.js
/* Builds the shareable result text. Deliberately shows only the color-region
 * layout (no crown positions) so sharing never spoils the solution — plus the
 * solve time and a link to play. */

const SQUARES = ['🟪', '🟧', '🟦', '🟩', '🟥', '🟨', '⬜', '🟫', '🟩', '🟧'];
const PLAY_URL = 'https://games.keepitneat.app/crowns/';

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function resultText({ mode, dateStr, difficulty, n, regions, elapsedMs }) {
  const head = mode === 'daily'
    ? `Crowns — ${dateStr}`
    : `Crowns — Endless (${cap(difficulty)})`;
  let grid = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      grid += SQUARES[regions[r * n + c] % SQUARES.length];
    }
    grid += '\n';
  }
  return `${head} · ${formatTime(elapsedMs)}\n${grid}Play: ${PLAY_URL}`;
}
