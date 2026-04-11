## ADDED Requirements

### Requirement: All feature pages shall render with semantic colors in dark mode

All feature page components SHALL use semantic CSS variables (via Tailwind utility classes) for backgrounds, text, and borders instead of hardcoded color values, ensuring correct rendering in both light and dark modes.

#### Scenario: Page background adapts to dark mode
- **WHEN** the user switches to dark mode
- **THEN** page backgrounds using `bg-muted` or `bg-background` display dark-appropriate colors
- **AND** page backgrounds using `bg-card` display dark card colors

#### Scenario: Text remains readable in dark mode
- **WHEN** the user views any feature page in dark mode
- **THEN** primary text using `text-foreground` remains readable against dark backgrounds
- **AND** secondary text using `text-muted-foreground` maintains sufficient contrast

#### Scenario: Borders remain visible in dark mode
- **WHEN** the user views any component with borders in dark mode
- **THEN** borders using `border-border` are visible against dark backgrounds

#### Scenario: Light mode appearance is unchanged
- **WHEN** the user views any feature page in light mode
- **THEN** all semantic colors render identically to the previous hardcoded colors

### Requirement: Skeleton loaders shall be visible in dark mode

Skeleton loading placeholders SHALL use `bg-muted` with `animate-pulse` instead of hardcoded `bg-stone-200`, ensuring visibility in both light and dark modes.

#### Scenario: Skeleton visible in dark mode
- **WHEN** a page is loading and skeleton placeholders are displayed in dark mode
- **THEN** skeleton elements are visible as lighter shapes against dark backgrounds

### Requirement: Affected components shall pass dark mode visual verification

Each of the following 14 feature components SHALL render correctly in dark mode with no unreadable text or invisible elements:

- `teams-client.tsx`
- `team-detail-partiful.tsx`
- `my-teams-client.tsx`
- `location-detail-main-content.tsx`
- `home-client.tsx`
- `favorites-client.tsx`
- `terms-client.tsx`
- `share-poster-modal.tsx`
- `create-team-client.tsx`
- `profile-client.tsx`
- `contact-client.tsx`
- `login-client.tsx`
- `register-client.tsx`
- `forgot-password-client.tsx`

#### Scenario: Teams list page dark mode
- **WHEN** the user navigates to the teams list page in dark mode
- **THEN** team cards, status badges, filters, and empty states are all readable

#### Scenario: Team detail page dark mode
- **WHEN** the user views a team detail page in dark mode
- **THEN** all sections (header, members, status, actions) are readable with proper contrast

#### Scenario: Location detail page dark mode
- **WHEN** the user views a location detail page in dark mode
- **THEN** all content sections, images info, and action buttons are readable

#### Scenario: Home page dark mode
- **WHEN** the user views the home page in dark mode
- **THEN** hero section, feature cards, and all text elements are readable
