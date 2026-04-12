## ADDED Requirements

### Requirement: CSS color-scheme Declaration
The root stylesheet SHALL declare `color-scheme` for both light and dark modes to enable browser-native adaptation of form controls, scrollbars, and other UA-styled elements.

#### Scenario: Light mode color-scheme
- **WHEN** the page is rendered in light mode (no `.dark` class on `<html>`)
- **THEN** the `:root` selector SHALL include `color-scheme: light`

#### Scenario: Dark mode color-scheme
- **WHEN** the page is rendered in dark mode (`.dark` class present on `<html>`)
- **THEN** the `.dark` selector SHALL include `color-scheme: dark`

#### Scenario: Browser scrollbar adaptation
- **WHEN** `color-scheme: dark` is active
- **THEN** the browser's native scrollbar SHALL automatically render in dark colors without additional CSS

#### Scenario: Browser form control adaptation
- **WHEN** `color-scheme: dark` is active
- **THEN** native form elements (date pickers, select dropdowns, autofill backgrounds) SHALL automatically use dark-mode UA styles
