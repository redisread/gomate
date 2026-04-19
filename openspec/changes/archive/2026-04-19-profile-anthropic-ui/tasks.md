## 1. Design Tokens & Global Styles

- [x] 1.1 Add Anthropic CSS custom properties (colors, radii, spacing) to `frontend/src/app.css` with light and dark mode support
- [x] 1.2 Add `fade-up` keyframe animation and `.stagger-1` through `.stagger-5` utility classes to `frontend/src/app.css`

## 2. Profile Page Structure Refactor

- [x] 2.1 Replace the banner + floating avatar layout with a clean two-column layout (`grid lg:grid-cols-[280px_1fr]`)
- [x] 2.2 Redesign avatar: remove banner background, ring, emoji badge, and shadow; use 80px rounded square with `border-radius: 12px`
- [x] 2.3 Move level badge from avatar corner to the user info section next to display name
- [x] 2.4 Relocate edit/logout buttons to the sidebar below avatar
- [x] 2.5 Apply Anthropic typography conventions: `font-semibold tracking-tight` for display name, `font-light` for stat numbers, `uppercase tracking-wider` for section labels

## 3. Stats Section Redesign

- [x] 3.1 Remove `StatCard` component's icon containers, background colors, and hover shadow effects
- [x] 3.2 Restyle stat values to use `text-3xl font-light` with minimal labels
- [x] 3.3 Replace hover `-translate-y-1 + shadow-lg` with subtle `bg-stone-50` background change only

## 4. Team Lists Redesign

- [x] 4.1 Replace card-style team items with lightweight bordered list items
- [x] 4.2 Remove location cover image thumbnails from team list items
- [x] 4.3 Replace hover `-translate-y-0.5 + shadow-lg` with subtle `hover:bg-stone-50` only
- [x] 4.4 Keep all data fields: team name, status badge, location, date, member count

## 5. Badge & Info Section Restyle

- [x] 5.1 Restyle badge row (level, gender, birthday, hikes) with smaller, more compact pills
- [x] 5.2 Restyle bio section with subtle separator border
- [x] 5.3 Restyle equipment tags and experience text with Anthropic-style muted colors

## 6. Staggered Animation Integration

- [x] 6.1 Add `animate-fade-up stagger-N` classes to major sections: user info card, stats row, created teams section, joined teams section, empty state
- [x] 6.2 Ensure animations only trigger on initial load (not on re-renders)

## 7. Skeleton Loading State Update

- [x] 7.1 Update skeleton loading state to match new two-column layout structure
- [x] 7.2 Replace banner skeleton with simple avatar + text placeholder blocks

## 8. Verification

- [x] 8.1 Verify all i18n keys still render correctly in both zh-CN, en, and ja locales
- [x] 8.2 Verify dark mode renders correctly with Anthropic tokens
- [x] 8.3 Verify responsive layout at sm, md, lg, and xl breakpoints
- [x] 8.4 Run `pnpm type-check` and `pnpm lint` to ensure no regressions
