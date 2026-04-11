## ADDED Requirements

### Requirement: Footer WeChat modal shall adapt to dark mode

The WeChat contact modal in the footer component SHALL use semantic colors for all backgrounds, text, borders, and interactive elements, ensuring readability in dark mode.

#### Scenario: WeChat modal background in dark mode
- **WHEN** the user opens the WeChat modal from the footer in dark mode
- **THEN** the modal background uses `bg-popover` or `bg-card` with dark-appropriate color
- **AND** text inside the modal uses `text-popover-foreground` or `text-foreground`

#### Scenario: WeChat modal interactive elements in dark mode
- **WHEN** the user hovers over interactive elements in the WeChat modal in dark mode
- **THEN** hover states (close button, copy button) use dark-appropriate colors

### Requirement: Share poster modal shall adapt to dark mode

The share poster modal SHALL use semantic colors for all backgrounds, text, and borders.

#### Scenario: Share poster modal in dark mode
- **WHEN** the user opens the share poster modal in dark mode
- **THEN** the modal container, title, preview area, and copy button are all readable with dark-appropriate colors

### Requirement: Season picker shall adapt to dark mode

The season picker component SHALL replace hardcoded `gray-*` colors with semantic equivalents.

#### Scenario: Season picker in dark mode
- **WHEN** the user views a season picker dropdown in dark mode
- **THEN** options, borders, and selected state are readable against dark backgrounds

### Requirement: Profile shared component shall adapt to dark mode

The profile-shared shared component cards SHALL use semantic colors for backgrounds, borders, icons, and text.

#### Scenario: Profile cards in dark mode
- **WHEN** profile cards rendered via profile-shared are displayed in dark mode
- **THEN** card backgrounds, borders, chevron icons, and text labels are all readable
