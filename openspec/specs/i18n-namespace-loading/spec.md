## ADDED Requirements

### Requirement: Namespace 文件结构
翻译文件 SHALL 按 namespace 拆分，存放在 `public/locales/{locale}/` 目录下，每个 namespace 为一个独立的 JSON 文件。文件命名使用 kebab-case（如 `my-teams.json`、`location-detail.json`）。每个 JSON 文件的 key 结构为最多 3 层嵌套的点号路径。

#### Scenario: 正确的文件路径
- **WHEN** 系统需要加载 `zh-CN` 语言的 `teams` namespace
- **THEN** 系统请求 `/locales/zh-CN/teams.json`

#### Scenario: 文件 key 结构一致性
- **WHEN** 比较 `zh-CN/teams.json` 和 `en/teams.json`
- **THEN** 两个文件的 JSON key 路径集合完全相同，仅值不同

### Requirement: 按需加载
系统 SHALL 支持按 namespace 按需加载翻译数据，仅获取当前组件所需的 namespace，而非全量加载所有翻译。加载通过运行时 `fetch()` 实现，翻译文件 SHALL 不进入 JS bundle。

#### Scenario: 组件声明所需 namespace
- **WHEN** 组件调用 `useI18n(['common', 'teams'])`
- **THEN** 系统仅加载 `common.json` 和 `teams.json` 两个文件

#### Scenario: 避免重复加载
- **WHEN** 同一页面中多个组件都请求 `common` namespace
- **THEN** `common.json` 仅被 fetch 一次

### Requirement: 双层缓存
系统 SHALL 实现内存缓存（Map）和持久化缓存（localStorage）双层缓存机制。内存缓存用于页面内重复调用，localStorage 用于跨页面复用。localStorage 中的缓存条目 SHALL 包含 `expiresAt` 字段，默认过期时间为 24 小时。

#### Scenario: 内存缓存命中
- **WHEN** 组件第二次调用 `useI18n(['common'])`
- **THEN** 系统直接从内存 Map 返回数据，不发起任何网络请求

#### Scenario: localStorage 缓存命中
- **WHEN** 用户导航到新页面，内存缓存已清空，但 localStorage 中有未过期的 `common` 缓存
- **THEN** 系统从 localStorage 读取数据并恢复到内存缓存，不发起网络请求

#### Scenario: 缓存过期后重新 fetch
- **WHEN** localStorage 中 `common` 缓存的 `expiresAt` 已过期
- **THEN** 系统发起新的 fetch 请求，并更新两层缓存

### Requirement: 语言回退链
当某个 namespace 在当前语言的翻译文件中缺失时，系统 SHALL 按照预定义的回退链依次尝试：`ja → en → zh-CN`。如果所有回退语言都缺失该 key，系统 SHALL 返回 key 字符串本身，并在开发模式下输出控制台告警。

#### Scenario: 日语回退到英语
- **WHEN** 用户使用 `ja` 语言，请求的 key 在 `ja.json` 中不存在但在 `en.json` 中存在
- **THEN** 系统返回 `en.json` 中的对应值

#### Scenario: 所有语言都缺失
- **WHEN** 请求的 key 在 `ja`、`en`、`zh-CN` 中均不存在
- **THEN** 系统返回 key 字符串本身，并在 DEV 模式输出 `[i18n] Missing translation key` 告警

### Requirement: SSR 内联数据
SSR 渲染时，系统 SHALL 将当前页面所需的 namespace 数据内联到 HTML 的 `<script id="__i18n_data__">` 标签中。客户端 hydration 时 SHALL 优先读取该内联数据，避免首屏翻译闪烁。

#### Scenario: SSR 内联翻译数据
- **WHEN** Astro 服务端渲染 `/teams` 页面（使用 `zh-CN` 语言）
- **THEN** HTML 中包含 `<script id="__i18n_data__">` 标签，内含 `common`、`teams`、`enums` namespace 的 JSON 数据

#### Scenario: 客户端读取内联数据
- **WHEN** 客户端 hydration 时检测到 `window.__I18N_DATA__`
- **THEN** 系统直接使用内联数据初始化翻译缓存，不发起重复 fetch

### Requirement: 变量替换
翻译值中 SHALL 支持 `{variable}` 格式的占位符替换，变量值通过 `vars` 参数传入。占位符名称 SHALL 为合法标识符（字母、数字、下划线）。

#### Scenario: 单变量替换
- **WHEN** 翻译值为 `"有 {count} 支队伍"`，传入 `{ vars: { count: 5 } }`
- **THEN** 返回 `"有 5 支队伍"`

#### Scenario: 多变量替换
- **WHEN** 翻译值为 `"已有 {current} 位，还差 {remaining} 人"`，传入 `{ vars: { current: 3, remaining: 2 } }`
- **THEN** 返回 `"已有 3 位，还差 2 人"`

### Requirement: Namespace 预加载
系统 SHALL 提供 `loadNamespaces(nsList, locale)` 函数，支持在组件挂载前预批量加载多个 namespace。该函数返回 Promise，在所有请求完成后 resolve。

#### Scenario: 批量预加载
- **WHEN** 页面调用 `await loadNamespaces(['common', 'teams', 'enums'], 'zh-CN')`
- **THEN** 系统并行 fetch 三个 JSON 文件，全部完成后 resolve
