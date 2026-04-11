## ADDED Requirements

### Requirement: Theme toggle dropdown supports dark mode
The system SHALL ensure the custom theme toggle dropdown menu renders correctly in dark mode.

#### Scenario: Dropdown menu in dark mode
- **WHEN** dark mode is active and theme toggle is clicked
- **THEN** the dropdown background SHALL use dark card background color
- **AND** menu items SHALL use dark theme text colors
- **AND** selected item SHALL be visually distinct

#### Scenario: Dropdown hover states in dark mode
- **WHEN** dark mode is active and user hovers over menu items
- **THEN** hover background SHALL use dark theme accent color
- **AND** text color SHALL remain readable

#### Scenario: Dropdown border in dark mode
- **WHEN** dark mode is active
- **THEN** the dropdown SHALL have appropriate border color for dark theme
