/**
 * Reading preferences, held in localStorage and exposed as an external store.
 *
 * This exists as a store rather than a useEffect because the preferences really
 * are external state: a small bootstrap script in the document head applies
 * them before React ever runs, so that a reader who chose the dark ground is
 * not flashed a bright one on every navigation. React then subscribes to the
 * same source instead of racing it.
 */

export type Theme = "system" | "light" | "dark";

export type ReadingPrefs = {
  size: string;
  leading: string;
  theme: Theme;
};

export const READING_DEFAULTS: ReadingPrefs = {
  size: "17px",
  leading: "1.65",
  theme: "system",
};

const STORAGE_KEY = "subtext.reading";

const listeners = new Set<() => void>();

/** getSnapshot must be referentially stable between changes or React will loop. */
let cachedRaw: string | null = null;
let cachedValue: ReadingPrefs = READING_DEFAULTS;

export function subscribeToReadingPrefs(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getReadingPrefs(): ReadingPrefs {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;

  if (!raw) {
    cachedValue = READING_DEFAULTS;
    return cachedValue;
  }

  try {
    cachedValue = { ...READING_DEFAULTS, ...(JSON.parse(raw) as Partial<ReadingPrefs>) };
  } catch {
    cachedValue = READING_DEFAULTS;
  }
  return cachedValue;
}

/** The server has no localStorage, so it renders the defaults and hydrates cleanly. */
export function getReadingPrefsOnServer(): ReadingPrefs {
  return READING_DEFAULTS;
}

export function applyReadingPrefs(prefs: ReadingPrefs): void {
  const root = document.documentElement;
  root.style.setProperty("--reader-size", prefs.size);
  root.style.setProperty("--reader-leading", prefs.leading);
  if (prefs.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", prefs.theme);
}

export function setReadingPrefs(patch: Partial<ReadingPrefs>): void {
  const next = { ...getReadingPrefs(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing blocks writes. The change still applies for this visit,
    // which matters more than remembering it.
  }
  applyReadingPrefs(next);
  for (const listener of listeners) listener();
}
