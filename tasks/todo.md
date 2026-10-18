# 页脚改造任务

## Task 1：原创山湖插画（Small）
描述：生成暖纸色与深蓝的原创全景，包含步道和少量同行者。
- [ ] 验收：无文字/品牌，桌面与移动裁切保留主题，桌面 WebP 小于 350 KB。
- [ ] 验证：查看实际图像和文件尺寸。
依赖：无。文件：public/images/footer-landscape*.webp。

## Task 2：响应式页脚（Medium）
描述：统一布局，保持真实导航与联系功能。
- [ ] 验收：链接完整、双语可读，移动端无 hydration 布局替换。
- [ ] 验收：键盘焦点、二维码开关、reduced-motion 返回顶部可用。
- [ ] 验证：先失败后通过的 footer 行为测试；lint/type-check/build。
依赖：1。文件：footer.tsx、footer-mobile.tsx、footer-wechat.tsx、globals.css、footer.test.tsx。

## Checkpoint：核心实现
- [ ] 实际浏览器检查 320/390/768/1440、深浅色、中英文、键盘与图片失败。

## Task 3：验证与交付（Medium）
描述：同步现行设计文档，执行门禁，独立审查后创建 PR，按保护规则合并。
- [ ] 验收：本地适用门禁与当前 PR head CI 通过，无阻塞审查问题。
- [ ] 验收：部署版本与生产页面/图片只读 smoke 对应新提交。
- [ ] 验证：pnpm test:ci、worker types/dry-run/size、audit；PR CI E2E；生产 HTTP。
依赖：2。文件：docs/design-system.md、必要的 E2E 测试。

## Checkpoint：完成
- [ ] 独立子代理审查通过；PR 已创建并按规则交付。
