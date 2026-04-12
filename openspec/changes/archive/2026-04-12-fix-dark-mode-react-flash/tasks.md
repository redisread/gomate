## 1. Modify theme store initialization

- [x] 1.1 Add `getInitialTheme()` helper function in `theme.ts` that reads from `document.cookie` at module load time, returning `"system"` as fallback for SSR or missing cookie
- [x] 1.2 Change `themeStore` initialization to use `getInitialTheme()` as the default value instead of hardcoded `"system"`

## 2. Remove redundant cookie initialization

- [x] 2.1 Remove `initThemeFromCookie()` call from `theme-toggle.tsx` useEffect
- [x] 2.2 Verify `initThemeSystemListener()` is still called in the same useEffect

## 3. Fix system preference listener timing

- [x] 3.1 Move `systemPreferenceStore` initialization to module load time with dedicated `getInitialSystemPreference()` helper
- [x] 3.2 Register `matchMedia("prefers-color-scheme: dark")` change listener at module load time instead of in `theme-toggle.tsx` useEffect
- [x] 3.3 Make `initThemeSystemListener()` a no-op (backward compatible)

## 4. Fix SSR body background color (critical — root cause of white flash)

- [x] 4.1 Add explicit `bg-[#12100d]` (dark) or `bg-[#faf8f5]` (light) background color to `<body>` in `Layout.astro` based on SSR theme cookie
- [x] 4.2 Ensure `dark` class is also set on `<body>` when SSR detects dark theme, so `.dark` CSS rules apply before React hydration
