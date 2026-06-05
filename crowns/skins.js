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
    '<path d="M4 18 L5.5 9 L9.5 12 L12 6 L14.5 12 L18.5 9 L20 18 Z"/>' +
    '<circle cx="5.5" cy="9" r="1.3"/><circle cx="12" cy="6" r="1.3"/>' +
    '<circle cx="18.5" cy="9" r="1.3"/></svg>',
  cat:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M6 9 L5 3.5 L9.7 8 L12 7.6 L14.3 8 L19 3.5 L18 9 ' +
    'C20 11.5 19.5 16.5 16 19 C13.5 20.8 10.5 20.8 8 19 ' +
    'C4.5 16.5 4 11.5 6 9 Z"/></svg>',
};

export function tokenSvg(skin) {
  return SVGS[normalizeSkin(skin)];
}
