## Purpose

Defines requirements for eliminating hardcoded text from React components and routing all user-visible text through the i18n system.

## Requirements

### Requirement: All JSX visible text uses i18n
No React component file (.tsx) SHALL contain hardcoded Chinese characters in JSX text content. All user-visible text MUST be retrieved through the `t()` function from `useI18n()`.

#### Scenario: component displays translated text
- **WHEN** a component renders user-visible text
- **THEN** the text is obtained via `t('namespace.key')` where the key exists in locale files for all 3 languages

### Requirement: Error and status messages use i18n
All error messages, loading states, and status indicators displayed to users SHALL be stored in locale files and accessed through `t()`.

#### Scenario: upload error message is translated
- **WHEN** a file upload fails and an error message is shown
- **THEN** the message comes from `t('ui.uploadFailed')` or equivalent, not a hardcoded string

### Requirement: Default and fallback texts use i18n
Default titles, descriptions, and placeholder content for empty states SHALL be stored in locale files.

#### Scenario: empty state shows translated message
- **WHEN** a list has no items and displays an empty state
- **THEN** the empty state title and description come from locale file keys

### Requirement: Long text components are internationalized
Terms of service, privacy policy, and FAQ content SHALL be stored in locale files as structured arrays with title and body for each language.

#### Scenario: terms page shows translated content
- **WHEN** the terms page is rendered in English
- **THEN** all section headings and paragraph content are in English, sourced from locale files

### Requirement: Component constants are internationalized
Constants like season names, equipment types, and city labels used in components SHALL be loaded from locale files rather than hardcoded.

#### Scenario: season picker shows translated season names
- **WHEN** the season picker component renders
- **THEN** season labels ("春季"/"夏季"/"秋季"/"冬季") are replaced with translations from `locations.json` or equivalent
