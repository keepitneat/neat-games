// crowns/daily.js
/* The daily puzzle is a pure function of the date: same date -> same board, on
 * every device, with no backend. There is exactly one daily game per date. */

import { makeRng, seedFromDate } from '../shared/rng.js';
import { generate } from './generate.js';

// Daily is always 8×8 (the generator's reliable max; see spec Known limitations).
export const DAILY_N = 8;

export function dailyPuzzle(dateStr) {
  return generate(makeRng(seedFromDate(dateStr)), DAILY_N);
}
