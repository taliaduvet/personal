import { state } from '../state.js';
import { IS_MOM_APP } from '../config/app-profile.js';

/** Mom fork default — charcoal minimal, not couples coral. */
const MOM_DEFAULT_ACCENT = '#2d3748';

export function applyThemeColors() {
  const root = document.documentElement;
  if (state.buttonColor) {
    root.style.setProperty('--accent-button', state.buttonColor);
    root.style.setProperty('--header-accent', state.buttonColor);
  } else if (IS_MOM_APP) {
    root.style.setProperty('--accent-button', MOM_DEFAULT_ACCENT);
    root.style.setProperty('--header-accent', MOM_DEFAULT_ACCENT);
  } else {
    root.style.removeProperty('--accent-button');
    root.style.removeProperty('--header-accent');
  }
  if (state.textColor) root.style.setProperty('--accent-text', state.textColor);
  else root.style.removeProperty('--accent-text');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', state.buttonColor || (IS_MOM_APP ? '#f7f8fa' : '#e07a5f'));
  }
}
