## ADDED Requirements

### Requirement: Component file size limit

No React component file in the frontend SHALL exceed 200 lines of code, excluding import statements, type definitions, and comments.

#### Scenario: New component creation
- **WHEN** a developer creates a new component
- **THEN** the file SHALL be kept under 200 lines, or split into sub-components

#### Scenario: Existing component growth
- **WHEN** an existing component grows beyond 200 lines through modifications
- **THEN** it MUST be refactored before merging

### Requirement: Sub-component extraction pattern

Each page-level client component SHALL be organized into three layers: sub-components (pure UI), custom Hooks (state/logic), and an assembly component (<50 lines).

#### Scenario: Form page component structure
- **WHEN** a form-heavy page component exists (e.g., location-edit)
- **THEN** it SHALL have separate sub-components for each form section and a custom Hook for form state management

#### Scenario: Detail page component structure
- **WHEN** a detail page component exists (e.g., team-detail)
- **THEN** it SHALL have separate sub-components for header, member list, action bar, and status display

### Requirement: Directory organization

Extracted sub-components SHALL be organized under `frontend/src/components/features/<page-name>/` directories, and custom Hooks SHALL be placed in `frontend/src/hooks/`.

#### Scenario: Location edit sub-components
- **WHEN** location-edit-client is split
- **THEN** sub-components go in `frontend/src/components/features/location-edit/` and hooks in `frontend/src/hooks/useLocationForm.ts`

#### Scenario: Shared hooks reuse
- **WHEN** multiple components use the same logic pattern
- **THEN** the Hook SHALL be extracted to a shared file in `frontend/src/hooks/`
