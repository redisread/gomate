## Context

首页 `HomeClient` 组件内部直接渲染了 `<Footer />`，同时 `Layout.astro` 模板在 `<slot />` 之后也默认渲染 `<Footer client:load />`（`showFooter` 默认值为 `true`）。这导致首页最终输出两个 Footer。

其他页面（如 `/locations/[id].astro`、`/teams/create.astro` 等）都通过 Layout 渲染 Footer，行为正常。

## Goals / Non-Goals

**Goals:**
- 消除首页重复的 Footer
- 保持 Footer 渲染逻辑统一由 Layout 管理

**Non-Goals:**
- 不修改 Footer 组件本身
- 不修改其他页面的 Footer 行为

## Decisions

**从 `HomeClient` 移除 Footer，由 Layout 统一渲染**

理由：Footer 是全局布局元素，不应由页面组件自行决定是否渲染。Layout 已经通过 `showFooter` prop 提供了控制能力，这是正确的关注点分离方式。

备选方案：在 `index.astro` 中传 `showFooter={false}`，保留 `HomeClient` 内的 Footer。此方案使首页 Footer 渲染逻辑与其他页面不一致，增加维护负担。

## Risks / Trade-offs

无显著风险。这是纯粹的组件树结构调整，不涉及数据流或状态变更。
