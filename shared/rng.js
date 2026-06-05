// shared/rng.js
/* The single source of randomness for every game. Seeded so the daily puzzle
 * is identical on every device. Generators/solvers MUST draw from here and
 * never call Math.random() — that is what keeps the daily deterministic. */

// mulberry32: tiny, fast, well-distributed 32-bit PRNG.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a hash of a 'YYYY-MM-DD' string -> 32-bit unsigned seed.
export function seedFromDate(dateStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

// Fisher-Yates on a copy; never mutates the input.
export function shuffle(rng, array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
