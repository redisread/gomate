## Context

GoMate 前端使用自建的轻量级 i18n 系统，支持 zh-CN（默认）、en、ja 三种语言。翻译数据以 namespace JSON 文件存储在 `frontend/public/locales/{locale}/{ns}.json`，通过 SSR 内联数据 + 客户端按需加载的方式工作。当前存在多个 P0 级别问题影响多语言用户体验。

## Goals / Non-Goals

**Goals:**
- 修复所有已知的 i18n 翻译缺失和调用 bug
- 消除 SSR 首屏翻译缺失问题
- 建立自动化校验机制防止问题回归

**Non-Goals:**
- 不重构 i18n 架构（不迁移到 react-i18next / next-intl）
- 不处理移动端 i18n（mobile/ 目录暂不涉及）
- 不处理 P2 级别的优化项（如动态 key 类型安全、SSR 数据压缩等）

## Decisions

### 1. 缺失翻译补全策略

**决策**：以 zh-CN 为基准，为 en/ja 补全缺失 key。英文翻译采用直译，日文待后续由日语使用者审核。

**替代方案**：考虑使用机器翻译自动补全 → 拒绝，因为机翻质量不可控，可能引入更严重的翻译错误。

### 2. `t()` 调用 bug 修复

**决策**：将 `(t('enums.gender') as any).male` 改为 `t('enums.gender.male')`，与现有 i18n 系统的 `t('namespace.keyPath')` 调用方式保持一致。

**原因**：`t()` 函数设计为返回字符串，不支持返回对象。当前写法是类型绕过导致的逻辑错误。

### 3. 页面 namespace 声明补全

**决策**：在 `about.astro`、`help.astro`、`privacy.astro`、`terms.astro` 中添加 `declareI18nNs(Astro.locals, ['nav', 'content'])`。

**原因**：Layout.astro 会读取 `__i18n_namespaces` 来决定 SSR 加载哪些 namespace JSON。缺失声明导致 SSR 阶段翻译数据不可用。

### 4. blog/index.astro 的 i18n 改造

**决策**：在 blog/index.astro 中添加 `declareI18nNs` 声明，并将硬编码中文替换为 `ssr.t()` 调用（SSR 模板中）和 `t()` 调用（React 组件中）。新增 `blog` namespace。

**原因**：该页面是完全未 i18n 的页面，需要完整的 namespace 声明和翻译数据。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| en/ja 翻译质量不高 | 英文直译保持简单，日文后续人工审核；校验脚本检测空值 |
| 新增 namespace 导致 SSR 数据体积增大 | blog namespace 内容少，影响可忽略 |
| `declareI18nNs` 声明与实际组件需求不一致 | 本次修复后，CI 校验可防止未来出现遗漏 |
