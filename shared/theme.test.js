import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_STATES, normalizeTheme, themeAttr } from './theme.js';

test('normalizeTheme: passes through known states', () => {
  for (const s of THEME_STATES) assert.equal(normalizeTheme(s), s);
});

test('normalizeTheme: unknown/empty fall back to system', () => {
  assert.equal(normalizeTheme(null), 'system');
  assert.equal(normalizeTheme('purple'), 'system');
});

test('themeAttr: system yields null, others yield themselves', () => {
  assert.equal(themeAttr('system'), null);
  assert.equal(themeAttr('dark'), 'dark');
  assert.equal(themeAttr('light'), 'light');
});
