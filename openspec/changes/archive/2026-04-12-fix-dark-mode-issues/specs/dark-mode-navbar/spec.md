## ADDED Requirements

### Requirement: Navigation bar supports dark mode
The system SHALL ensure the navigation bar renders correctly in dark mode, including all interactive elements.

#### Scenario: Desktop navigation in dark mode
- **WHEN** dark mode is active
- **THEN** the navbar background SHALL use the dark theme glass effect
- **AND** navigation links SHALL be readable with appropriate contrast
- **AND** hover states SHALL use dark theme colors

#### Scenario: Mobile drawer in dark mode
- **WHEN** dark mode is active and mobile menu is opened
- **THEN** the drawer background SHALL use dark theme colors
- **AND** all menu items SHALL be readable
- **AND** borders SHALL use dark theme border colors

#### Scenario: User dropdown in dark mode
- **WHEN** dark mode is active and user menu is opened
- **THEN** the dropdown background SHALL use dark theme colors
- **AND** menu items SHALL have appropriate hover states

### Requirement: No hardcoded colors in navbar
The system SHALL replace all hardcoded color values in the navbar with CSS variables or dark: variants.

#### Scenario: Inspect navbar styles
- **WHEN** inspecting the navbar in dark mode
- **THEN** no hardcoded hex colors like #8f7f6e, #1e1812 SHALL be present in the rendered styles
- **AND** all colors SHALL come from CSS variables or Tailwind dark: utilities
