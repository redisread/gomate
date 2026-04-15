## ADDED Requirements

### Requirement: Astro page titles are translated
All Astro page files (.astro) SHALL use the SSR `t()` function to provide the `title` prop to the Layout component. No page SHALL hardcode Chinese characters in the title prop.

#### Scenario: page title changes with locale
- **WHEN** a user switches locale from zh-CN to en
- **THEN** the HTML `<title>` tag reflects the English translation (e.g., "Explore Locations - GoMate" instead of "探索地点 - GoMate")

### Requirement: SEO metadata is translated
SEO meta description and og:title tags SHALL be translated based on the current locale.

#### Scenario: SEO meta tags use translated content
- **WHEN** the page is rendered with ja locale
- **THEN** `<meta name="description">` and `<meta property="og:title">` contain Japanese text

### Requirement: Layout component supports dynamic titles
The `Layout.astro` component SHALL accept a translated title string and pass it through to the HTML `<title>` and SEO meta tags.

#### Scenario: Layout renders translated title
- **WHEN** Layout receives `title="探索地点 - GoMate"` from SSR translation
- **THEN** the rendered HTML contains `<title>探索地点 - GoMate</title>` for zh-CN and the equivalent for other locales
