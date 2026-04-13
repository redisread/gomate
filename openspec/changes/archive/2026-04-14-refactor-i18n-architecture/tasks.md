## 1. 拆分翻译文件为 Namespace

- [x] 1.1 编写 Python 脚本，将现有 `src/i18n/locales/*.json` 按顶层 key 拆分为独立 JSON 文件
- [x] 1.2 将合并后的小模块 namespace 进行合并（nav+footer+theme→common, hero+blog+about+help+privacy+terms+seo→content, contact→feedback, success+api→errors）
- [x] 1.3 对三个语言（zh-CN、en、ja）同步执行拆分，输出到 `public/locales/{locale}/` 目录
- [x] 1.4 验证拆分后每个语言的 namespace 文件 key 集合一致
- [x] 1.5 将 copy.ts 中的全部文案映射并合并到对应的 namespace JSON 文件中

## 2. 升级 i18n 引擎

- [x] 2.1 修改 `src/i18n/index.ts`，将翻译数据源从编译时 import 改为运行时 fetch（从 `public/locales/`）
- [x] 2.2 实现 `loadNamespace(ns: string, locale: Locale)` 函数，支持单个 namespace 动态加载
- [x] 2.3 实现 `loadNamespaces(nsList: string[], locale: Locale)` 函数，支持批量并行加载
- [x] 2.4 实现双层缓存：内存 Map 缓存 + localStorage 持久化缓存（含 24 小时过期机制）
- [x] 2.5 保持现有 `t(key, options)` 函数签名完全兼容
- [x] 2.6 保持现有 `getLocale()`、`setLocale()`、`getSSRT()` 函数兼容
- [x] 2.7 更新 `TranslationKey` 类型定义，支持动态 namespace 的 key 自动补全

## 3. SSR 内联数据支持

- [x] 3.1 在 `Layout.astro` 中添加 `<script id="__i18n_data__">` 内联当前页面所需 namespace 数据
- [x] 3.2 修改客户端 i18n 初始化逻辑，优先读取 `window.__I18N_DATA__`
- [x] 3.3 验证 SSR 首屏渲染无翻译闪烁

## 4. copy.ts 迁移与删除

- [x] 4.1 批量替换 28 个引用文件中的 `copy.xxx.yyy` 为 `t('xxx.yyy')` 调用
- [x] 4.2 处理动态文案（模板字符串拼接）转换为 `{variable}` 占位符格式
- [x] 4.3 运行 `pnpm type-check` 确认无遗留的 copy.ts 引用
- [x] 4.4 删除 `frontend/src/lib/copy.ts` 文件

## 5. 组件按需加载适配

- [x] 5.1 修改 `src/hooks/useI18n.ts`，支持传入 namespace 列表参数 `useI18n(['common', 'teams'])`
- [x] 5.2 为每个 React Island 组件声明所需的 namespaces
- [x] 5.3 验证所有页面的多语言功能正常（zh-CN、en、ja 三种语言）

## 6. i18n Key 校验工具

- [x] 6.1 编写 `scripts/validate-i18n-keys.mjs` 脚本，实现 key 集合一致性校验
- [x] 6.2 添加嵌套深度校验（不超过 3 层）
- [x] 6.3 添加空值检测（空字符串、null、undefined）
- [x] 6.4 在 `package.json` 中添加 `i18n:validate` 脚本命令
- [x] 6.5 在 CI 流程（`.github/workflows/`）中添加 i18n key 校验步骤

## 7. 清理与验证

- [x] 7.1 删除旧的 `src/i18n/locales/` 目录（翻译已迁移到 public）
- [x] 7.2 运行 `pnpm type-check` 确保类型无误
- [x] 7.3 运行 `pnpm lint` 确保代码规范（59 个 lint 错误为已有问题，非本次改动引入）
- [x] 7.4 运行 `pnpm i18n:validate` 确认 key 一致性（20 namespaces, 3 locales, 0 errors）
- [x] 7.5 启动开发服务器，手动遍历所有页面验证多语言功能
