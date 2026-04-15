## Why

当前项目的 i18n 系统在前端 Web 端已相对完善（3 语言、22 命名空间全覆盖），但存在两个 P0 级别的国际化缺口：

1. **API 邮件模板完全硬编码中文** — 英文/日文用户注册、重置密码、提交反馈时收到中文邮件，直接破坏非中文用户体验
2. **前端多个组件残留硬编码中文文案** — 上传组件错误提示、FAQ 帮助内容、隐私/条款页面均未接入翻译系统，切换语言后这些内容仍显示中文

这些问题在项目仅支持中文时可以接受，但既然已提供 en/ja 两种语言，用户预期所有可见文本都应随语言切换。

## What Changes

- **API 邮件模板国际化** — 将 `api/src/lib/email.ts` 中的 4 类邮件模板（密码重置、欢迎邮件、用户反馈、联系商家反馈）改为根据用户 locale 加载对应翻译文案
- **前端上传组件文案迁入翻译系统** — `cover-image-upload.tsx` 和 `multi-image-upload.tsx` 中 ~13 处硬编码错误提示和交互文案迁入 `ui.json` 命名空间
- **FAQ 帮助内容结构化翻译** — `help-client.tsx` 中 7 个 FAQ 条目的问题和答案迁入 `help.json` 命名空间（新建）
- **隐私/条款页面内容结构化翻译** — `privacy-client.tsx` 中 7 个章节的标题、正文、列表项迁入 `content.json` 命名空间

## Capabilities

### New Capabilities

- `api-email-i18n`: API 层邮件模板的多语言支持，包括 locale 检测、翻译文案加载、模板变量替换
- `frontend-hardcoded-copy-migration`: 前端组件中遗留硬编码中文文案的迁移，覆盖上传组件、FAQ、隐私/条款页面

### Modified Capabilities

<!-- 无现有 spec 需要修改 -->

## Impact

- **受影响代码**:
  - `api/src/lib/email.ts` — 邮件发送逻辑
  - `frontend/src/components/ui/cover-image-upload.tsx` — 封面图上传组件
  - `frontend/src/components/ui/multi-image-upload.tsx` — 多图上传组件
  - `frontend/src/components/features/help-client.tsx` — 帮助页面
  - `frontend/src/components/features/privacy-client.tsx` — 隐私政策页面
  - `frontend/public/locales/{zh-CN,en,ja}/ui.json` — UI 命名空间扩展
  - `frontend/public/locales/{zh-CN,en,ja}/content.json` — 内容命名空间扩展
  - 新建 `frontend/public/locales/{zh-CN,en,ja}/help.json` — FAQ 命名空间
- **受影响依赖**: 无新增依赖
- **破坏性变更**: 无
