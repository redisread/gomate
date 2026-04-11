## ADDED Requirements

### Requirement: Brand gradient buttons shall adapt to dark mode

All CTA buttons using the brand amber/gold gradient (`#D97706 → #F59E0B`) SHALL use a softer gradient in dark mode with reduced saturation and brightness.

#### Scenario: Login/register buttons in dark mode
- **WHEN** the user views the login or register page in dark mode
- **THEN** the primary CTA button gradient shifts to darker amber tones (`#92400E → #B45309` range)

#### Scenario: Create team button in dark mode
- **WHEN** the user views the create team page in dark mode
- **THEN** the submit button gradient uses dark-appropriate amber tones

#### Scenario: Contact form button in dark mode
- **WHEN** the user views the contact page in dark mode
- **THEN** the submit button gradient uses dark-appropriate amber tones

### Requirement: Page header gradients shall adapt to dark mode

Decorative header gradients on profile and other pages SHALL use darker, less saturated colors in dark mode.

#### Scenario: Profile header in dark mode
- **WHEN** the user views their profile page in dark mode
- **THEN** the header background gradient uses darker tones that blend with the dark background

### Requirement: Functional gradients shall adapt to dark mode

Season indicator gradients (orange→red, emerald→amber) and skeleton gradients SHALL adjust for dark mode.

#### Scenario: Location season badge in dark mode
- **WHEN** the user views location detail page in dark mode
- **THEN** season indicator gradients (orange→red for warm, emerald→amber for all seasons) remain visible and distinct

#### Scenario: Skeleton gradient elements in dark mode
- **WHEN** profile header skeleton is displayed in dark mode
- **THEN** skeleton gradient elements are visible as subtle shapes against dark backgrounds

### Requirement: Radial gradient decorations shall adapt to dark mode

Decorative radial gradients on authentication pages (login, register, forgot password) SHALL adjust opacity or color for dark mode.

#### Scenario: Auth page decorations in dark mode
- **WHEN** the user views login, register, or forgot password pages in dark mode
- **THEN** decorative radial gradient circles use dark-appropriate opacity and colors
