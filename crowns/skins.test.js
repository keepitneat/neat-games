import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, normalizeSkin, tokenSvg } from './skins.js';

test('SKINS includes crown and cat', () => {
  assert.ok(SKINS.includes('crown'));
  assert.ok(SKINS.includes('cat'));
});

test('normalizeSkin: unknown values fall back to crown', () => {
  assert.equal(normalizeSkin('crown'), 'crown');
  assert.equal(normalizeSkin('cat'), 'cat');
  assert.equal(normalizeSkin('dragon'), 'crown');
  assert.equal(normalizeSkin(null), 'crown');
});

test('tokenSvg: returns an <svg> string for each skin', () => {
  for (const skin of SKINS) {
    const svg = tokenSvg(skin);
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
    assert.match(svg, /currentColor/); // inherits color for theming
  }
});
