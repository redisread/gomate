## 1. Anti-Flash Inline Script

- [x] 1.1 In `Layout.astro`, add a `<script is:inline>` inside `<head>` that synchronously reads the `theme` cookie and sets/removes the `.dark` class on `<html>` before first paint. The script must handle `dark`, `light`, `system` (with `matchMedia`), and missing cookie cases.

## 2. Cookie-to-Store Synchronization

- [x] 2.1 In `theme-toggle.tsx`, add `initThemeFromCookie()` call inside the existing `useEffect` that already calls `initThemeSystemListener()`, ensuring the cookie value is synchronized into `themeStore` during React hydration.

## 3. Verification

- [x] 3.1 Manually test: select dark mode in ThemeToggle, refresh the page, verify no flash or black-white mixing occurs
- [x] 3.2 Manually test: select light mode, refresh, verify no flash
- [x] 3.3 Manually test: select system mode (with dark OS preference), refresh, verify correct dark rendering
- [x] 3.4 Manually test: clear localStorage but keep cookie, refresh, verify theme still correct (cookie should take precedence)
