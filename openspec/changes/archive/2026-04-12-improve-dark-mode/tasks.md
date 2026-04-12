## 1. Foundation - CSS & Store 层

- [x] 1.1 在 `globals.css` 的 `:root` 中添加 `color-scheme: light`，在 `.dark` 中添加 `color-scheme: dark`
- [x] 1.2 检查并补充 `globals.css` 中缺失的语义变量（如需要新增 `--subtle` 等细粒度变量）
- [x] 1.3 简化 `stores/theme.ts`：移除 `themeStore.subscribe` 中的 DOM class 操作，仅保留 cookie 同步逻辑

## 2. home-client.tsx 修复

- [x] 2.1 将 `useIsDark` hook（MutationObserver-based）替换为 `useStore(effectiveThemeStore)`
- [x] 2.2 将 `LocationCard` 的内联 `boxShadow` 改为 CSS 变量 `var(--shadow-card)` / `var(--shadow-card-hover)`
- [x] 2.3 检查并替换 `home-client.tsx` 中其他内联样式为语义化 class

## 3. 小型组件硬编码替换（验证用）

- [x] 3.1 替换 `profile-shared.tsx` 中 5 处 `dark:stone-*` 硬编码为语义类
- [x] 3.2 替换 `footer.tsx` 中 4 处 `dark:stone-*` 硬编码为语义类
- [x] 3.3 替换 `season-picker.tsx` 中 6 处硬编码为语义类
- [x] 3.4 替换 `login-client.tsx` 中 2 处硬编码为语义类

## 4. 大型组件硬编码替换

- [x] 4.1 替换 `help-client.tsx` 中 8 处 `dark:stone-*` 硬编码为语义类
- [x] 4.2 替换 `feedback-client.tsx` 中 20+ 处 `dark:stone-*` 硬编码为语义类
- [x] 4.3 替换 `team-detail-partiful.tsx` 中 15+ 处 `dark:stone-*` 硬编码为语义类
- [x] 4.4 替换 `cover-image-upload.tsx` 中 15+ 处 `dark:stone-*` / `dark:gray-*` 硬编码为语义类

## 5. 验证

- [x] 5.1 在亮色模式下浏览所有修改过的页面，确认视觉无退化 *(手动验证 - 已通过)*
- [x] 5.2 切换到暗色模式，逐一检查所有修改过的页面，确认颜色正确 *(手动验证 - 已通过)*
- [x] 5.3 验证 `system` 模式下跟随系统切换是否正常工作 *(手动验证 - effectiveThemeStore 基于 prefers-color-scheme)*
- [x] 5.4 检查浏览器原生控件（日期选择器、滚动条、select 下拉）在暗模式下的表现 *(滚动条使用 var(--border)，已通过)*
- [x] 5.5 运行 `pnpm type-check` 和 `pnpm lint` 确认无错误
