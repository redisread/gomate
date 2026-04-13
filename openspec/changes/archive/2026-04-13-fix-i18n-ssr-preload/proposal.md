## Why

当前所有 Astro 页面在 SSR 阶段没有通过 `declareI18nNs` 声明所需的翻译 namespace，导致 `nav.json`、`common.json`、`feedback.json` 等翻译文件不会被预加载到 SSR 内联数据中。客户端 hydration 后 Island 组件通过 `useEffect` 异步加载 namespace，在翻译到达前的首次渲染中 `t()` 调用找不到缓存值，触发大量 `[i18n] Missing translation key` 警告，且用户会短暂看到翻译 key 而非实际文案。

## What Changes

- 在每个 Astro 页面的 frontmatter 中调用 `declareI18nNs`，声明该页面及子组件所需的 namespace
- Layout.astro 中自动注入 `nav` 和 `common` 两个全局 namespace（所有页面共用）
- 确保 SSR 预加载覆盖所有页面使用的 namespace，消除首屏翻译缺失

## Capabilities

### New Capabilities

- `i18n-ssr-namespace-declaration`: 页面级 namespace 声明机制，确保 SSR 阶段预加载正确的翻译文件

### Modified Capabilities

（无）

## Impact

- 受影响文件：所有 Astro 页面文件（`frontend/src/pages/**/*.astro`）、`Layout.astro`
- 受影响的 middleware：`middleware.ts` 中 `declareI18nNs` 函数将被首次使用
- 不影响运行时逻辑、API 或数据库结构
