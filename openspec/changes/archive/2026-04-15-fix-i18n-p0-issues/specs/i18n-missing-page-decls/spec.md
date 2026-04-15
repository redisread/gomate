## ADDED Requirements

### Requirement: All Astro pages MUST declare required i18n namespaces
Every `.astro` page file SHALL call `declareI18nNs(Astro.locals, [...])` with the list of namespaces needed by its React islands and SSR template content.

#### Scenario: Page declares namespaces for its components
- **WHEN** an Astro page renders a React island that uses `useI18n(['nav', 'content'])`
- **THEN** the page calls `declareI18nNs(Astro.locals, ['nav', 'content'])`

#### Scenario: SSR translation data includes all declared namespaces
- **WHEN** Layout.astro processes a page's declared namespaces
- **THEN** all declared namespace JSON files are fetched and included in `window.__I18N_DATA__`

### Requirement: Astro template content MUST use i18n for user-visible text
All user-visible Chinese text in `.astro` templates SHALL be replaced with `ssr.t('namespace.key')` calls. Hardcoded Chinese strings SHALL NOT appear in Astro template output.

#### Scenario: Blog page title uses i18n
- **WHEN** blog/index.astro renders the page title
- **THEN** it uses `ssr.t('blog.title')` instead of hardcoded `"博客"`

#### Scenario: Blog empty state uses i18n
- **WHEN** blog/index.astro renders with no articles
- **THEN** it uses `ssr.t('blog.noArticles')` instead of hardcoded `"暂无文章"`

### Requirement: Fixed i18n translation call pattern
Translation calls SHALL use the pattern `t('namespace.full.key.path')` with dot-separated paths. Code SHALL NOT access properties on the return value of `t()` (e.g., `(t('enums.gender') as any).male` is prohibited).

#### Scenario: Gender enum translation uses correct key path
- **WHEN** rendering gender options in profile form
- **THEN** code calls `t('enums.gender.male')` and `t('enums.gender.female')` directly

#### Scenario: Dynamic level translation uses template string
- **WHEN** rendering user level title
- **THEN** code called `t(\`enums.levelTitle.${user.level}\`)` with the correct key path format
