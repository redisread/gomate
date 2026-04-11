## Why

暗黑模式功能已实现，但在实际使用中发现部分页面和元素未正确适配深色主题：

1. **硬编码颜色问题**：导航栏、页脚、主题切换等组件使用硬编码颜色（如 `#8f7f6e`, `#1e1812`, `#FFFBEB`），而非 CSS 变量，导致暗黑模式下颜色不切换
2. **自定义下拉菜单样式缺失**：`ThemeToggle` 组件的下拉菜单没有暗黑模式样式
3. **移动端菜单未适配**：导航栏移动端抽屉使用固定浅色背景
4. **部分页面元素遗漏**：卡片、按钮、边框等元素在暗黑模式下对比度不足

这些问题影响用户体验，需要系统性修复。

## What Changes

- **修复硬编码颜色**：将导航栏、页脚、主题切换等组件中的硬编码颜色替换为 CSS 变量或添加 `dark:` 变体
- **ThemeToggle 暗黑样式**：为自定义下拉菜单添加 `.dark` 模式样式支持
- **移动端菜单适配**：为移动端抽屉菜单添加暗黑模式背景色和文字色
- **全局样式补充**：确保所有常用 UI 模式（卡片、按钮、边框）在暗黑模式下有合适的对比度
- **测试验证**：逐个页面检查暗黑模式渲染效果

## Capabilities

### New Capabilities
- `dark-mode-navbar`：导航栏完整暗黑模式支持（桌面端+移动端）
- `dark-mode-theme-toggle`：主题切换组件下拉菜单暗黑样式
- `dark-mode-footer`：页脚暗黑模式支持

### Modified Capabilities
- （无现有能力需要修改，均为样式修复）

## Impact

**受影响范围**：
- `frontend/src/components/layout/navbar.tsx` - 大量硬编码颜色需修复
- `frontend/src/components/layout/footer.tsx` - 背景色和图标颜色
- `frontend/src/components/theme-toggle.tsx` - 下拉菜单暗黑样式
- `frontend/src/styles/globals.css` - 可能需要补充全局样式

**无破坏性变更**：纯样式修复，不影响功能逻辑。
