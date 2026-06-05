// crowns/rules.js
/* Pure rule checking for Crowns. A cell index is i = r*n + c. */

export function crownIndices(cells) {
  const out = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] === 'crown') out.push(i);
  return out;
}

// Cells a crown at index i "attacks": its whole row, whole column, and the 8
// king-move neighbors. Excludes i itself. Used for auto-X and the gentle Hint.
export function attackedCells(i, n) {
  const r = Math.floor(i / n);
  const c = i % n;
  const out = new Set();
  for (let cc = 0; cc < n; cc++) out.add(r * n + cc); // row
  for (let rr = 0; rr < n; rr++) out.add(rr * n + c); // column
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.add(rr * n + cc);
    }
  }
  out.delete(i);
  return [...out];
}

// Returns a Set of crown cell indices that participate in any rule violation:
// duplicate in a row, column, or region, or two crowns touching (incl. diagonal).
export function conflicts(cells, regions, n) {
  const crowns = crownIndices(cells);
  const bad = new Set();
  for (let a = 0; a < crowns.length; a++) {
    for (let b = a + 1; b < crowns.length; b++) {
      const i = crowns[a];
      const j = crowns[b];
      const ri = Math.floor(i / n);
      const ci = i % n;
      const rj = Math.floor(j / n);
      const cj = j % n;
      const sameRow = ri === rj;
      const sameCol = ci === cj;
      const sameRegion = regions[i] === regions[j];
      const touching = Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1;
      if (sameRow || sameCol || sameRegion || touching) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

// Solved iff exactly n crowns and zero conflicts. With n crowns and no row/col/
// region duplicates, that forces exactly one per row, column, and region.
export function isSolved(cells, regions, n) {
  return crownIndices(cells).length === n && conflicts(cells, regions, n).size === 0;
}
