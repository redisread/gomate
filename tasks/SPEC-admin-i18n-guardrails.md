# Spec: admin-i18n-guardrails

状态：已批准（2026-08-25，用户授权连续完成全部阶段）

## Objective

把本次后台三语言修复固化为可执行门禁，阻止硬编码展示文案、无效静态翻译 key、原始枚举、旧后台季节/状态 key，以及直接展示服务端诊断文本重新进入管理员界面；通过轻量 Chromium 冒烟测试验证 `zh-CN`、`en`、`ja` 的关键后台路径。

## Tech Stack

- Node.js 内置测试运行器与文件系统 API
- 现有 JSON locale、Astro/React 源码
- Playwright Chromium 与本地隔离 D1 fixture
- 不新增依赖

## Commands

```bash
pnpm i18n:validate
node --test scripts/validate-admin-i18n.test.mjs
pnpm exec playwright test e2e/admin-platform.spec.ts --project=chromium
```

## Static Contract

扫描管理员页面、管理员组件和地点编辑管理组件，强制：

1. `AdminLayout` 的 `title` 不能使用字面量。
2. JSX 可见文本与 `aria-label`、`title`、非技术性 `placeholder` 不能硬编码自然语言。
3. 静态 `admin.*`、`enums.*` 翻译 key 必须存在于基准 locale；三语言一致性继续由现有校验负责。
4. 禁止旧 `admin.seasons.*`、`admin.statusDraft|Published|Archived`、原始角色/状态插值，以及管理员消费者使用会暴露 message 的通用 API error helper。
5. 测试文件、URL、坐标示例与业务数据不属于硬编码 UI 门禁。

## Browser Contract

- 已认证管理员可分别访问 `/admin`、`/en/admin`、`/ja/admin`。
- 每个 locale 显示对应后台标题、导航与语言切换可访问名称。
- 英文/日文后台链接保留 locale 前缀。
- 新增地点页的活动类型文案使用已批准术语。
- 页面无未处理运行时错误。

## Boundaries

- 不把门禁扩展成全站文案重写。
- 不检查或翻译地点名、地区名、标签名和用户资料。
- 不新增截图基线、浏览器矩阵、依赖、数据库或迁移。
- 静态检查必须给出文件和规则，不能静默修改文件。

## Success Criteria

- 正向仓库扫描通过，针对每条规则的负向 fixture 测试先失败后通过。
- 三语言 Chromium 冒烟测试通过并验证 locale 路径。
- `i18n:validate` 默认包含后台专项门禁。
- 长期约束写入现行前端文档，临时 spec/plan/todo 在交付前移除。

## Open Questions

无。轻量冒烟只覆盖关键路径和文案，不替代完整后台业务 E2E。
