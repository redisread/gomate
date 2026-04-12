## ADDED Requirements

### Requirement: Semantic Color Variable Usage
All React components in the frontend SHALL use Tailwind semantic color classes (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, etc.) instead of hardcoded `dark:stone-*` or `dark:gray-*` color classes for dark mode styling.

#### Scenario: Background color adaptation
- **WHEN** a component needs a background color that changes between light and dark modes
- **THEN** it SHALL use `bg-background`, `bg-card`, `bg-secondary`, or `bg-accent` instead of hardcoded `bg-stone-50 dark:bg-stone-900` or `bg-white dark:bg-stone-800`

#### Scenario: Text color adaptation
- **WHEN** a component needs text color that changes between light and dark modes
- **THEN** it SHALL use `text-foreground`, `text-muted-foreground`, `text-secondary-foreground`, or `text-brand` instead of hardcoded `text-stone-700 dark:text-stone-300` or `text-stone-900 dark:text-stone-100`

#### Scenario: Border color adaptation
- **WHEN** a component needs border color that changes between light and dark modes
- **THEN** it SHALL use `border-border` or `border-input` instead of hardcoded `border-stone-200 dark:border-stone-700`

#### Scenario: Destructive color adaptation
- **WHEN** a component displays destructive/error state colors
- **THEN** it SHALL use `text-destructive`, `bg-destructive/10`, `border-destructive/20` etc. instead of hardcoded `text-red-600 dark:text-red-400`

### Requirement: Inline Style Dark Mode Support
No inline `style` prop in React components SHALL contain hardcoded color or shadow values that differ between light and dark modes. Such values SHALL be expressed via CSS variables or Tailwind classes instead.

#### Scenario: Box shadow adaptation
- **WHEN** a component applies box-shadow via inline style
- **THEN** it SHALL reference CSS variables like `var(--shadow-card)` or `var(--shadow-card-hover)` instead of hardcoded `rgba()` values

#### Scenario: Dynamic style based on theme
- **WHEN** a component needs to conditionally style based on the current theme
- **THEN** it SHALL use `useStore(effectiveThemeStore)` from nanostores to determine the current effective theme and apply styles conditionally

### Requirement: Unified Theme State Source
Components SHALL use `effectiveThemeStore` from `@/stores/theme` as the single source of truth for theme state, rather than implementing custom DOM-based theme detection.

#### Scenario: Theme state access
- **WHEN** a component needs to know the current effective theme (light or dark)
- **THEN** it SHALL use `useStore(effectiveThemeStore)` from nanostores instead of observing `document.documentElement.classList`

### Requirement: No Duplicate DOM Updates
The theme store module SHALL update `document.documentElement.classList` exactly once per theme change, via the `effectiveThemeStore` subscription only. The `themeStore` subscription SHALL only handle cookie synchronization.

#### Scenario: Theme change propagation
- **WHEN** the user selects a new theme preference
- **THEN** `document.documentElement.classList` is toggled exactly once based on the resolved effective theme value
