## ADDED Requirements

### Requirement: Theme toggle is visible in navigation bar
The system SHALL display a theme toggle button in the navigation bar that is accessible from all pages.

#### Scenario: User visits any page
- **WHEN** any page of the application loads
- **THEN** the theme toggle button SHALL be visible in the navigation bar

#### Scenario: Toggle is positioned correctly
- **WHEN** the navigation bar renders
- **THEN** the theme toggle SHALL be positioned to the left of the user avatar/menu

### Requirement: Theme toggle displays current theme icon
The system SHALL display an appropriate icon representing the current theme state.

#### Scenario: Light theme active
- **WHEN** the current theme is "light"
- **THEN** the toggle SHALL display a sun icon

#### Scenario: Dark theme active
- **WHEN** the current theme is "dark"
- **THEN** the toggle SHALL display a moon icon

#### Scenario: System theme active
- **WHEN** the current theme is "system"
- **THEN** the toggle SHALL display a monitor icon (or system preference indicator)

### Requirement: Theme toggle opens selection menu
The system SHALL display a dropdown menu when the theme toggle is clicked, allowing selection of light, dark, or system theme.

#### Scenario: User clicks theme toggle
- **WHEN** the user clicks the theme toggle button
- **THEN** a dropdown menu SHALL appear with three options: "浅色", "深色", "跟随系统"

#### Scenario: User selects a theme option
- **WHEN** the user clicks on a theme option in the dropdown
- **THEN** the theme SHALL immediately change to the selected value
- **AND** the dropdown menu SHALL close

### Requirement: Theme toggle has hover and focus states
The system SHALL provide visual feedback when the user interacts with the theme toggle.

#### Scenario: User hovers over toggle
- **WHEN** the user hovers over the theme toggle button
- **THEN** the button SHALL display a hover state (background color change)

#### Scenario: User focuses toggle via keyboard
- **WHEN** the user navigates to the theme toggle via keyboard
- **THEN** the button SHALL display a visible focus indicator
