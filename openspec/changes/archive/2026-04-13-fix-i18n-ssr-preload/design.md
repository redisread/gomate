## Context

当前 i18n 系统在 SSR 阶段通过 `Layout.astro` 加载翻译数据并内联到 `window.__I18N_DATA__`，但 namespace 列表仅包含 `"content"`（硬编码）加上 `Astro.locals.__i18n_namespaces`（由页面通过 `declareI18nNs` 声明）。没有任何页面调用了 `declareI18nNs`，因此 SSR 只加载了 `content.json`。

客户端 Island 组件通过 `useI18n(["ns1", "ns2"])` 在 `useEffect` 中异步加载 namespace，但 `useEffect` 在 hydration 后才执行，导致首屏渲染时翻译缓存为空，`t()` 返回翻译 key 本身并打印 `Missing translation key` 警告。

**约束**：
- `middleware.ts` 已提供 `declareI18nNs(locals, nsList)` 函数，无需新增 API
- Layout.astro 已正确读取 `__i18n_namespaces` 并通过 `loadLocaleData` 加载
- 翻译文件路径：`public/locales/{locale}/{ns}.json`

## Goals / Non-Goals

**Goals:**
- SSR 阶段预加载所有页面所需的翻译 namespace，消除首屏翻译缺失警告
- 页面级声明 + 全局自动注入相结合，降低维护成本
- 不改变现有 `useI18n` hook 或 `t()` 函数的签名和行为

**Non-Goals:**
- 不修改翻译文件内容（`*.json`）
- 不重构 i18n 加载架构
- 不引入新的 i18n 库或机制

## Decisions

### 决策 1：Layout.astro 自动注入全局 namespace

`nav` 和 `common` 被几乎所有页面使用（Navbar 和 Footer 是全局组件），在 Layout.astro 中硬编码注入这两个 namespace，避免每个页面重复声明。

**理由**：Navbar 和 Footer 在 Layout.astro 中渲染，所有页面共享。如果让每个页面单独声明，遗漏风险高且维护成本大。

### 决策 2：每个 Astro 页面在 frontmatter 中声明额外 namespace

除 `nav` 和 `common` 外，各页面根据自身使用的 Island 组件声明额外 namespace。

**理由**：
- 不同页面使用的 namespace 差异较大（如首页用 `home`，队伍页用 `teams`）
- 全局注入所有 namespace 会拖慢 SSR 首字节时间
- 页面级声明确保精确加载，按需而为

### 决策 3：namespace 合并去重

Layout.astro 中将全局 namespace 与页面声明的 namespace 合并后去重，再执行 `loadLocaleData`。

**理由**：避免重复加载同一 namespace（如页面也声明了 `nav`），减少不必要的 fetch。

### 页面 → Namespace 映射

| 页面 | 所需 namespace |
|------|---------------|
| `index.astro` | `home`, `locations`, `teams`, `common` |
| `about.astro` | `content` |
| `contact.astro` | `feedback`, `nav` |
| `feedback.astro` | `feedback`, `nav` |
| `favorites/index.astro` | `favorites`, `common`, `nav` |
| `forgot-password.astro` | `auth`, `common` |
| `help.astro` | `content`, `nav` |
| `login.astro` | `auth` |
| `register.astro` | `auth` |
| `reset-password.astro` | `auth`, `common` |
| `privacy.astro` | `content`, `nav` |
| `terms.astro` | `content`, `nav` |
| `locations/index.astro` | `locations`, `common`, `filter` |
| `locations/[id].astro` | `locationDetail`, `locations`, `common`, `errors`, `admin`, `nav`, `enums` |
| `teams/index.astro` | `teams`, `filter`, `common` |
| `teams/[id].astro` | `teams`, `common`, `profile` |
| `teams/create.astro` | `teams`, `errors`, `common` |
| `teams/[id]/edit.astro` | `teams`, `errors`, `common` |
| `my-teams/index.astro` | `myTeams`, `teams`, `common` |
| `profile/index.astro` | `profile`, `common` |
| `profile/edit.astro` | `profile`, `common`, `errors`, `enums` |
| `users/[id].astro` | `userDetail`, `profile`, `common`, `enums`, `errors` |
| `blog/index.astro` | `content` |
| `blog/[slug].astro` | `content`, `share`, `common`, `nav` |
| `admin/locations/[id]/edit.astro` | `admin`, `common`, `pois`, `ui` |

> `content` namespace 已在 Layout.astro 中自动添加（第38行），无需页面重复声明。
> `nav` 和 `common` 将在 Layout.astro 中自动注入，无需页面重复声明。

## Risks / Trade-offs

- **[风险]** 新增页面忘记声明 namespace → **缓解**：在 CLAUDE.md 中记录规范；首屏出现翻译缺失告警可在开发阶段被发现
- **[风险]** 全局自动注入的 namespace 列表膨胀 → **缓解**：仅限 `nav` 和 `common`（Navbar/Footer 专用），新增全局组件时评估是否加入
- **[取舍]** 页面级声明需要手动维护 → 接受，因为 namespace 数量有限且变化频率低
