## Why

P0 级 i18n 变更（`fix-i18n-p0-gaps`）已归档，邮件模板和主要组件文案已完成迁移。但在代码审查中发现仍有多个 P1/P2 级国际化缺口：

1. **日文邮件模板翻译错误** — `email.ja.json` welcome 模板的 `feature3` 字段含有未翻译的中文字符（"ハイキング爱好者"、"出发"），非中文用户收到含中文的邮件
2. **SeasonPicker 组件硬编码** — 季节标签（春季/夏季/秋季/冬季）和月份（3-5月等）仍硬编码在组件内部，同时 `locations.seasons` 和 `admin.seasons` 两处定义同一概念导致命名空间不一致
3. **多处用户可见硬编码中文** — 错误提示（地图加载失败、上传失败、POI 编辑失败等）、aria-label（显示/隐藏密码）、相对时间（"刚刚"）等未接入翻译系统
4. **英文邮件模板格式错误** — `greeting` 字段 `"Hello{name},"` 缺少空格，应为 `"Hello {name},"`
5. **已归档变更中的未完成任务** — tasks.md 中 4.5/5.4/6.1/6.3 验证项未完成

这些问题在项目仅服务中文用户时可以接受，但既然已提供 en/ja 语言选项，所有用户可见文本都应随语言切换。

## What Changes

- 修复日文邮件模板 `feature3` 翻译错误，替换残留中文字符为纯日文
- 修复英文邮件模板 `greeting` 字段缺失空格问题
- 将 SeasonPicker 组件的季节标签和月份文案迁入 `locations.json` 的 `seasons` 命名空间，统一 `locations.seasons` 和 `admin.seasons` 的定义
- 迁移剩余用户可见硬编码中文文案至对应命名空间（`ui.json`、`locations.json`、`common.json`）
- 增强 API 侧 `email-i18n.ts` 的非法 locale 日志记录

## Capabilities

### New Capabilities

- `i18n-remaining-fixes`: 前端硬编码文案剩余缺口修复 + 邮件模板翻译质量修复 + API 侧 locale 日志增强

### Modified Capabilities

- `api-email-i18n`: 修复日文邮件模板翻译错误和英文邮件格式问题
- `frontend-hardcoded-copy-migration`: 补充 SeasonPicker、错误提示、aria-label 等剩余硬编码文案迁移

## Impact

- **受影响代码**:
  - `api/src/lib/locales/email.{zh-CN,en,ja}.json` — 邮件模板数据修复
  - `api/src/lib/email-i18n.ts` — 非法 locale 日志记录
  - `frontend/src/components/ui/season-picker.tsx` — 消除硬编码季节标签
  - `frontend/src/components/ui/multi-image-upload.tsx` — 上传失败提示
  - `frontend/src/components/features/location-edit-client.tsx` — 地图加载错误提示
  - `frontend/src/components/ui/poi-edit-modal.tsx` — POI 编辑错误提示
  - `frontend/src/components/ui/sticky-action-bar.tsx` — 相对时间和未保存提示
  - `frontend/src/components/features/home/home-hero.tsx` — 装饰性浮窗文案
  - `frontend/src/components/ui/form-input.tsx` — aria-label
  - `frontend/src/components/layout/navbar.tsx` — aria-label
  - `frontend/public/locales/{zh-CN,en,ja}/locations.json` — seasons 命名空间扩展
  - `frontend/public/locales/{zh-CN,en,ja}/ui.json` — 错误提示命名空间扩展
  - `frontend/public/locales/{zh-CN,en,ja}/common.json` — 通用文案扩展
- **受影响依赖**: 无新增依赖
- **破坏性变更**: 无
