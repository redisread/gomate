## 1. 邮件模板翻译修复

- [ ] 1.1 修复 `email.ja.json` welcome.feature3：将残留中文字符「ハイキング爱好者と一緒に出发」替换为纯日文
- [ ] 1.2 修复 `email.en.json` welcome.greeting：添加空格 `"Hello {name}!"`
- [ ] 1.3 修复 `email.zh-CN.json` welcome.greeting：确保格式一致 `"你好，{name}！"`

## 2. API 侧 locale 日志增强

- [ ] 2.1 修改 `email-i18n.ts` 的 `getTemplateData`：当收到无效 locale 时输出 console.warn

## 3. SeasonPicker 季节标签迁移

- [ ] 3.1 在 `locations.json` (zh-CN/en/ja) 中确认/扩展 `seasons` 节点，包含 spring/summer/autumn/winter 的 label 和 months
- [ ] 3.2 修改 `season-picker.tsx`：移除 SEASONS 数组中的硬编码 label 和 months，使用 `t()` 获取
- [ ] 3.3 在 `locations.json` 三个语言文件顶部添加注释，说明与 `admin.seasons` 的使用场景区别

## 4. 错误提示文案迁移

- [ ] 4.1 在 `ui.json` (zh-CN/en/ja) 中新增 `upload.uploadFailed` key
- [ ] 4.2 在 `ui.json` (zh-CN/en/ja) 中新增 `map.loadFailed` 和 `map.loadFailedHint` key
- [ ] 4.3 在 `ui.json` (zh-CN/en/ja) 中新增 `poi.createFailed`、`poi.updateFailed`、`poi.missingId` key
- [ ] 4.4 修改 `multi-image-upload.tsx`：替换硬编码「上传失败」为 `t('ui.upload.uploadFailed')`
- [ ] 4.5 修改 `location-edit-client.tsx`：替换硬编码地图错误提示为 `t()` 调用
- [ ] 4.6 修改 `poi-edit-modal.tsx`：替换硬编码 POI 错误提示为 `t()` 调用

## 5. 通用文案迁移

- [ ] 5.1 在 `common.json` (zh-CN/en/ja) 中新增 `justNow`（刚刚）和 `unsavedChanges`（有未保存的更改）key
- [ ] 5.2 修改 `sticky-action-bar.tsx`：替换硬编码为 `t()` 调用
- [ ] 5.3 在 `common.json` (zh-CN/en/ja) 中新增 `showPassword`、`hidePassword` key
- [ ] 5.4 修改 `form-input.tsx`：替换 aria-label 硬编码为 `t()` 调用 + 英文 fallback
- [ ] 5.5 在 `common.json` (zh-CN/en/ja) 中新增 `closeMenu`、`openMenu` key
- [ ] 5.6 修改 `navbar.tsx`：替换 aria-label 硬编码为 `t()` 调用

## 6. 装饰性浮窗文案迁移

- [ ] 6.1 在 `home.json` (zh-CN/en/ja) 中新增装饰浮窗 label key（如 `hero.floatingLabel1` 等）
- [ ] 6.2 修改 `home-hero.tsx`：替换硬编码浮窗文案为 `t()` 调用

## 7. 验证与清理

- [ ] 7.1 用 grep 全量扫描修改过的组件文件，确认无残留硬编码用户可见中文
- [ ] 7.2 用 `pnpm type-check` 验证无 TypeScript 错误
- [ ] 7.3 用 `pnpm lint` 验证无 lint 错误
- [ ] 7.4 本地启动 API 和前端，切换三种语言验证所有修改点
- [ ] 7.5 验证日文邮件模板无中文字符残留
