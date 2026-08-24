# Spec: admin-copy-experience

状态：已批准（2026-08-25，用户授权连续完成全部阶段）

## Objective

全面修复管理员可见触点的中文、英文和日文展示，使 `/admin/*`、公共导航快速录入、403 页面及地点完整编辑流程只显示自然本地化文案；后台提供可发现、可键盘操作的语言切换入口。该模块消费 `admin-i18n-contract`，不重新设计 API、数据库或业务内容。

## Tech Stack

- Astro 5 SSR 页面与布局
- React 19 islands、现有 `useI18n` 与 `LocaleToggle`
- `public/locales/{zh-CN,en,ja}` JSON namespaces
- Vitest、Testing Library 与 Playwright
- 不新增依赖

## Commands

```bash
pnpm i18n:build
pnpm i18n:gen-types
pnpm i18n:validate
pnpm vitest run --config vitest.config.ts src/components/admin/admin-management.test.tsx src/components/admin/admin-navigation.test.tsx src/components/features/location-edit-client.test.tsx
pnpm type-check
pnpm lint
pnpm test
pnpm test:server
pnpm build
```

## Project Structure

- `src/layouts/AdminLayout.astro`：后台语言切换入口与 namespace 装载。
- `src/pages/admin/**`：本地化页面标题和说明。
- `src/components/admin/**`：用户、标签、地点和快速草稿的枚举与错误展示。
- `src/components/features/location-*/**`：地点完整编辑中的季节预览与语义文案。
- `public/locales/*/admin.json`、`enums.json`：三语言产品文案。
- `src/lib/admin-i18n.ts`：唯一安全展示边界。

## Code Style

```ts
const payload = await response.json().catch(() => null);
const errorKey = adminActionErrorKey(payload);
setError(t(errorKey ?? "admin.management.saveFailed"));
```

管理员组件不得从异常 `message` 或响应 `error.message` 取展示文案。枚举值先通过穷尽 key 映射，再调用 `t()`。

## Testing Strategy

- 单元测试验证未知服务端 message 只能落入本地化 fallback。
- 组件测试验证用户角色/状态、地点状态和季节不再渲染原始标识。
- Astro/E2E 验证三语言页面标题、后台语言切换和关键导航路径。
- locale 校验与类型检查验证 key 一致性与有效性。

## Boundaries

### Always

- 覆盖全部管理员路由、快速录入、403 与后台地点编辑。
- 使用已批准术语表，并修正“地点类型”为“适合的活动类型”。
- 保留地点名、地区名、标签名、昵称等业务内容原文。
- 保持键盘、移动端、可访问名称与 reduced-motion 行为。

### Ask First

- 新增 locale、依赖或翻译平台。
- 改变后台信息架构、权限或 API envelope。
- 扩展到无关公共页面的全面文案重写。

### Never

- 渲染服务端 message 或原始枚举标识。
- 在服务端按 locale 生成错误 message。
- 修改数据库、迁移或生产数据。
- 手工编辑生成的 i18n 文件。

## Success Criteria

- 新增/编辑页标题、用户角色/状态、地点状态和季节预览均本地化。
- 后台桌面和移动布局可切换 `zh-CN`、`en`、`ja`，切换后保留当前管理员路径。
- 所有管理员操作失败使用已知 reason 或本地化操作 fallback，服务端 message 不可见。
- 三语言术语自然一致，日文不再中日混写。
- 聚焦组件测试、三语言浏览器验收及全量门禁通过。

## Open Questions

无。现有业务内容保持原文，未知错误使用操作级 fallback。
