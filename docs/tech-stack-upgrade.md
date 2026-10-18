# 技术栈与兼容性约束

基线：`bf3dcc02`。版本查询使用 npm 官方 registry 的 `dist-tags.latest`（2026-10-19），不把 beta/next 当作稳定版。下表为项目直接依赖；精确传递依赖以 pnpm-lock.yaml 为准。

## 兼容性决策

- Node 采用最新 LTS 24.22.0；26.12.0 属于 Current，生产工具链优先 LTS。`@types/node` 固定匹配 24 系列的 24.19.2。
- TypeScript latest 为 7.0.2，但 `@astrojs/check@0.9.10` 的 peer 只接受 5/6，`typescript-eslint@8.71.2` 要求 `<6.1.0`。采用最新兼容版本 6.0.3；待两者支持后再升 7，不能用强制安装伪装兼容。
- Better Auth 1.7.3+ 不再写入 issuer；项目旧 schema 与自有注册确认仍依赖该字段。使用官方 `account.additionalFields` 和 account create hook 保持写入：credential → `local:credential`，Google → `https://accounts.google.com`（核对 1.7.2 发布源）。字段不接受客户端输入、不返回客户端；未知 provider 拒绝。这是 GoMate 的兼容选择；上游常规升级指南建议放宽/删除 issuer 列，本次为保持回滚合同暂不执行该收缩。无需改变数据库，保留旧 Worker 可识别新账户的回滚能力；后续移除列需另走 schema contraction。
- ESLint 10 / hooks 7 升级后继续启用既有 `rules-of-hooks` 与 `exhaustive-deps`。未将新增 React Compiler 建议规则整批引入；该规则集迁移需单独处理现有代码。
- Node/pnpm 的仓库及 CI 版本已更新；未执行本机生产写入，远程 Workers Builds 变量是否同步须以受保护构建日志为准。

## 直接依赖

| 依赖 | 基线声明 | 本次固定版本 |
| --- | --- | --- |
| `@astrojs/cloudflare` | `^14.4.0` | `14.4.0` |
| `@astrojs/react` | `^7.1.0` | `7.1.0` |
| `@hono/zod-openapi` | `1.6.3` | `1.6.3` |
| `@scalar/hono-api-reference` | `0.12.13` | `0.12.13` |
| `@starwind-ui/astro` | `新增` | `1.3.0` |
| `@starwind-ui/react` | `新增` | `1.3.0` |
| `@tabler/icons-react` | `新增` | `3.49.0` |
| `@tailwindcss/vite` | `^4.3.3` | `4.3.3` |
| `astro` | `~7.4.0` | `7.4.0` |
| `better-auth` | `^1.7.1` | `1.7.10` |
| `clsx` | `^2.1.1` | `2.1.1` |
| `drizzle-orm` | `^0.45.2` | `0.45.4` |
| `hono` | `^4.13.13` | `4.13.13` |
| `lucide-react` | `^0.460.0` | `1.59.0` |
| `motion` | `^14.3.0` | `14.3.0` |
| `react` | `^18.3.1` | `19.3.1` |
| `react-dom` | `^18.3.1` | `19.3.1` |
| `react-markdown` | `^10.1.0` | `10.1.0` |
| `remark-gfm` | `^4.0.1` | `4.0.1` |
| `resend` | `^4.0.0` | `6.34.1` |
| `tailwind-merge` | `^2.5.0` | `3.7.0` |
| `tailwind-variants` | `新增` | `3.3.1` |
| `tailwindcss` | `^4.0.0` | `4.3.3` |
| `tw-animate-css` | `新增` | `1.4.0` |
| `zod` | `^4.6.1` | `4.6.7` |
| `@astrojs/check` | `^0.9.10` | `0.9.10` |
| `@cloudflare/vite-plugin` | `1.64.0` | `1.64.0` |
| `@cloudflare/vitest-plugin` | `^1.0.0` | `1.4.4` |
| `@eslint/js` | `^9.0.0` | `10.0.1` |
| `@playwright/test` | `^1.61.1` | `1.64.1` |
| `@scalar/api-reference` | `1.75.0` | `1.75.0` |
| `@tailwindcss/typography` | `^0.5.19` | `0.5.20` |
| `@testing-library/jest-dom` | `^6.9.1` | `7.0.1` |
| `@testing-library/react` | `^16.3.2` | `16.3.3` |
| `@types/node` | `^25.0.0` | `24.19.2` |
| `@types/react` | `^18.3.0` | `19.3.0` |
| `@types/react-dom` | `^18.3.0` | `19.3.0` |
| `@vitest/coverage-v8` | `^4.1.11` | `5.0.5` |
| `drizzle-kit` | `^0.31.10` | `0.31.11` |
| `es-module-lexer` | `^2.1.0` | `3.0.4` |
| `eslint` | `^9.0.0` | `10.13.0` |
| `eslint-plugin-react-hooks` | `^5.2.0` | `7.1.1` |
| `globals` | `^16.5.0` | `17.13.0` |
| `jsdom` | `^29.0.2` | `30.1.3` |
| `prettier` | `^3.0.0` | `3.9.10` |
| `tsx` | `^4.22.3` | `4.23.15` |
| `typescript` | `^5.9.3` | `6.0.3` |
| `typescript-eslint` | `^8.58.1` | `8.71.2` |
| `vite` | `^8.3.4` | `8.3.4` |
| `vitest` | `^4.1.11` | `5.0.5` |
| `wrangler` | `^4.151.1` | `4.151.1` |

## Starwind 覆盖与保留范围

Starwind CLI 3.4.0 的 bundled registry 2.2.0 提供组件源；React / Astro adapter 均为 1.3.0。各组件源版本记录于 `starwind.config.json`，不与 CLI/adapter 版本混用。组件源按 MIT 许可保存在 `src/components/starwind-react` 与 `src/components/starwind`。

| 范围 | 接入方式 |
| --- | --- |
| 认证、资料、反馈、地点、队伍、后台表单与操作 | Button、Input、Textarea、Label、NativeSelect；保留受控值、name、disabled 与原有提交方式 |
| 公共弹层、图库、城市选择、后台抽屉、移动导航 | Starwind Dialog primitive + 现有 Modal 布局合同，保留初始/返回焦点、safe area、背景隔离 |
| 语言与用户菜单 | Dropdown / Menu primitive；键盘移动、Escape、外部关闭交由 Starwind |
| 后台标签选择、资料经验级别 | Checkbox / RadioGroup，保持表单值与可访问名称 |
| 帮助 FAQ、后台可选字段 | Collapsible，移除固定高度截断 |
| 提示、头像、骨架、队伍进度、适用卡片与状态标签 | Alert、Avatar、Skeleton、Progress、Card、Badge；复用原有业务状态和颜色 |
| Astro 页面 CTA | Astro Button，保留真实链接和 SSR |

必要保留：文件上传 input 和 hidden 表单值使用原生元素；普通导航、文章链接与链接卡片保持 a 语义；section/article 等内容结构保持语义元素。地图、圆形业务进度、图库图片重试、日期/地区/标签等复杂业务组合保留自身数据与交互，仅替换适用基础控件。没有导入未使用的 Dialog 样式、Table 或 Astro Card 等组件。

本地适配：Button 的 plain/inherit 变体避免覆盖原布局与换行；React Button 使用区分锚点/按钮的 props 类型并转发 ref/tabIndex；NativeSelect 占满可用宽度；Alert/Badge 保留原 div/p/span 语义；Progress 支持既有轨道颜色；移动输入字号最低 16px；reduced-motion 禁用组件过渡。重新获取上游组件时应逐项复核这些改动，不直接覆盖。

## 来源

- [npm 官方 registry](https://registry.npmjs.org/)：每个包的 latest、engines 和 peerDependencies。
- [Starwind Astro + React](https://starwind.dev/docs/frameworks/astro-react/)
- [Starwind 手动安装](https://starwind.dev/docs/getting-started/manual-setup/)
- [Starwind 官方源](https://github.com/starwind-ui/starwind-ui)
- [Better Auth 1.7 升级说明](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/1-7-upgrade-guide.mdx)
- [Node 发布状态](https://nodejs.org/en/about/previous-releases)

## 验证状态

2026-10-19 本地验证（Node 24.22.0）：`pnpm test:ci` 通过，前端 331、服务端 253、Worker 18 项测试全部通过；Astro check 为 0 错误、0 警告、42 条提示。`pnpm test:e2e:ci` 85/85 通过，覆盖中英文、桌面/移动、键盘、dark 与 reduced-motion。

`worker:types`、`worker:dry-run`、`worker:size` 通过，统一 Worker gzip 为 1.64 MiB / 116 modules；frozen-lockfile 安装和生产依赖 audit 通过。三轮独立审查的阻塞项已修复。受保护 CI、远程 Preview 和生产发布结果以对应 PR/Build 为准，本地测试不代表生产已发布。
