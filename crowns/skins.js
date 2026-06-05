// crowns/skins.js
/* Token skins. Each returns inline SVG markup using currentColor so the token
 * inherits its fill from CSS (and can be themed). Add new skins here only. */

export const SKINS = ['crown', 'cat'];

export function normalizeSkin(value) {
  return SKINS.includes(value) ? value : 'crown';
}

const SVGS = {
  crown:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/></svg>',
  cat:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M4 4l3 4h10l3-4-1 9a8 8 0 01-16 0L4 4z"/>' +
    '<circle cx="9.5" cy="12" r="1.1"/><circle cx="14.5" cy="12" r="1.1"/></svg>',
};

export function tokenSvg(skin) {
  return SVGS[normalizeSkin(skin)];
}
