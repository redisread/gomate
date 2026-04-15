## 1. API 邮件模板国际化 — 翻译数据文件

- [x] 1.1 创建 `api/src/lib/locales/email.zh-CN.json`，包含 4 类邮件模板的中文文案（从 email.ts 现有硬编码提取）
- [x] 1.2 创建 `api/src/lib/locales/email.en.json`，包含 4 类邮件模板的英文翻译
- [x] 1.3 创建 `api/src/lib/locales/email.ja.json`，包含 4 类邮件模板的日文翻译

## 2. API 邮件模板国际化 — 引擎重构

- [x] 2.1 在 `api/src/lib/` 下创建 `email-i18n.ts` 模块：提供 `getEmailTemplate(locale, type)` 函数，从 JSON 文件加载对应模板
- [x] 2.2 重构 `sendPasswordResetEmail`：接受 `locale` 参数，使用 `getEmailTemplate` 加载 subject 和 HTML
- [x] 2.3 重构 `sendWelcomeEmail`：接受 `locale` 参数，使用 `getEmailTemplate` 加载 subject 和 HTML
- [x] 2.4 重构 `sendContactFormEmail`：接受 `locale` 参数，使用 `getEmailTemplate` 加载 subject 和 HTML
- [x] 2.5 重构 `sendFeedbackEmail`：接受 `locale` 参数，使用 `getEmailTemplate` 加载 subject 和 HTML
- [x] 2.6 在 `api/src/lib/auth.ts` 中，从请求 cookie 提取 `gomate_locale` 并传入邮件发送函数
- [x] 2.7 在 `api/src/routes/teams.ts` 中（如有调用邮件发送），传入 locale 参数

## 3. 前端上传组件文案迁移

- [x] 3.1 在 `ui.json` (zh-CN/en/ja) 中新增 `upload` 子节点，包含所有上传相关文案 key
- [x] 3.2 修改 `cover-image-upload.tsx`：引入 `useI18n(['ui'])`，替换所有硬编码中文为 `t()` 调用
- [x] 3.3 修改 `multi-image-upload.tsx`：引入 `useI18n(['ui'])`，替换所有硬编码中文为 `t()` 调用
- [x] 3.4 用 grep 验证两个上传组件中无残留硬编码中文用户可见文案

## 4. FAQ 帮助内容翻译

- [x] 4.1 在 `content.json` (zh-CN/en/ja) 的 `help` 节点下新增 `faq` 数组，包含 6 个 FAQ 条目的中文问答
- [x] 4.2 在 `content.json` (en) 的 `help` 节点下新增 `faq` 数组，包含 6 个 FAQ 条目的英文翻译
- [x] 4.3 在 `content.json` (ja) 的 `help` 节点下新增 `faq` 数组，包含 6 个 FAQ 条目的日文翻译
- [x] 4.4 修改 `help-client.tsx`：扩展 i18n 系统添加 `getNamespaceData` 方法，将 FAQ_ITEMS 改为从 i18n 加载的结构化数据
- [ ] 4.5 验证 help 页面在三种语言下正确渲染

## 5. 隐私/条款页面翻译

- [x] 5.1 在 `content.json` (zh-CN/en/ja) 中新增 `privacy` 和 `terms` 子节点，包含隐私章节和条款内容
- [x] 5.2 在 `content.json` (zh-CN/en/ja) 中新增 `terms` 子节点（如存在硬编码条款内容）
- [x] 5.3 修改 `privacy-client.tsx` 和 `terms-client.tsx`：使用 `getNsData` 从 i18n 加载结构化数据
- [ ] 5.4 验证 privacy 和 terms 页面在三种语言下正确渲染

## 6. 验证与清理

- [ ] 6.1 本地启动 API 和前端，切换语言验证所有迁移页面
- [x] 6.2 用 `pnpm type-check` 验证无 TypeScript 错误（无新增错误，pre-existing PRESET_EQUIPMENT 问题不相关）
- [ ] 6.3 用 `pnpm lint` 验证无 lint 错误
- [x] 6.4 用 grep 全量扫描 `frontend/src/components/features/{privacy,terms,help}-client.tsx` 确认硬编码中文已全部迁移至 i18n
