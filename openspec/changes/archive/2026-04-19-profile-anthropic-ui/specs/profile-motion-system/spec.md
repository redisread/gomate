## ADDED Requirements

### Requirement: Staggered fade-up animation SHALL be defined

A `fade-up` keyframe animation SHALL be defined in the global stylesheet that transitions elements from `opacity: 0; translateY(12px)` to `opacity: 1; translateY(0)` over 500ms with `cubic-bezier(0.16, 1, 0.3, 1)` easing.

#### Scenario: Animation keyframes are available
- **WHEN** a component uses the `fade-up` animation class
- **THEN** the element animates from invisible + 12px below to its final position over 500ms

### Requirement: Stagger delay utility classes SHALL be available

Utility classes `.stagger-1` through `.stagger-5` SHALL be defined, applying animation delays from 0ms to 240ms in 60ms increments. These classes SHALL be composable with the `fade-up` animation.

#### Scenario: Staggered elements appear sequentially
- **WHEN** multiple elements each have a `stagger-N` class combined with `fade-up`
- **THEN** they appear one after another with 60ms intervals between each

### Requirement: Hover micro-interactions SHALL be subtle

Interactive elements (team list items, stat links) SHALL use subtle hover effects limited to: background color change, text color shift, and border color change. No `transform: translate`, no shadow changes, no scale effects on hover.

#### Scenario: Team list item hover
- **WHEN** user hovers over a team list item
- **THEN** only the background color changes to `bg-stone-50` with no movement or shadow

#### Scenario: Stat link hover
- **WHEN** user hovers over a clickable stat item
- **THEN** only the background color changes subtly with no position shift
