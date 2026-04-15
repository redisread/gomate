## Why

当前 i18n 系统存在多个 P0 级别问题，直接导致英文/日文用户看到 untranslated key、性别选项显示为空白、以及多个页面 SSR 首屏翻译缺失。这些问题已通过 `pnpm i18n:validate` 验证失败确认，影响用户体验和翻译质量保障。

## What Changes

- 补全 `en/teams` 和 `ja/teams` 缺失的翻译 key（`approveUserJoined`, `rejectUserCannotJoin`）
- 修复 `profile-form-fields.tsx` 中 `(t('enums.gender') as any).male` 的翻译调用 bug，改为 `t('enums.gender.male')`
- 为 `about.astro`、`help.astro`、`privacy.astro`、`terms.astro` 四个页面添加缺失的 `declareI18nNs` 声明
- 修复 `blog/index.astro` 页面中的硬编码中文，改为使用 i18n 翻译

## Capabilities

### New Capabilities
- `i18n-validation-ci`: 将 i18n key 校验脚本集成到 CI 流程，确保翻译一致性在 PR 阶段被拦截
- `i18n-missing-page-decls`: 规范化页面 namespace 声明机制，消除 SSR 首屏翻译缺失问题

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- 受影响文件：`frontend/public/locales/en/teams.json`、`frontend/public/locales/ja/teams.json`、`frontend/src/components/features/profile-edit/profile-form-fields.tsx`、`frontend/src/pages/{about,help,privacy,terms,blog/index}.astro`
- 受影响系统：CI 流程（新增校验步骤）
- 无 Breaking Change，仅修复已有功能的 bug 和补全缺失翻译
