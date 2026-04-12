## ADDED Requirements

### Requirement: SSR-to-client theme class consistency
The system SHALL ensure that the `.dark` CSS class on `<html>` is set correctly during the initial page render, before any client-side JavaScript hydration occurs, based on the `theme` cookie value.

#### Scenario: Cookie is "dark"
- **WHEN** the user has a `theme=dark` cookie and loads or refreshes any page
- **THEN** the `<html>` element has the `dark` class from the initial SSR render and it is not removed during hydration

#### Scenario: Cookie is "light"
- **WHEN** the user has a `theme=light` cookie and loads or refreshes any page
- **THEN** the `<html>` element does not have the `dark` class from the initial SSR render and it is not added during hydration

#### Scenario: Cookie is "system" with dark system preference
- **WHEN** the user has a `theme=system` cookie and their OS prefers dark mode
- **THEN** the `<html>` element has the `dark` class from the initial render

#### Scenario: Cookie is "system" with light system preference
- **WHEN** the user has a `theme=system` cookie and their OS prefers light mode
- **THEN** the `<html>` element does not have the `dark` class from the initial render

#### Scenario: No theme cookie exists
- **WHEN** the user has no `theme` cookie on first visit
- **THEN** the `<html>` element defaults to no `dark` class (light mode) until client-side hydration resolves the theme

### Requirement: Cookie-to-store synchronization on hydration
The system SHALL synchronize the `theme` cookie value into the client-side `themeStore` during React hydration, ensuring the nanostores state matches the SSR-rendered theme.

#### Scenario: Cookie differs from localStorage
- **WHEN** the `theme` cookie value differs from the value stored in localStorage
- **THEN** the cookie value takes precedence and `themeStore` is updated to match the cookie

#### Scenario: Cookie exists, localStorage is empty
- **WHEN** the `theme` cookie exists but localStorage has no `theme` key
- **THEN** `themeStore` is initialized from the cookie value instead of the `"system"` default

#### Scenario: Both cookie and localStorage are missing
- **WHEN** neither the `theme` cookie nor localStorage has a theme value
- **THEN** `themeStore` falls back to `"system"` and the system preference is used

### Requirement: Anti-flash inline script
The system SHALL include a blocking inline script in the `<head>` of every page that reads the `theme` cookie and sets the `.dark` class on `<html>` synchronously before the first paint.

#### Scenario: Script executes before first paint
- **WHEN** the browser parses the `<head>` of the HTML document
- **THEN** the inline script runs synchronously and sets the correct `.dark` class before any CSS is applied

#### Scenario: Script handles all valid cookie values
- **WHEN** the inline script runs with `theme=dark`, `theme=light`, or `theme=system`
- **THEN** it correctly adds, removes, or conditionally sets the `.dark` class based on the cookie value and system preference
