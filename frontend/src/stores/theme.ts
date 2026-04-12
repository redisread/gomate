import { atom, computed } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

export type Theme = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

// Storage configuration for localStorage
const storageConfig = {
  encode: (value: Theme) => value,
  decode: (value: string): Theme => {
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return "system";
  },
};

// Synchronously read theme from cookie, sync to localStorage, and return it.
// This ensures the cookie always takes priority over any stale localStorage value.
const getInitialTheme = (): Theme => {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/theme=(light|dark|system)/);
  const cookieTheme: Theme = match ? (match[1] as Theme) : "system";
  // Always write cookie value to localStorage so persistentAtom picks it up
  // and overrides any stale value from a previous session.
  window.localStorage.setItem("theme", cookieTheme);
  return cookieTheme;
};

// Persistent theme store with localStorage, initialized from cookie
export const themeStore = persistentAtom<Theme>("theme", getInitialTheme(), storageConfig);

// Track system preference — initialize at module load time
const getInitialSystemPreference = (): EffectiveTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const systemPreferenceStore = atom<EffectiveTheme>(getInitialSystemPreference());

// Register system preference change listener at module load time
if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e: MediaQueryListEvent) => {
    systemPreferenceStore.set(e.matches ? "dark" : "light");
  });
}

// Derived store: effective theme (resolved system to actual light/dark)
export const effectiveThemeStore = computed(
  [themeStore, systemPreferenceStore],
  (theme, systemPref) => {
    if (theme === "system") {
      return systemPref;
    }
    return theme;
  }
);

// Cookie helper functions
const setThemeCookie = (theme: Theme) => {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `theme=${theme};path=/;expires=${expires.toUTCString()};SameSite=Lax`;
};

// Subscribe to theme changes and sync to cookie
// DOM class updates are handled by effectiveThemeStore.subscribe below
themeStore.subscribe((theme) => {
  if (typeof window !== "undefined" && window.localStorage.getItem("theme") !== null) {
    setThemeCookie(theme);
  }
});

// Subscribe to effective theme changes
effectiveThemeStore.subscribe((effective) => {
  if (typeof document !== "undefined") {
    if (effective === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
});

// Deprecated: system preference listener is now registered at module load time.
// Kept for backward compatibility — no longer does anything.
export function initThemeSystemListener() {
  // No-op: listener already registered at module load time
}

// Set theme function
export function setTheme(theme: Theme) {
  themeStore.set(theme);
}

// Get current theme
export function getTheme(): Theme {
  return themeStore.get();
}

// Get effective theme
export function getEffectiveTheme(): EffectiveTheme {
  return effectiveThemeStore.get();
}
