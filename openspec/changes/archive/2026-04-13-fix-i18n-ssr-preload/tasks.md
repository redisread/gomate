## 1. Layout.astro 全局 namespace 注入

- [x] 1.1 修改 Layout.astro 第38行，将 `nav` 和 `common` 添加到 nsList 默认值中，与 declaredNs 合并去重
- [x] 1.2 验证 SSR 加载的 namespace 列表包含 `nav`、`common`、`content`（无页面声明时）

## 2. 页面级 namespace 声明

- [x] 2.1 `index.astro`：声明 `['home', 'locations', 'teams']`
- [x] 2.2 `about.astro`：无需额外声明（仅用 content，已自动注入）
- [x] 2.3 `contact.astro`：声明 `['feedback']`
- [x] 2.4 `feedback.astro`：声明 `['feedback']`
- [x] 2.5 `favorites/index.astro`：声明 `['favorites']`
- [x] 2.6 `forgot-password.astro`：声明 `['auth']`
- [x] 2.7 `help.astro`：无需额外声明（用 content 和 nav，均已自动注入）
- [x] 2.8 `login.astro`：声明 `['auth']`
- [x] 2.9 `register.astro`：声明 `['auth']`
- [x] 2.10 `reset-password.astro`：声明 `['auth']`
- [x] 2.11 `privacy.astro`：无需额外声明（用 content 和 nav，均已自动注入）
- [x] 2.12 `terms.astro`：无需额外声明（用 content 和 nav，均已自动注入）
- [x] 2.13 `locations/index.astro`：声明 `['locations', 'filter']`
- [x] 2.14 `locations/[id].astro`：声明 `['locationDetail', 'locations', 'errors', 'admin', 'enums']`
- [x] 2.15 `teams/index.astro`：声明 `['teams', 'filter']`
- [x] 2.16 `teams/[id].astro`：声明 `['teams']`
- [x] 2.17 `teams/create.astro`：声明 `['teams']`
- [x] 2.18 `teams/[id]/edit.astro`：声明 `['teams']`
- [x] 2.19 `my-teams/index.astro`：声明 `['myTeams', 'teams']`
- [x] 2.20 `profile/index.astro`：声明 `['profile']`
- [x] 2.21 `profile/edit.astro`：声明 `['profile', 'errors', 'enums']`
- [x] 2.22 `users/[id].astro`：声明 `['userDetail', 'profile', 'errors', 'enums']`
- [x] 2.23 `blog/index.astro`：无需额外声明（仅用 content）
- [x] 2.24 `blog/[slug].astro`：声明 `['share']`
- [x] 2.25 `admin/locations/[id]/edit.astro`：声明 `['admin', 'pois', 'ui']`

## 3. 验证

- [x] 3.1 启动 `pnpm dev`，访问首页，确认控制台无 `[i18n] Missing translation key` 警告
- [x] 3.2 访问 /about、/teams、/locations、/feedback、/privacy 页面，确认无缺失翻译警告
- [x] 3.3 确认首屏文案正确显示中文而非翻译 key
