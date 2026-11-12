export const THEME_MODE_STORAGE_KEY = 'theme-mode';
export const DARK_VARIANT_STORAGE_KEY = 'dark-variant';
export const THEME_CLASSES = [
  'theme-light-green',
  'theme-dark-blue',
  'theme-dark-amber',
  'theme-dark-teal',
];
export const DEFAULT_THEME_MODE = 'dark';
export const DEFAULT_DARK_VARIANT = 'amber';

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing can reject storage; the DOM classes still apply.
  }
}

export function readThemeMode() {
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE;

  const stored = safeGet(THEME_MODE_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME_MODE;
}

export function readDarkVariant() {
  if (typeof window === 'undefined') return DEFAULT_DARK_VARIANT;

  // One-time migration from the previous `app-variant` class token.
  if (!safeGet(THEME_MODE_STORAGE_KEY)) {
    const legacy = safeGet('app-variant');
    if (legacy === 'theme-teal' && !safeGet(DARK_VARIANT_STORAGE_KEY)) {
      safeSet(DARK_VARIANT_STORAGE_KEY, 'teal');
    }
    if (legacy) safeSet('app-variant', '');
  }

  const stored = safeGet(DARK_VARIANT_STORAGE_KEY);
  return stored === 'teal' ? 'teal' : DEFAULT_DARK_VARIANT;
}

/**
 * Applies the master mode plus the selected dark flavor to the document root.
 *
 * Light mode uses `.theme-light-green` only. Dark mode uses `.dark` (for the
 * Tailwind `dark:` variant) and one of `.theme-dark-amber` / `.theme-dark-teal`.
 */
export function applyActiveTheme() {
  if (typeof document === 'undefined') {
    return { mode: DEFAULT_THEME_MODE, variant: DEFAULT_DARK_VARIANT };
  }

  const mode = readThemeMode();
  const variant = readDarkVariant();
  const root = document.documentElement;

  root.classList.remove(...THEME_CLASSES, 'dark');

  if (mode === 'light') {
    root.classList.add('theme-light-green');
  } else {
    root.classList.add('dark');
    root.classList.add(variant === 'teal' ? 'theme-dark-teal' : 'theme-dark-amber');
  }

  root.style.colorScheme = mode === 'light' ? 'light' : 'dark';

  safeSet(THEME_MODE_STORAGE_KEY, mode);
  safeSet(DARK_VARIANT_STORAGE_KEY, variant);

  return { mode, variant };
}

export function toggleThemeMode() {
  const currentMode = readThemeMode();
  const nextMode = currentMode === 'dark' ? 'light' : 'dark';

  safeSet(THEME_MODE_STORAGE_KEY, nextMode);
  applyActiveTheme();

  return nextMode;
}

/**
 * Persists the preferred dark flavor. If the current mode is dark, the palette
 * repaints immediately; otherwise it is applied the next time dark mode is
 * selected.
 */
export function setDarkVariantPreference(chosenValue) {
  const next = chosenValue === 'teal' ? 'teal' : 'amber';

  safeSet(DARK_VARIANT_STORAGE_KEY, next);

  if (readThemeMode() === 'dark') {
    applyActiveTheme();
  }

  return next;
}
