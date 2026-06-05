import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultText } from './share.js';

const N = 3;
const REGIONS = [0, 0, 1, 0, 2, 1, 2, 2, 1];
const base = { mode: 'daily', dateStr: '2026-06-05', difficulty: 'medium', n: N, regions: REGIONS, elapsedMs: 65000 };

test('resultText: never reveals the solution (no crown emoji)', () => {
  assert.ok(!resultText(base).includes('👑'));
});

test('resultText: includes a play link', () => {
  assert.match(resultText(base), /games\.keepitneat\.app/);
});

test('resultText: daily includes the date and the formatted time (65000ms -> 01:05)', () => {
  const txt = resultText(base);
  assert.match(txt, /2026-06-05/);
  assert.match(txt, /01:05/);
});

test('resultText: renders exactly n*n color squares (colors only)', () => {
  const txt = resultText(base);
  const squares = (txt.match(/🟪|🟧|🟦|🟩|🟥|🟨|⬜|🟫/g) || []).length;
  assert.equal(squares, N * N);
});

test('resultText: endless shows the difficulty label', () => {
  assert.match(resultText({ ...base, mode: 'endless', difficulty: 'hard' }), /Endless.*Hard|Hard/);
});
