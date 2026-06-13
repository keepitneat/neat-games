import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_STATES, normalizeTheme, themeAttr, applyTheme, wireThemeToggle } from './theme.js';

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

// --- DOM-helper tests using hand-rolled fakes (no jsdom) ---

function makeRoot() {
  const attrs = new Map();
  return {
    setAttribute(k, v) { attrs.set(k, v); },
    removeAttribute(k) { attrs.delete(k); },
    get(k) { return attrs.get(k); },
    has(k) { return attrs.has(k); },
  };
}

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, v); },
    removeItem(k) { map.delete(k); },
    has(k) { return map.has(k); },
  };
}

function makeButton(themeSet) {
  const attrs = new Map();
  let handler = null;
  return {
    dataset: { themeSet },
    setAttribute(k, v) { attrs.set(k, v); },
    get(k) { return attrs.get(k); },
    addEventListener(ev, fn) { if (ev === 'click') handler = fn; },
    click() { if (handler) handler(); },
  };
}

function makeDoc(buttons) {
  const root = makeRoot();
  return {
    querySelectorAll(sel) {
      if (sel === '[data-theme-set]') return buttons;
      return [];
    },
    documentElement: root,
    _root: root,
  };
}

test('applyTheme: dark sets data-theme=dark on root', () => {
  const root = makeRoot();
  applyTheme('dark', root);
  assert.equal(root.get('data-theme'), 'dark');
});

test('applyTheme: light sets data-theme=light on root', () => {
  const root = makeRoot();
  applyTheme('light', root);
  assert.equal(root.get('data-theme'), 'light');
});

test('applyTheme: system removes data-theme from root', () => {
  const root = makeRoot();
  root.setAttribute('data-theme', 'dark'); // pre-set so removal is meaningful
  applyTheme('system', root);
  assert.equal(root.has('data-theme'), false);
});

test('wireThemeToggle: clicking dark sets data-theme=dark and storage', () => {
  const darkBtn = makeButton('dark');
  const lightBtn = makeButton('light');
  const systemBtn = makeButton('system');
  const storage = makeStorage();
  const doc = makeDoc([darkBtn, lightBtn, systemBtn]);

  wireThemeToggle(doc, storage);
  darkBtn.click();

  assert.equal(doc._root.get('data-theme'), 'dark');
  assert.equal(storage.getItem('theme'), 'dark');
});

test('wireThemeToggle: clicking system removes key from storage, does not setItem', () => {
  const darkBtn = makeButton('dark');
  const lightBtn = makeButton('light');
  const systemBtn = makeButton('system');
  const storage = makeStorage({ theme: 'dark' }); // pre-seeded
  const doc = makeDoc([darkBtn, lightBtn, systemBtn]);

  wireThemeToggle(doc, storage);
  systemBtn.click();

  assert.equal(storage.has('theme'), false);
});

test('wireThemeToggle: aria-pressed is exclusive after click', () => {
  const darkBtn = makeButton('dark');
  const lightBtn = makeButton('light');
  const systemBtn = makeButton('system');
  const storage = makeStorage();
  const doc = makeDoc([darkBtn, lightBtn, systemBtn]);

  wireThemeToggle(doc, storage);
  darkBtn.click();

  assert.equal(darkBtn.get('aria-pressed'), 'true');
  assert.equal(lightBtn.get('aria-pressed'), 'false');
  assert.equal(systemBtn.get('aria-pressed'), 'false');
});

test('wireThemeToggle: init paint marks light aria-pressed from pre-seeded storage', () => {
  const darkBtn = makeButton('dark');
  const lightBtn = makeButton('light');
  const systemBtn = makeButton('system');
  const storage = makeStorage({ theme: 'light' });
  const doc = makeDoc([darkBtn, lightBtn, systemBtn]);

  wireThemeToggle(doc, storage);

  // No click — just init paint
  assert.equal(lightBtn.get('aria-pressed'), 'true');
  assert.equal(darkBtn.get('aria-pressed'), 'false');
  assert.equal(systemBtn.get('aria-pressed'), 'false');
});
