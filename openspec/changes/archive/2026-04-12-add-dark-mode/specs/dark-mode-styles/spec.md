## ADDED Requirements

### Requirement: Tailwind CSS configured for dark mode
The system SHALL configure Tailwind CSS to support dark mode using the class strategy.

#### Scenario: Dark class is applied to html element
- **WHEN** the "dark" class is added to the html element
- **THEN** all components with `dark:` prefix variants SHALL render with dark mode styles

#### Scenario: Light mode is default
- **WHEN** no "dark" class is present on the html element
- **THEN** all components SHALL render with light mode styles

### Requirement: Global background colors support dark mode
The system SHALL ensure the page background and content areas display appropriate colors in both light and dark modes.

#### Scenario: Dark mode background
- **WHEN** dark mode is active
- **THEN** the page background SHALL use `bg-slate-950`
- **AND** content cards SHALL use `bg-slate-900`

#### Scenario: Light mode background
- **WHEN** light mode is active
- **THEN** the page background SHALL use `bg-white` or `bg-gray-50`
- **AND** content cards SHALL use `bg-white`

### Requirement: Text colors support dark mode
The system SHALL ensure text is readable in both light and dark modes with appropriate contrast.

#### Scenario: Dark mode text
- **WHEN** dark mode is active
- **THEN** primary text SHALL use `text-slate-50`
- **AND** secondary text SHALL use `text-slate-400`
- **AND** muted text SHALL use `text-slate-500`

#### Scenario: Light mode text
- **WHEN** light mode is active
- **THEN** primary text SHALL use `text-slate-900`
- **AND** secondary text SHALL use `text-slate-600`
- **AND** muted text SHALL use `text-slate-500`

### Requirement: Border colors support dark mode
The system SHALL ensure borders are visible and appropriately styled in both modes.

#### Scenario: Dark mode borders
- **WHEN** dark mode is active
- **THEN** borders SHALL use `border-slate-800`
- **AND** hover states SHALL use `border-slate-700`

#### Scenario: Light mode borders
- **WHEN** light mode is active
- **THEN** borders SHALL use `border-slate-200`
- **AND** hover states SHALL use `border-slate-300`

### Requirement: shadcn/ui components render correctly in dark mode
The system SHALL ensure all shadcn/ui components display proper dark mode styling.

#### Scenario: Button component in dark mode
- **WHEN** dark mode is active
- **THEN** Button components SHALL display with appropriate dark variants
- **AND** all button variants (default, destructive, outline, etc.) SHALL be visible

#### Scenario: Card component in dark mode
- **WHEN** dark mode is active
- **THEN** Card components SHALL display with dark background and border colors

#### Scenario: Input component in dark mode
- **WHEN** dark mode is active
- **THEN** Input components SHALL display with dark background and appropriate text color
- **AND** focus states SHALL be visible

#### Scenario: Navigation menu in dark mode
- **WHEN** dark mode is active
- **THEN** the navbar SHALL display with dark background
- **AND** navigation links SHALL be readable

### Requirement: Custom components support dark mode
The system SHALL ensure all custom application components display proper dark mode styling.

#### Scenario: Location cards in dark mode
- **WHEN** dark mode is active
- **THEN** location cards SHALL display with dark backgrounds
- **AND** location images SHALL have appropriate overlays if needed

#### Scenario: Team cards in dark mode
- **WHEN** dark mode is active
- **THEN** team cards SHALL display with dark backgrounds
- **AND** status badges SHALL remain readable
