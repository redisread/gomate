## ADDED Requirements

### Requirement: Profile page SHALL use Anthropic-style design tokens

The profile page SHALL use a defined set of CSS custom properties for colors, spacing, radii, and typography that follow the Anthropic "quiet confidence" aesthetic: warm white backgrounds, deep ink text, subtle amber accents, small border radii (6-12px), and generous whitespace.

#### Scenario: Light mode renders with warm color palette
- **WHEN** the profile page loads in light mode
- **THEN** the background uses warm white (#FAF9F5), text uses deep ink (#18181B), borders use warm gray (#E4E0D8), and interactive elements use amber accent (#D97706)

#### Scenario: Dark mode has corresponding Anthropic-style tokens
- **WHEN** the profile page loads in dark mode
- **THEN** equivalent dark mode tokens are applied: dark warm background, muted text, subdued borders, and warm amber accents

### Requirement: Profile page SHALL use two-column layout on desktop

The profile page SHALL display a left sidebar (avatar, stats, actions) and right main content area (user details, bio, equipment, experience, team lists) when viewport width is >= 1024px. On smaller screens, it SHALL collapse to a single-column stacked layout.

#### Scenario: Desktop displays two-column layout
- **WHEN** viewport width is >= 1024px
- **THEN** the page renders with a left sidebar (~280px) and right main content area filling remaining width

#### Scenario: Mobile displays single-column layout
- **WHEN** viewport width is < 1024px
- **THEN** all sections stack vertically in a single column with appropriate padding

### Requirement: Decorative elements SHALL be removed

The profile page SHALL remove all current decorative elements including: gradient banner, SVG mountain silhouettes, dot texture overlays, glow effects, and the floating avatar with emoji badge. The avatar SHALL be displayed as an 80px rounded square without decorative overlays.

#### Scenario: Page loads without decorative background
- **WHEN** the profile page renders
- **THEN** no gradient banner, SVG mountains, dot textures, or glow effects are visible

#### Scenario: Avatar displays as clean rounded square
- **WHEN** the user has an avatar image
- **THEN** it displays as an 80px rounded square (border-radius: 12px) without ring, emoji badge, or shadow overlays

### Requirement: Stats SHALL display as minimal inline values

The three stat cards (created teams, joined teams, completed hikes) SHALL display as simple numeric values with labels, without icon containers, background colors, or hover shadow effects. Numbers SHALL use light font weight (`font-light`) at large size.

#### Scenario: Stats render as minimal values
- **WHEN** stats data loads
- **THEN** three stat items display with large thin numbers and small labels, without icon backgrounds or card borders

#### Scenario: Stats with links are clickable
- **WHEN** a stat item has an associated link
- **THEN** hovering changes cursor to pointer and subtly highlights the area with background color change only

### Requirement: Team lists SHALL use lightweight list view

The created teams and joined teams sections SHALL display as lightweight list items with thin borders instead of card-style containers. Each item SHALL show team name, status badge, location, date, and member count. Hover SHALL only change background color subtly.

#### Scenario: Teams display as list items
- **WHEN** team data loads
- **THEN** teams render as bordered list items without card backgrounds, thumbnails, or shadow effects

#### Scenario: Team item hover state
- **WHEN** user hovers over a team item
- **THEN** only the background color changes subtly (e.g., `bg-stone-50`) with no position shift or shadow

### Requirement: Page elements SHALL animate with staggered fade-in

On initial page load, major sections SHALL animate in with a fade-up effect using staggered delays. The user info section loads first, stats second, and team lists last. Each section's animation duration SHALL be 500ms with cubic-bezier(0.16, 1, 0.3, 1) easing.

#### Scenario: Page loads with staggered animations
- **WHEN** the profile page finishes loading data
- **THEN** sections appear sequentially: user info (0ms delay), stats (60ms delay), team sections (120ms+ delay), each fading up from below

### Requirement: Typography SHALL follow Anthropic conventions

The profile page SHALL use refined typography: usernames and headings use `font-semibold` (not `bold`) with `tracking-tight`; section labels use uppercase with `tracking-wider` and muted color; stat numbers use `font-light` at large size.

#### Scenario: User name displays with semibold weight
- **WHEN** the profile renders
- **THEN** the user's display name uses `font-semibold` and `tracking-tight`, not `font-bold`

#### Scenario: Section headers use uppercase styling
- **WHEN** section labels render (e.g., "我发起的队伍", "统计")
- **THEN** they use `text-xs uppercase tracking-wider text-stone-500 font-medium`
