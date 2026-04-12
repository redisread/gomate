## ADDED Requirements

### Requirement: Theme store initializes from cookie synchronously

The `themeStore` SHALL read the theme value from `document.cookie` at module load time, using it as the default value for `persistentAtom`. If no cookie is found, the default SHALL fall back to `"system"`.

#### Scenario: Cookie contains "dark"
- **WHEN** the `theme.ts` module loads and `document.cookie` contains `theme=dark`
- **THEN** `themeStore.get()` returns `"dark"` before any React component renders

#### Scenario: Cookie contains "light"
- **WHEN** the `theme.ts` module loads and `document.cookie` contains `theme=light`
- **THEN** `themeStore.get()` returns `"light"` before any React component renders

#### Scenario: Cookie contains "system"
- **WHEN** the `theme.ts` module loads and `document.cookie` contains `theme=system`
- **THEN** `themeStore.get()` returns `"system"` before any React component renders

#### Scenario: No theme cookie exists
- **WHEN** the `theme.ts` module loads and no theme cookie is present in `document.cookie`
- **THEN** `themeStore.get()` returns `"system"` as the default

#### Scenario: SSR build environment
- **WHEN** the `theme.ts` module loads in an SSR context where `document` is undefined
- **THEN** `themeStore` defaults to `"system"` without throwing errors

### Requirement: Redundant cookie initialization is removed from theme-toggle

The `initThemeFromCookie()` function SHALL NOT be called in `theme-toggle.tsx`'s `useEffect`, since cookie synchronization is now handled at module load time in `theme.ts`.

#### Scenario: Theme toggle mounts
- **WHEN** the `ThemeToggle` component mounts
- **THEN** it does NOT call `initThemeFromCookie()` again
- **AND** `initThemeSystemListener()` is still called to track system preference changes
