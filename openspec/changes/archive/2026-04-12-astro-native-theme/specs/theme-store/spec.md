## ADDED Requirements

### Requirement: Theme store supports three modes
The system SHALL provide a nanostores atom that manages theme state with three possible values: "light", "dark", or "system".

#### Scenario: Initialize theme store
- **WHEN** the application loads
- **THEN** the theme store SHALL read the persisted value
- **AND** default to "system" if no value exists

#### Scenario: Set theme to specific value
- **WHEN** calling `themeStore.set('dark')`
- **THEN** the store value SHALL update to "dark"
- **AND** all subscribers SHALL be notified

#### Scenario: Subscribe to theme changes
- **GIVEN** a component subscribes to themeStore
- **WHEN** the theme value changes
- **THEN** the component SHALL receive the new value

### Requirement: Theme store provides derived state
The system SHALL provide a way to determine the effective theme (resolved "system" to actual light/dark).

#### Scenario: System preference is dark
- **GIVEN** theme is set to "system"
- **WHEN** system prefers dark mode
- **THEN** the effective theme SHALL be "dark"

#### Scenario: System preference is light
- **GIVEN** theme is set to "system"
- **WHEN** system prefers light mode
- **THEN** the effective theme SHALL be "light"
