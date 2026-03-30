import { state } from '../state.js';

export function applyThemeColors() {
  const root = document.documentElement;
  if (state.buttonColor) {
    root.style.setProperty('--accent-button', state.buttonColor);
    root.style.setProperty('--header-accent', state.buttonColor);
  } else {
    root.style.removeProperty('--accent-button');
    root.style.removeProperty('--header-accent');
  }
  if (state.textColor) root.style.setProperty('--accent-text', state.textColor);
  else root.style.removeProperty('--accent-text');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', state.buttonColor || '#e07a5f');
}
