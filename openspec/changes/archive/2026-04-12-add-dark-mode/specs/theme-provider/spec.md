## ADDED Requirements

### Requirement: Theme context provides current theme state
The system SHALL provide a React Context that exposes the current theme state to all descendant components.

#### Scenario: Component accesses theme context
- **WHEN** a component is rendered within the ThemeProvider
- **THEN** the component SHALL be able to access the current theme value ("light", "dark", or "system")

#### Scenario: ThemeProvider wraps the application
- **WHEN** the application initializes
- **THEN** all pages and components SHALL have access to the theme context

### Requirement: Theme context provides theme setter function
The system SHALL provide a function through React Context that allows components to change the current theme.

#### Scenario: Component calls setTheme
- **WHEN** a component invokes the setTheme function with a valid theme value
- **THEN** the theme SHALL immediately update to the specified value
- **AND** all subscribed components SHALL re-render with the new theme

#### Scenario: SetTheme accepts valid values only
- **WHEN** setTheme is called with "light", "dark", or "system"
- **THEN** the theme SHALL be updated accordingly

### Requirement: ThemeProvider handles system preference
The system SHALL listen to system color scheme preference changes and apply them when theme is set to "system".

#### Scenario: System preference changes
- **WHEN** the user changes their OS color scheme preference
- **AND** the current theme is set to "system"
- **THEN** the application SHALL automatically update to match the new system preference

#### Scenario: Initial system detection
- **WHEN** the theme is set to "system" on initial load
- **THEN** the application SHALL detect and apply the current system preference
