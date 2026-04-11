## ADDED Requirements

### Requirement: Server reads theme from cookie
The system SHALL read the theme preference from cookies on the server and apply the appropriate class to the HTML element.

#### Scenario: User has dark theme cookie
- **GIVEN** the request contains cookie "theme=dark"
- **WHEN** Layout.astro renders
- **THEN** the HTML element SHALL have class "dark"

#### Scenario: User has light theme cookie
- **GIVEN** the request contains cookie "theme=light"
- **WHEN** Layout.astro renders
- **THEN** the HTML element SHALL NOT have class "dark"

#### Scenario: User has system theme cookie
- **GIVEN** the request contains cookie "theme=system"
- **AND** system prefers dark mode
- **WHEN** Layout.astro renders
- **THEN** the HTML element SHALL have class "dark"

### Requirement: Server handles missing cookie
The system SHALL handle requests without theme cookie gracefully.

#### Scenario: No theme cookie
- **GIVEN** the request has no theme cookie
- **WHEN** Layout.astro renders
- **THEN** the HTML element SHALL default to light (or system preference)
- **AND** no error SHALL occur

### Requirement: No inline script needed
The system SHALL NOT require inline scripts to set initial theme.

#### Scenario: JavaScript disabled
- **GIVEN** JavaScript is disabled in the browser
- **WHEN** the page loads
- **THEN** the correct theme SHALL still be applied
- **AND** the page SHALL be readable
