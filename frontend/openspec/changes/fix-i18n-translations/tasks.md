## 1. P0 namespace 翻译（用户直接可见）

- [x] 1.1 翻译 `nav.json` 英文（导航栏文案）
- [ ] 1.2 翻译 `nav.json` 日文
- [x] 1.3 翻译 `home.json` 英文（首页文案）
- [ ] 1.4 翻译 `home.json` 日文
- [x] 1.5 翻译 `teams.json` 英文（队伍管理文案，最大文件 331 行）
- [ ] 1.6 翻译 `teams.json` 日文
- [x] 1.7 翻译 `locations.json` 英文（地点列表文案）
- [ ] 1.8 翻译 `locations.json` 日文
- [x] 1.9 翻译 `locationDetail.json` 英文（地点详情文案）
- [ ] 1.10 翻译 `locationDetail.json` 日文
- [x] 1.11 翻译 `myTeams.json` 英文（我的队伍文案）
- [ ] 1.12 翻译 `myTeams.json` 日文
- [x] 1.13 翻译 `profile.json` 英文（用户资料文案）
- [ ] 1.14 翻译 `profile.json` 日文
- [x] 1.15 翻译 `common.json` 英文（通用文案）
- [ ] 1.16 翻译 `common.json` 日文
- [x] 1.17 翻译 `enums.json` 英文（枚举值文案）
- [ ] 1.18 翻译 `enums.json` 日文
- [x] 1.19 翻译 `ui.json` 英文（UI 组件文案）
- [ ] 1.20 翻译 `ui.json` 日文

## 2. P1 namespace 翻译（功能页面）

- [x] 2.1 翻译 `auth.json` 英文
- [ ] 2.2 翻译 `auth.json` 日文
- [x] 2.3 翻译 `filter.json` 英文
- [ ] 2.4 翻译 `filter.json` 日文
- [x] 2.5 翻译 `favorites.json` 英文
- [ ] 2.6 翻译 `favorites.json` 日文
- [x] 2.7 翻译 `share.json` 英文
- [ ] 2.8 翻译 `share.json` 日文
- [x] 2.9 翻译 `feedback.json` 英文
- [ ] 2.10 翻译 `feedback.json` 日文
- [x] 2.11 翻译 `content.json` 英文
- [ ] 2.12 翻译 `content.json` 日文
- [x] 2.13 翻译 `pois.json` 英文
- [ ] 2.14 翻译 `pois.json` 日文
- [x] 2.15 翻译 `errors.json` 英文
- [ ] 2.16 翻译 `errors.json` 日文
- [x] 2.17 翻译 `userDetail.json` 英文
- [ ] 2.18 翻译 `userDetail.json` 日文

## 3. P2 namespace 翻译（管理/低频）

- [x] 3.1 翻译 `admin.json` 英文（管理后台，177 行）
- [ ] 3.2 翻译 `admin.json` 日文
- [x] 3.3 翻译 `email.json` 英文（邮件模板）
- [ ] 3.4 翻译 `email.json` 日文

## 4. 组件硬编码中文迁移

- [x] 4.1 迁移 `loading-states.tsx` 默认文案到 locale 文件
- [x] 4.2 迁移 `season-picker.tsx` 季节常量到 locale 文件
- [x] 4.3 迁移 `city-select.tsx` 城市选择相关文案
- [x] 4.4 迁移 `cover-image-upload.tsx` 错误提示和 alt/aria-label
- [x] 4.5 迁移 `multi-image-upload.tsx` 错误提示和 aria-label
- [x] 4.6 迁移 `poi-edit-modal.tsx` 错误消息和 aria-label
- [x] 4.7 迁移 `sticky-action-bar.tsx` 时间文案和按钮文本
- [x] 4.8 迁移 `form-input.tsx` aria-label
- [x] 4.9 迁移 `location-detail/constants.tsx` 季节常量
- [x] 4.10 迁移 `profile-edit/constants.tsx` 装备常量
- [x] 4.11 迁移 `team-detail-sidebar.tsx` JSX 文本和剩余名额文案
- [x] 4.12 迁移 `team-detail-modals.tsx` 申请加入弹窗文案
- [x] 4.13 迁移 `team-detail-applications.tsx` 审核按钮文案
- [x] 4.14 迁移 `team-detail-content.tsx` JSX 文本
- [x] 4.15 迁移 `team-detail-bottom-bar.tsx` JSX 文本
- [x] 4.16 迁移 `team-detail-members.tsx` JSX 文本
- [x] 4.17 迁移 `teams-ui.tsx` alt 文本
- [x] 4.18 迁移 `home-hero.tsx` 浮动标签文案
- [x] 4.19 迁移 `location-intro-card.tsx` 展开全文/收起文案
- [x] 4.20 迁移 `address-row.tsx` title 属性
- [x] 4.21 迁移 `profile-form-fields.tsx` alt 文本
- [x] 4.22 迁移 `location-edit-client.tsx` 错误提示
- [x] 4.23 迁移 `navbar.tsx` aria-label 文案
- [x] 4.24 迁移 `language-switcher.tsx` aria-label
- [x] 4.25 迁移 `share-poster-modal.tsx` aria-label

## 5. 长文本组件国际化

- [x] 5.1 迁移 `terms-client.tsx` 服务条款内容到 locale 文件（32 处中文）
- [x] 5.2 迁移 `privacy-client.tsx` 隐私政策内容到 locale 文件（28 处中文）
- [x] 5.3 迁移 `help-client.tsx` FAQ 内容到 locale 文件（12 处中文）

## 6. Astro 页面 title 国际化

- [x] 6.1 在 locale 文件中添加所有 page title 翻译（约 20 个标题）
- [x] 6.2 修改 `Layout.astro` 支持通过 SSR `t()` 获取翻译 title
- [x] 6.3 修改所有 `.astro` 页面 title 属性，从硬编码改为翻译函数调用

## 7. 验证与清理

- [x] 7.1 运行 copy.test.ts 验证翻译文件结构完整性（16/16 通过）
- [x] 7.2 扫描确认 en 文件中无残留中文（1210 key 对齐，0 中文；ja 文件保留中文值作为 fallback 兜底）
- [x] 7.3 扫描确认组件中无残留硬编码中文（0 处）
- [ ] 7.4 在浏览器中切换 en/ja 语言，验证主要页面翻译正确
- [ ] 7.5 验证 aria-label、placeholder、alt 等属性翻译生效
