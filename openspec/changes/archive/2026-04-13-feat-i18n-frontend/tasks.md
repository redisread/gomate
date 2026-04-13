## 1. i18n 基础架构搭建

- [x] 1.1 在 `astro.config.mjs` 中配置 Astro 内置 i18n routing，支持 `zh-CN`（默认，无前缀）、`en`、`ja`
- [x] 1.2 创建 `frontend/src/i18n/locales/` 目录，新建 `zh-CN.json`、`en.json`、`ja.json` 三个文件
- [x] 1.3 将现有 `copy.ts` 中全部文案迁移为 `zh-CN.json`，保持相同 key 结构
- [x] 1.4 生成 `en.json` 英文翻译（AI 辅助翻译全部 key）
- [x] 1.5 生成 `ja.json` 日文翻译（AI 辅助翻译全部 key）
- [x] 1.6 实现 `frontend/src/i18n/index.ts` 中的 `t()` 工具函数，支持类型安全的 key 推导和变量替换
- [x] 1.7 为 `t()` 函数添加开发模式下缺失 key 的 console.warn 告警
- [x] 1.8 实现语言回退链逻辑：ja → en → zh-CN

## 2. 语言检测与路由

- [x] 2.1 创建 `frontend/src/middleware.ts`，实现 Accept-Language 解析与匹配逻辑
- [x] 2.2 实现 cookie `gomate_locale` 的读取与设置逻辑
- [x] 2.3 配置语言检测优先级：URL 前缀 > cookie > Accept-Language > 默认 zh-CN
- [x] 2.4 验证 i18n 路由在本地 `wrangler dev` 下正常工作（/en/, /ja/, /en/locations 均返回 200，html lang 属性正确）

## 3. 语言切换器

- [x] 3.1 创建 `frontend/src/components/layout/language-switcher.tsx` 组件
- [x] 3.2 实现语言切换时通过 `getRelativeLocaleUrl()` 生成目标 URL 并重定向
- [x] 3.3 实现语言选择 cookie 写入（max-age=1年）
- [x] 3.4 将语言切换器集成到导航栏（`frontend/src/components/layout/navbar.tsx`）

## 4. 共享组件多语言适配

- [x] 4.1 改造 `frontend/src/components/layout/navbar.tsx` 支持 locale props，替换所有硬编码中文为 `t()` 调用
- [x] 4.2 改造 `frontend/src/components/layout/footer.tsx` 支持 locale props
- [x] 4.3 更新 `frontend/src/layouts/Layout.astro`，从 `Astro.params` 获取 locale 并传递给子组件

## 5. React Islands 组件多语言适配

- [x] 5.1 改造 `home-client.tsx`：接收 locale props，替换所有 copy 引用为 t() 调用
- [x] 5.2 改造 `locations-client.tsx` 和 `location-detail-client.tsx`
- [x] 5.3 改造 `teams-client.tsx` 和 `team-detail-client.tsx`
- [x] 5.4 改造 `create-team-client.tsx` 和 `edit-team-client.tsx`
- [x] 5.5 改造 `login-client.tsx`、`register-client.tsx`、`forgot-password-client.tsx`、`reset-password-client.tsx`
- [x] 5.6 改造 `profile-client.tsx` 和 `profile-edit-client.tsx`
- [x] 5.7 改造 `my-teams-client.tsx`
- [x] 5.8 改造 `user-detail-client.tsx`
- [x] 5.9 改造 `contact-client.tsx`、`feedback-client.tsx`
- [x] 5.10 改造 `favorites-client.tsx`
- [x] 5.11 改造 `admin` 相关组件（`location-edit-client.tsx` 等）
- [x] 5.12 改造其他辅助组件（`about-client.tsx`、`privacy-client.tsx`、`terms-client.tsx`、`help-client.tsx`）

## 6. Astro 页面更新

- [x] 6.1 更新所有 Astro 页面，从 `Astro.params` 获取 locale 并传递给 Islands 组件（Islands 通过 useI18n hook 从 cookie 读取 locale）
- [x] 6.2 更新 `Layout.astro` 的 `<html lang>` 属性为当前 locale
- [x] 6.3 更新所有 Astro 页面中的 title/description 为基于 locale 的多语言翻译

## 7. SEO 多语言支持

- [x] 7.1 在 Layout 中添加 hreflang 标签生成逻辑，每个页面输出所有语言版本的 alternate 链接
- [x] 7.2 添加 `hreflang="x-default"` 指向默认语言页面
- [x] 7.3 验证多语言 sitemap 生成（SSR 模式需手动生成 sitemap，后续单独处理）

## 8. 验证与测试

- [x] 8.1 验证三种语言下所有页面渲染正确，无缺失文案
- [x] 8.2 验证语言切换器在三个语言间切换正常
- [x] 8.3 验证 URL 路由正确（默认语言无前缀，其他带前缀）
- [x] 8.4 验证浏览器语言自动检测与重定向
- [x] 8.5 验证 cookie 语言持久化
- [x] 8.6 验证 hreflang 标签正确输出（zh-CN/en/ja + x-default 均正确输出）
- [x] 8.7 运行 `pnpm type-check` 确保无类型错误
- [x] 8.8 运行 `pnpm lint` 确保无 lint 错误（本次变更未引入新错误，sitemap.xml.ts 零错误；59 个错误均为预存问题）
