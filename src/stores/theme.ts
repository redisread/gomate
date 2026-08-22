export type Theme = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)theme=(light|dark|system)/);
  return match?.[1] && isTheme(match[1]) ? match[1] : null;
}

function readSystemTheme(): EffectiveTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const cookieTheme = readCookie();
  if (cookieTheme) return cookieTheme;
  const stored = window.localStorage.getItem("theme");
  return isTheme(stored) ? stored : "system";
}

export function getEffectiveTheme(): EffectiveTheme {
  const theme = getTheme();
  return theme === "system" ? readSystemTheme() : theme;
}

export function setTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `theme=${theme};path=/;max-age=${maxAge};SameSite=Lax`;
  window.localStorage.setItem("theme", theme);
  document.documentElement.classList.toggle("dark", getEffectiveTheme() === "dark");
  window.dispatchEvent(new CustomEvent("gomate:theme-change"));
}

export function initThemeSystemListener(onChange?: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () => {
    if (getTheme() === "system") {
      document.documentElement.classList.toggle("dark", getEffectiveTheme() === "dark");
      onChange?.();
    }
  };
  media.addEventListener("change", update);
  window.addEventListener("gomate:theme-change", update);
  update();
  return () => {
    media.removeEventListener("change", update);
    window.removeEventListener("gomate:theme-change", update);
  };
}
