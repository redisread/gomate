## 1. Setup Dependencies

- [x] 1.1 Install nanostores packages: `nanostores`, `@nanostores/persistent`, `@nanostores/react`
- [x] 1.2 Verify packages are added to frontend/package.json

## 2. Create Theme Store

- [x] 2.1 Create `frontend/src/stores/theme.ts` with nanostores atom for theme state
- [x] 2.2 Implement three theme modes: "light", "dark", "system"
- [x] 2.3 Add localStorage persistence using `@nanostores/persistent`
- [x] 2.4 Add cookie synchronization (set cookie when theme changes)
- [x] 2.5 Add derived store for effective theme (resolve "system" to actual light/dark)
- [x] 2.6 Add system preference listener for "system" mode

## 3. Update Layout.astro for SSR

- [x] 3.1 Read theme cookie from `Astro.cookies` in server-side code
- [x] 3.2 Set `html` class based on cookie value ("dark" or "")
- [x] 3.3 Handle "system" mode by checking system preference on server (default to light)
- [x] 3.4 Handle missing cookie gracefully (default to system/light)
- [x] 3.5 Remove inline script that sets theme from localStorage
- [x] 3.6 Remove `suppressHydrationWarning` attribute

## 4. Refactor ThemeToggle Component

- [x] 4.1 Replace `useTheme` from next-themes with nanostores theme store
- [x] 4.2 Update theme switch logic to use `themeStore.set()`
- [x] 4.3 Ensure component subscribes to store changes
- [x] 4.4 Test all three modes: light, dark, system

## 5. Remove ThemeProvider

- [x] 5.1 Remove `ThemeProvider` wrapper from Layout.astro
- [x] 5.2 Keep Navbar and other components as `client:load` islands
- [x] 5.3 Update navbar.tsx to remove ThemeProvider dependency if any
- [x] 5.4 Delete `frontend/src/components/theme-provider.tsx`

## 6. Cleanup Dependencies

- [x] 6.1 Uninstall `next-themes` from frontend
- [x] 6.2 Run pnpm install to update lockfile
- [x] 6.3 Verify no next-themes imports remain in codebase

## 7. Testing & Verification

- [x] 7.1 Test theme switching: light → dark → system → light
- [x] 7.2 Test persistence: set theme, reload page, verify theme persists
- [x] 7.3 Test SSR: view page source, verify html class is set server-side
- [x] 7.4 Test cookie sync: verify cookie updates when theme changes
- [x] 7.5 Test system mode: change OS theme, verify page updates
- [x] 7.6 Test no JavaScript: verify page is still readable with JS disabled
- [x] 7.7 Test all pages: home, locations, teams, profile, etc.
