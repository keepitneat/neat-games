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

/* DOM helpers — require a browser context (document, localStorage). */

/** Apply the given theme state to document.documentElement. */
export function applyTheme(state) {
  const attr = themeAttr(normalizeTheme(state));
  if (attr) document.documentElement.setAttribute('data-theme', attr);
  else document.documentElement.removeAttribute('data-theme');
}

/**
 * Wire the three-state theme toggle for [data-theme-set] buttons.
 * Reads/writes the 'theme' localStorage key using the FOUC-compatible
 * convention: system state = key absent (removeItem), not stored as 'system'.
 * Safe to call once at boot; replaces per-game setTheme/paintTheme/wireTheme.
 */
export function wireThemeToggle(doc = document) {
  const paint = (active) => {
    doc.querySelectorAll('[data-theme-set]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === active));
    });
  };

  doc.querySelectorAll('[data-theme-set]').forEach((b) => {
    b.addEventListener('click', () => {
      const state = normalizeTheme(b.dataset.themeSet);
      if (state === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', state);
      applyTheme(state);
      paint(state);
    });
  });

  // Initial paint from stored preference.
  const saved = normalizeTheme(localStorage.getItem('theme'));
  paint(saved);
}
