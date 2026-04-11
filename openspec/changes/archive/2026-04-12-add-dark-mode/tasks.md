## 1. 安装依赖

- [x] 1.1 安装 `next-themes` 到 frontend 项目：`cd frontend && pnpm add next-themes`

## 2. Tailwind CSS 配置

- [x] 2.1 检查并更新 Tailwind CSS v4 配置以启用暗黑模式（如使用 CSS 配置方式添加 `@custom-variant dark (&:where(.dark, .dark *))`）

## 3. 主题 Provider 组件

- [x] 3.1 创建 `frontend/src/components/theme-provider.tsx` 文件，封装 `next-themes` 的 ThemeProvider
- [x] 3.2 配置 Provider 属性：`attribute="class"`、`defaultTheme="system"`、`enableSystem={true}`、`disableTransitionOnChange={true}`

## 4. 布局集成

- [x] 4.1 更新 `frontend/src/layouts/Layout.astro`：导入 ThemeProvider 并包裹 `<slot />`
- [x] 4.2 确保 ThemeProvider 只在客户端激活：`client:only="react"`
- [x] 4.3 添加防止闪烁的内联脚本到 `<head>` 中

## 5. 主题切换组件

- [x] 5.1 创建 `frontend/src/components/theme-toggle.tsx` 文件
- [x] 5.2 实现使用 `useTheme` hook 获取当前主题和 setTheme 函数
- [x] 5.3 添加 DropdownMenu UI，包含 Light/Dark/System 三个选项（使用中文文案）
- [x] 5.4 根据当前主题显示对应图标（Sun/Moon/Monitor）
- [x] 5.5 添加按钮 hover/focus 状态样式

## 6. 导航栏集成

- [x] 6.1 更新 `frontend/src/components/layout/navbar.tsx`：导入 ThemeToggle 组件
- [x] 6.2 在导航栏右侧、用户头像左侧添加 ThemeToggle 组件
- [x] 6.3 调整导航栏布局以适应新增的切换按钮

## 7. 全局暗黑样式

- [x] 7.1 更新 `frontend/src/styles/global.css`（或对应文件）：添加 html.dark 下的基础样式
- [x] 7.2 设置 dark 模式下 body 背景色为 `bg-slate-950`
- [x] 7.3 设置 dark 模式下文字颜色为 `text-slate-50`

## 8. 页面组件暗黑适配

- [x] 8.1 检查并更新首页（home-client.tsx）：所有卡片、背景添加 `dark:` 变体样式
- [x] 8.2 检查并更新地点列表页（locations-client.tsx）：地图标记、列表项适配
- [x] 8.3 检查并更新地点详情页：封面区域、信息卡片暗黑样式
- [x] 8.4 检查并更新队伍列表页：队伍卡片、筛选器样式
- [x] 8.5 检查并更新队伍详情页：成员列表、操作按钮样式
- [x] 8.6 检查并更新创建队伍页：表单输入框、选择器样式
- [x] 8.7 检查并更新我的队伍页：标签页、状态标签样式
- [x] 8.8 检查并更新个人资料页：头像、表单项样式

## 9. shadcn/ui 组件检查

- [x] 9.1 验证 Button 组件在 dark 模式下的所有变体样式
- [x] 9.2 验证 Card 组件在 dark 模式下的背景色
- [x] 9.3 验证 Input/Textarea 组件在 dark 模式下的边框和背景
- [x] 9.4 验证 Select/DropdownMenu 组件在 dark 模式下的下拉样式
- [x] 9.5 验证 Dialog/Sheet 组件在 dark 模式下的遮罩和内容样式
- [x] 9.6 验证 Toast 通知在 dark 模式下的显示效果

## 10. 中文文案更新

- [x] 10.1 更新 `frontend/src/lib/copy.ts`：在适当位置添加主题相关文案（如 `copy.theme.light`、`copy.theme.dark`、`copy.theme.system`）
- [x] 10.2 在 ThemeToggle 组件中使用 copy.ts 的文案

## 11. 测试验证

- [x] 11.1 本地启动开发服务器，验证主题切换功能正常工作
- [x] 11.2 验证 localStorage 正确存储主题偏好
- [x] 11.3 验证刷新页面后主题保持一致
- [x] 11.4 使用 Chrome DevTools 模拟系统偏好变化，验证 System 模式响应
- [x] 11.5 检查所有页面在 Light 和 Dark 模式下的渲染效果
- [x] 11.6 验证无页面闪烁问题（快速刷新测试）

## 12. 代码清理与提交

- [x] 12.1 移除任何调试代码或 console.log
- [x] 12.2 运行 `pnpm type-check` 确保无类型错误
- [x] 12.3 运行 `pnpm lint` 确保代码风格符合规范
- [x] 12.4 提交代码：`git add -A && git commit -m "feat: 添加暗黑模式支持"`
