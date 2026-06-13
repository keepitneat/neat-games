// shared/theme.js
/* Three-state theme (system / light / dark). Pure helpers — no DOM, no
 * localStorage; callers own persistence + the document attribute. The FOUC
 * inline script in each HTML file reimplements this rule by hand (it runs
 * before modules load). Keep THEME_STATES in sync there. */

export const THEME_STATES = ['system', 'light', 'dark'];

export function normalizeTheme(value) {
  return THEME_STATES.includes(value) ? value : 'system';
}

export function themeAttr(state) {
  const normalized = normalizeTheme(state);
  return normalized === 'system' ? null : normalized;
}

/* DOM helpers — injectable for testing; default to browser globals. */

/** Apply the given theme state to the given root element. */
export function applyTheme(state, root = document.documentElement) {
  const attr = themeAttr(state);
  if (attr) root.setAttribute('data-theme', attr);
  else root.removeAttribute('data-theme');
}

/**
 * Wire the three-state theme toggle for [data-theme-set] buttons.
 * Reads/writes the 'theme' storage key using the FOUC-compatible
 * convention: system state = key absent (removeItem), not stored as 'system'.
 * Safe to call once at boot; replaces per-game setTheme/paintTheme/wireTheme.
 */
export function wireThemeToggle(doc = document, storage = localStorage) {
  const paint = (active) => {
    doc.querySelectorAll('[data-theme-set]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === active));
    });
  };

  doc.querySelectorAll('[data-theme-set]').forEach((b) => {
    b.addEventListener('click', () => {
      const state = normalizeTheme(b.dataset.themeSet);
      if (state === 'system') storage.removeItem('theme');
      else storage.setItem('theme', state);
      applyTheme(state, doc.documentElement);
      paint(state);
    });
  });

  // Initial paint from stored preference.
  const saved = normalizeTheme(storage.getItem('theme'));
  paint(saved);
}
