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

// Persistent theme store with localStorage
export const themeStore = persistentAtom<Theme>("theme", "system", storageConfig);

// Track system preference
const systemPreferenceStore = atom<EffectiveTheme>(
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
);

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

const getThemeCookie = (): Theme | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/theme=(light|dark|system)/);
  return match ? (match[1] as Theme) : null;
};

// Subscribe to theme changes and sync to cookie + html class
themeStore.subscribe((theme) => {
  // Sync to cookie
  setThemeCookie(theme);

  // Update html class immediately
  if (typeof document !== "undefined") {
    const effective =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    if (effective === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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

// Initialize system preference listener (client-side only)
export function initThemeSystemListener() {
  if (typeof window === "undefined") return;

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (e: MediaQueryListEvent) => {
    systemPreferenceStore.set(e.matches ? "dark" : "light");
  };

  mediaQuery.addEventListener("change", handleChange);

  // Set initial value
  systemPreferenceStore.set(mediaQuery.matches ? "dark" : "light");
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

// Initialize from cookie (for SSR hydration consistency)
export function initThemeFromCookie() {
  if (typeof document === "undefined") return;
  const cookieTheme = getThemeCookie();
  if (cookieTheme) {
    themeStore.set(cookieTheme);
  }
}
