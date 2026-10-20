# Tasks

## Task 1: 统一邮件发送结果

Description: 统一邮件发送结果。

Acceptance criteria:
- [ ] 供应商返回 error、抛异常、超时均失败；模板和反馈幂等键保留

Verification:
- [ ] pnpm test:server

Dependencies: 无

Files likely touched: src/server/lib/email.ts, email.test.ts, email-transport.ts

Estimated scope: M；超过五文件的迁移按所列模块分批。

## Task 2: 统一主题来源

Description: 统一主题来源。

Acceptance criteria:
- [ ] 移除手写关键 CSS 副本；亮暗主题浏览器计算值有效

Verification:
- [ ] pnpm build；浏览器主题回归

Dependencies: 无

Files likely touched: src/layouts/Layout.astro, e2e/theme.spec.ts

Estimated scope: M；超过五文件的迁移按所列模块分批。

## Checkpoint
- [ ] 定向测试和类型检查通过后进入下一阶段。

## Task 3: 显式 SEO 合同

Description: 显式 SEO 合同。

Acceptance criteria:
- [ ] 静态页面显式传翻译键；动态标题和描述保留；无中文文案反向映射

Verification:
- [ ] pnpm check；双语 SSR 回归

Dependencies: 无

Files likely touched: src/lib/page-metadata.ts, src/layouts/Layout.astro；调用页按认证/公开/管理三批迁移，每批不超过五文件

Estimated scope: M；超过五文件的迁移按所列模块分批。

## Task 4: 收紧响应类型边界

Description: 收紧响应类型边界。

Acceptance criteria:
- [ ] 移除全局 Body.json any 补丁；响应消费使用共享合同或边界校验；分模块每批不超过五文件

Verification:
- [ ] pnpm type-check；相关单元测试

Dependencies: 无

Files likely touched: src/env.d.ts, src/lib/api.ts；各消费模块分批

Estimated scope: M；超过五文件的迁移按所列模块分批。

## Checkpoint
- [ ] 定向测试和类型检查通过后进入下一阶段。

## Task 5: 共享队伍筛选解析

Description: 共享队伍筛选解析。

Acceptance criteria:
- [ ] SSR 与客户端共用解析和 API 查询函数；保留默认值和日期行为

Verification:
- [ ] pnpm test；队伍浏览器回归

Dependencies: 无

Files likely touched: src/lib/team-filter-params.ts, src/pages/teams/index.astro, src/components/features/teams/use-teams.ts, 对应测试

Estimated scope: M；超过五文件的迁移按所列模块分批。

## Task 6: 显式加载失败与重试

Description: 显式加载失败与重试。

Acceptance criteria:
- [ ] 建队地点详情和队伍标签失败可见可重试；取消和旧响应不覆盖当前选择；按两条用户路径分别交付

Verification:
- [ ] pnpm test；pnpm i18n:build；pnpm i18n:validate

Dependencies: 5

Files likely touched: src/components/features/teams/form/use-create-team-form.ts, create-team-client.tsx；use-teams.ts, teams-ui.tsx；对应测试/locale 分批

Estimated scope: M；超过五文件的迁移按所列模块分批。

## Checkpoint
- [ ] 定向测试和类型检查通过后进入下一阶段。

## Task 7: 整理布局职责和文档

Description: 整理布局职责和文档。

Acceptance criteria:
- [ ] SEO/主题/预加载有明确边界；删除无依据优化注释；现行文档一致

Verification:
- [ ] pnpm test:ci；pnpm test:e2e:ci

Dependencies: 2,3,4

Files likely touched: src/layouts/Layout.astro, src/components/layout/*, docs/frontend-pages.md, docs/design-system.md

Estimated scope: M；超过五文件的迁移按所列模块分批。

## Task 8: 独立审查与受保护交付

Description: 独立审查与受保护交付。

Acceptance criteria:
- [ ] 独立审查无阻塞；PR 当前 head CI 通过；发布后只读验证

Verification:
- [ ] worker types/dry-run/size；audit；远程 CI；生产 smoke

Dependencies: 1-7

Files likely touched: LESSONS.md（仅实际缺陷证据），PR

Estimated scope: M；超过五文件的迁移按所列模块分批。

