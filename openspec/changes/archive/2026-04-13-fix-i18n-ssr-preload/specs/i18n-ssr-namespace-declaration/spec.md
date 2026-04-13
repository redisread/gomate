## ADDED Requirements

### Requirement: SSR 全局 namespace 自动注入

Layout.astro 必须在 SSR 翻译数据加载阶段，自动将 `nav` 和 `common` 两个 namespace 加入加载列表，无需各个页面显式声明。这两个 namespace 被 Navbar 和 Footer 全局组件使用，所有页面共享。

#### Scenario: 页面未声明任何 namespace

- **WHEN** 某 Astro 页面 frontmatter 未调用 `declareI18nNs`
- **THEN** SSR 仍应加载 `nav`、`common` 和 `content` 三个 namespace
- **THEN** 页面内联 `window.__I18N_DATA__` 中应包含这三个 namespace 的翻译数据

#### Scenario: 页面声明了额外 namespace

- **WHEN** 页面通过 `declareI18nNs` 声明了 `['teams', 'filter']`
- **THEN** SSR 应加载 `nav`、`common`、`content`、`teams`、`filter` 五个 namespace
- **THEN** 重复的 namespace 应被去重，不重复 fetch

### Requirement: 页面级 namespace 声明

Astro 页面应在 frontmatter 中调用 `declareI18nNs(Astro.locals, nsList)` 声明该页面所需的全部翻译 namespace（不含 `nav`、`common`、`content`），以便 SSR 阶段预加载。

#### Scenario: 首页声明 namespace

- **WHEN** `index.astro` 渲染
- **THEN** 应声明 `['home', 'locations', 'teams']` namespace
- **THEN** 结合全局注入，SSR 最终加载 `nav`、`common`、`content`、`home`、`locations`、`teams`

#### Scenario: 队伍列表页声明 namespace

- **WHEN** `teams/index.astro` 渲染
- **THEN** 应声明 `['teams', 'filter']` namespace

#### Scenario: 地点详情页声明 namespace

- **WHEN** `locations/[id].astro` 渲染
- **THEN** 应声明 `['locationDetail', 'locations', 'errors', 'admin', 'enums']` namespace

### Requirement: 首屏翻译不缺失

对于 SSR 渲染的页面内容（包括 Layout.astro 中 Navbar 和 Footer 的 SSR 部分），在首屏渲染时必须能从 SSR 内联数据中获取翻译，不能显示翻译 key 或触发 `Missing translation key` 警告。

#### Scenario: Navbar SSR 渲染

- **WHEN** 用户首次访问任意页面
- **THEN** Navbar 中 `t("nav.home")`、`t("nav.locations")` 等调用应返回中文文案
- **THEN** 控制台不应出现 `[i18n] Missing translation key` 警告

#### Scenario: Footer SSR 渲染

- **WHEN** 用户首次访问任意页面
- **THEN** Footer 中 `t("common.explore")`、`t("common.support")` 等调用应返回中文文案
- **THEN** 控制台不应出现 `[i18n] Missing translation key` 警告
