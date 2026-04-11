## ADDED Requirements

### Requirement: Theme persists to localStorage
The system SHALL persist the theme preference to localStorage for client-side recovery.

#### Scenario: Set theme updates localStorage
- **WHEN** user sets theme to "dark"
- **THEN** localStorage SHALL contain key "theme" with value "dark"

#### Scenario: Page reload restores theme
- **GIVEN** user previously set theme to "dark"
- **WHEN** page reloads
- **THEN** the theme store SHALL restore "dark" from localStorage

### Requirement: Theme syncs to cookie
The system SHALL synchronize theme changes to a cookie for server-side access.

#### Scenario: Set theme updates cookie
- **WHEN** user sets theme to "dark"
- **THEN** document.cookie SHALL contain "theme=dark"
- **AND** the cookie SHALL have path "/"
- **AND** the cookie SHALL be persistent (1 year)

### Requirement: Cookie and localStorage consistency
The system SHALL keep cookie and localStorage in sync.

#### Scenario: Both storage mechanisms updated
- **GIVEN** theme is changed to "dark"
- **THEN** both localStorage and cookie SHALL have value "dark"
- **AND** they SHALL not contradict each other
