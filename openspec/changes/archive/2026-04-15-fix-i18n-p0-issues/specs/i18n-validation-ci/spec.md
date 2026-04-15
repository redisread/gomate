## ADDED Requirements

### Requirement: i18n key consistency validation
The build system SHALL run i18n key consistency validation before each build. All locales (zh-CN, en, ja) MUST have identical translation keys per namespace. Missing keys in any locale SHALL cause the build to fail with exit code 1.

#### Scenario: Build fails when translation keys are inconsistent
- **WHEN** a namespace has keys in zh-CN that are missing in en or ja
- **THEN** the build fails and reports the exact missing keys per locale

#### Scenario: Build passes when all locales have matching keys
- **WHEN** all namespace files across zh-CN, en, ja have identical key sets
- **THEN** the validation passes with exit code 0

### Requirement: i18n empty value detection
The validation SHALL detect empty strings, null, and undefined values in translation JSON files. Any empty value SHALL be reported as a warning.

#### Scenario: Warning raised for empty translation values
- **WHEN** a translation JSON file contains a key with value `""`, `null`, or missing value
- **THEN** the validation reports a warning with the key path and locale

### Requirement: CI integration for i18n validation
The CI pipeline SHALL include i18n key validation as a required check. PRs with failing i18n validation SHALL not be mergeable.

#### Scenario: CI blocks merge on i18n validation failure
- **WHEN** a PR introduces i18n key inconsistencies
- **THEN** the CI check fails and blocks the merge until fixed
