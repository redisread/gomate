## 1. 准备：颜色映射确认

- [x] 1.1 确认 globals.css 中所有语义化 CSS 变量在 `:root` 和 `.dark` 下都有定义
- [x] 1.2 记录完整的颜色映射表（硬编码 → 语义化），供后续批次参考

## 2. 批次 1：核心页面（用户最常用）

- [x] 2.1 `teams-client.tsx`：替换所有 `bg-white`、`bg-stone-*`、`text-stone-*`、`border-stone-*` 为语义化变量
- [x] 2.2 `teams-client.tsx`：为状态徽章（recruiting/full/cancelled 等）添加深色模式变体
- [x] 2.3 `team-detail-partiful.tsx`：替换所有硬编码 stone 颜色
- [x] 2.4 `team-detail-partiful.tsx`：适配状态徽章和成员列表颜色
- [x] 2.5 `location-detail-main-content.tsx`：替换硬编码 stone 颜色
- [x] 2.6 `location-detail-main-content.tsx`：为白色渐变遮罩（`from-white to-transparent`）添加深色变体
- [x] 2.7 `location-detail-main-content.tsx`：适配季节/评分功能渐变（Decision 2）
- [x] 2.8 `home-client.tsx`：替换硬编码背景色为语义化变量
- [x] 2.9 验证批次 1：在浏览器中切换深色/浅色模式，检查 4 个页面

## 3. 批次 2：功能页面

- [x] 3.1 `my-teams-client.tsx`：替换页面背景、卡片、状态徽章颜色
- [x] 3.2 `favorites-client.tsx`：替换卡片背景、骨架屏、图片占位符颜色
- [x] 3.3 `favorites-client.tsx`：适配收藏卡片头部渐变背景
- [x] 3.4 `profile-client.tsx`：替换个人资料页面所有硬编码颜色
- [x] 3.5 `profile-client.tsx`：适配头部装饰渐变和骨架屏渐变
- [x] 3.6 `profile-shared.tsx`：替换可复用个人资料卡片的所有 stone 颜色
- [x] 3.7 `profile-shared.tsx`：适配动态类名中的渐变背景
- [x] 3.8 `share-poster-modal.tsx`：替换弹窗背景、文字、边框颜色
- [x] 3.9 验证批次 2：在浏览器中切换深色/浅色模式，检查 5 个页面

## 4. 批次 3：其他页面 + 组件

- [x] 4.1 `terms-client.tsx`：替换全文所有 stone 颜色（纯文本页面，工作量大但模式简单）
- [x] 4.2 `create-team-client.tsx`：适配提交按钮渐变
- [x] 4.3 `contact-client.tsx`：适配提交按钮渐变
- [x] 4.4 `footer.tsx`：替换微信弹窗的背景、文字、边框、按钮颜色
- [x] 4.5 `footer.tsx`：适配微信弹窗头部渐变
- [x] 4.6 `season-picker.tsx`：替换 gray 颜色为语义化变量
- [x] 4.7 `cover-image-upload.tsx`：补充缺失的 `dark:` 变体
- [x] 4.8 验证批次 3：在浏览器中切换深色/浅色模式，检查相关页面

## 5. 批次 4：认证页面

- [x] 5.1 `login-client.tsx`：替换页面背景、卡片颜色
- [x] 5.2 `login-client.tsx`：适配头部装饰渐变和按钮渐变
- [x] 5.3 `register-client.tsx`：替换页面背景、卡片颜色
- [x] 5.4 `register-client.tsx`：适配头部装饰渐变和按钮渐变
- [x] 5.5 `forgot-password-client.tsx`：替换页面背景、卡片颜色
- [x] 5.6 `forgot-password-client.tsx`：适配装饰渐变和按钮渐变
- [x] 5.7 验证批次 4：在浏览器中切换深色/浅色模式，检查 3 个认证页面

## 6. 全局验证与提交

- [x] 6.1 完整遍历所有页面，确认深色模式无遗漏
- [x] 6.2 确认浅色模式无视觉回归
- [x] 6.3 运行 `pnpm type-check` 确保类型检查通过
- [x] 6.4 运行 `pnpm lint` 确保无 lint 错误
- [x] 6.5 提交代码
