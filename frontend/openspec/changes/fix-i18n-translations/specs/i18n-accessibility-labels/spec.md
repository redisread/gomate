## ADDED Requirements

### Requirement: aria-label attributes are translated
All `aria-label` attributes in React components SHALL use translated strings from locale files, enabling screen readers to announce labels in the user's language.

#### Scenario: language switcher aria-label is translated
- **WHEN** the language switcher component renders with ja locale
- **THEN** its `aria-label` contains Japanese text instead of "切换语言"

#### Scenario: navigation aria-label is translated
- **WHEN** the navbar component renders with en locale
- **THEN** `aria-label="主导航"` is replaced to `"Main navigation"` or equivalent

### Requirement: placeholder attributes are translated
All `placeholder` attributes on input elements SHALL use translated strings from locale files.

#### Scenario: search input placeholder is translated
- **WHEN** a search input renders with en locale
- **THEN** the placeholder text is in English, not Chinese

### Requirement: alt text on images is translated
All `alt` attributes on images that contain descriptive text SHALL use translated strings from locale files.

#### Scenario: cover image alt text is translated
- **WHEN** an image component renders with ja locale
- **THEN** its `alt` attribute contains Japanese descriptive text
