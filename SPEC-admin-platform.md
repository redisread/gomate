# Spec: admin-platform

状态：已批准（2026-08-23）

所属倡议：[管理员内容管理与地点快速录入](CAPABILITY-MAP-admin-content-management.md)

## Objective

为 GoMate 提供所有后台模块共用的管理员访问边界和响应式后台壳层，使管理员可以从统一入口
进入后台，并能在公共页面随时启动后续 `location-workflow` 提供的快速地点录入表单。

主要用户是已登录且当前 `users.role = 'admin'` 的管理员。普通用户和访客不能读取后台页面
内容，也不能通过直接请求调用管理员 API。

本模块交付：

- `/admin` 后台首页和独立 `AdminLayout`；首页只展示已经可用的模块入口与快捷操作，
  不建设统计分析仪表盘。
- 桌面侧边栏、移动顶部栏与抽屉导航；后台不渲染公共 Navbar 或 Footer。
- SSR 页面和 Hono API 共用的权威管理员访问解析合同。
- 未登录返回登录页并保留安全的站内返回地址；非管理员得到 HTTP 403 页面。
- 可复用的管理员快速操作容器：桌面为 Dialog，移动端为 Bottom Sheet；本模块不实现
  地点字段或保存行为。
- 公共 Navbar 中可承载管理员快速操作的入口；只有已确认的管理员可见，业务内容按需加载。

本模块不交付地点、标签、活动类型或用户角色 CRUD，不新增审计日志、后台统计、原生 App、
运行时插件注册系统或新的角色类型。

## User stories

1. 作为管理员，我访问任意 `/admin/*` 页面时获得一致的后台导航和页面结构。
2. 作为管理员，我可以从公共页面找到快速添加地点入口，打开和关闭录入层而不离开当前页面。
3. 作为访客，我访问后台时会被带到登录页，登录后可安全返回原后台路径。
4. 作为普通用户，我无法通过猜测 URL、修改客户端状态或直接调用 API 获得管理员能力。
5. 作为后续后台模块开发者，我只需消费统一管理员访问合同和后台布局，不再复制角色查询。

## Tech Stack

- Astro `^7.2.4`：SSR 页面、后台路由和布局边界。
- React `^18.3.1`：移动导航、快速操作 Dialog/Sheet 等客户端交互。
- Hono `^4.13.3`：统一 Worker 内的 API 路由与错误响应。
- Better Auth `^1.7.1`：同源 HttpOnly Cookie session；不引入 JWT 或客户端 token 存储。
- Drizzle ORM `^0.45.2` + Cloudflare D1：每次受保护请求从权威用户行复核角色和账户状态。
- Tailwind CSS `^4.0.0`、现有语义 token 与 Lucide React：后台视觉与图标。
- TypeScript `^5.9.3`、Zod `^3.23.0`、Vitest `^4.1.11`、Playwright `^1.61.1`。

不增加新的 UI、路由、权限或状态管理依赖。

## Interface contract

`admin-platform` 提供一个内部、单版本的管理员访问合同。页面 middleware 和 Hono adapter
都消费该合同，不分别实现 session/role 查询。

```ts
export type AdminAccessResult =
  | {
      kind: "authorized";
      admin: {
        id: string;
        displayName: string;
        image: string | null;
      };
    }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" };

export async function resolveAdminAccess(
  env: Env,
  headers: Headers,
): Promise<AdminAccessResult>;
```

合同语义：

- `authorized`：session 有效、账户仍为 active，且当前 D1 用户行的角色仍为 `admin`。
- `unauthenticated`：没有有效 session，或账户已 suspended、banned、deleted。
- `forbidden`：session 有效且账户 active，但当前角色不是 `admin`。
- 返回对象只包含后台壳层需要的最少身份字段，不包含 email、session token 或用户扩展资料。
- 角色在每次受保护请求中从 D1 复核；客户端缓存和 session 内旧角色都不是授权依据。

适配规则：

- Astro middleware 对所有 locale 形式的 `/admin`、`/admin/*` 执行解析，并把 `authorized`
  的最小上下文写入类型化 `Astro.locals`。
- 未认证页面请求返回 `302` 到 `/login?returnTo=<encoded-relative-path>`；`returnTo` 只允许
  站内绝对路径且必须以 `/admin` 开头，禁止 scheme、host、反斜杠和协议相对路径。
- 已认证非管理员页面请求返回 HTTP `403`，使用后台之外的最小错误页面，不渲染任何后台数据。
- Hono 管理员路由通过共享 adapter 把 `unauthenticated` 映射为现有统一 JSON `401`，把
  `forbidden` 映射为统一 JSON `403`；不泄露内部查询或角色细节。
- 管理员页面和权限响应设置 `Cache-Control: private, no-store`。

快速操作容器是表现层合同，不做运行时注册中心：

```tsx
interface AdminQuickActionProps {
  label: string;
  title: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  onOpenChange?: (open: boolean) => void;
}
```

- 消费者提供表单内容；容器负责管理员触发按钮、Dialog/Sheet 形态、焦点圈定、Escape 关闭、
  关闭后焦点恢复、滚动锁定与 safe-area。
- 导航项目使用编译期静态配置；模块只有在真实路由可用后才添加入口，不建设抽象插件系统，
  不展示无法使用的占位导航。
- 本模块不新增 HTTP endpoint；公共 Navbar 继续使用现有 `/api/users/me` 的 `role` 字段判断
  是否渲染管理员入口，服务端权限仍由上述合同保证。

## Commands

首次初始化当前 worktree：

```bash
pnpm init:worktree
```

本地统一 Worker：

```bash
pnpm dev:wt
```

规格实施后的定向验证：

```bash
pnpm exec vitest run --config vitest.server.config.ts src/server/lib/admin-access.test.ts
pnpm exec vitest run --config vitest.config.ts src/components/admin/admin-navigation.test.tsx src/components/admin/admin-quick-action.test.tsx
pnpm exec playwright test e2e/admin-platform.spec.ts --project=chromium
```

模块完整门禁：

```bash
pnpm i18n:build
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm build
```

发布前依赖审计：

```bash
pnpm audit --audit-level high
```

## Project Structure

预期结构；实施计划可以在不改变边界的前提下细化文件拆分：

```text
src/env.d.ts
  → 类型化 Astro.locals.admin
src/middleware.ts
  → locale 识别、开发 API 分发和 /admin 页面统一访问边界
src/server/lib/admin-access.ts
  → resolveAdminAccess 与 Hono adapter；唯一管理员访问事实来源
src/server/lib/admin-access.test.ts
  → session、账户状态、当前角色和错误映射测试
src/layouts/AdminLayout.astro
  → 后台 HTML 骨架、landmark、桌面/移动导航和内容 slot
src/pages/admin/index.astro
  → 无统计指标的后台模块入口首页
src/pages/403.astro
  → 本地化的最小无权限页面
src/components/admin/admin-navigation.tsx
  → 移动抽屉交互和共享导航配置
src/components/admin/admin-quick-action.tsx
  → 响应式 Dialog/Bottom Sheet 容器
src/components/layout/navbar.tsx
  → 管理员后台入口和后续快速操作挂载点
src/components/admin/*.test.tsx
  → 导航、可见性、键盘和焦点行为测试
e2e/admin-platform.spec.ts
  → 访客、普通用户、管理员和响应式浏览器合同
docs/frontend-pages.md
  → /admin 页面、入口和响应式运行时合同
docs/backend-api.md
  → 共享管理员 API 授权与 401/403 语义
docs/design-system.md
  → 后台壳层与快速操作容器的稳定布局约束（如形成新模式）
```

现有 `/admin/locations/new` 和 `/admin/locations/[id]/edit` 必须迁入统一访问边界和后台布局，
但其表单字段、保存校验和地点生命周期仍由 `location-workflow` 负责。

## Code Style

- 文件、函数和变量使用英文；稳定日志事件使用 lowercase snake_case；用户可见文案全部走 i18n。
- 类型和组件使用 PascalCase，函数和变量使用 camelCase，模块文件使用 kebab-case。
- 权限状态使用判别联合，不用 `boolean | null` 混合表达未登录、无权限和已授权。
- Astro 保持页面和 SSR 边界；只有导航抽屉和快速操作容器使用 React island。
- 使用现有语义颜色、阴影与间距 token，不写临时 hex/rgba，不使用 `transition-all`。
- 布局使用 leading/trailing 与 CSS logical properties；不以固定英文长度决定宽高。

示例：

```ts
const access = await resolveAdminAccess(env, request.headers);

switch (access.kind) {
  case "authorized":
    return access.admin;
  case "unauthenticated":
    throw new AdminAccessError("unauthenticated");
  case "forbidden":
    throw new AdminAccessError("forbidden");
}
```

不允许调用方重新查询角色或把 `authorized` 简化为可伪造的客户端布尔值。

## Layout and interaction

- 后台首页是“目录”，只给一个页面级主操作；模块入口按任务分组，相关项的组内间距小于
  组间间距，避免用大量分隔线制造层级。
- 桌面侧边栏保持稳定的 leading edge；内容区域拥有独立清晰的 `<h1>`、面包屑和操作区。
- 当侧边栏会把主内容压缩到不可用宽度时才切换为移动顶部栏与抽屉，不按设备名称猜断点。
- 移动内容采用单列自然阅读顺序，控件位于至少 `16px` inline margin 和 safe-area 内；
  不使用会被软键盘遮挡的固定高度表单区域。
- 快速操作在宽容器中表现为 Dialog，在窄容器中表现为 Bottom Sheet；表单内容可滚动，
  标题和操作区保持可达，底部操作区计算 `env(safe-area-inset-bottom)`。
- 触控目标至少 44×44 CSS px；支持键盘打开、Tab/Shift+Tab、Escape 关闭和焦点恢复。
- 所有文本允许换行并通过中文、英文、日文长字符串验证；200% zoom 下不丢失导航或操作。
- 动画遵守 `prefers-reduced-motion`，暗色主题保持 WCAG 2 AA 对比度。

## Threat Model

| Boundary / asset         | Abuse case                                        | Required control                                                       |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| Cookie session → SSR/API | 伪造、过期或已撤销 session 访问后台               | Better Auth 有效 session + active-account policy + 每请求 D1 role 复核 |
| 客户端 role/UI           | 修改 React 状态或直接打开 URL 提权                | 客户端只控制展示；SSR 和最终 API 写入独立授权                          |
| locale 路由 rewrite      | 通过 `/en/admin` 等前缀绕过 `/admin` guard        | guard 使用解析后的 page segment，覆盖所有支持 locale                   |
| `returnTo` query         | 构造外部 URL 形成开放重定向                       | 仅接受以 `/admin` 开头的站内绝对路径并拒绝 host/scheme 变体            |
| 后台身份上下文           | 向页面、日志或缓存泄露 email/session/用户扩展资料 | 最小字段 allowlist、no-store、禁止敏感日志                             |
| 快速操作 overlay         | 焦点逃逸、背景误操作、键盘关闭后丢失位置          | focus trap、背景 inert/滚动锁定、Escape、焦点恢复                      |

用户已明确排除操作审计历史，因此本模块不建设不可否认性日志；仍保留现有安全日志约束，
不得记录 headers、cookie、token、原始 email/IP、资料或 Error message/stack/cause。

## Testing Strategy

### Unit and server tests

- `resolveAdminAccess`：无 session、无效/已撤销 session、非 active 账户、普通用户、管理员、
  session 角色与当前 D1 角色不一致。
- 页面 adapter：未登录 302、普通用户 403、管理员 authorized；无 locale 和所有支持 locale
  的 `/admin` 路径行为一致。
- API adapter：统一 JSON envelope 下的 401/403 映射，不泄露内部错误。
- `returnTo`：合法后台相对路径可返回；外部 URL、`//host`、反斜杠、编码绕过和非后台路径被拒绝。
- 导航：当前路由状态、只渲染已上线入口、中文/英文/日文标签增长和移动抽屉状态。
- 快速操作：Dialog/Sheet 形态、可访问名称、初始焦点、Tab 圈定、Escape、关闭后焦点恢复、
  reduced-motion 和滚动锁定清理。

### Integration and E2E

- 访客访问 `/admin` 后登录管理员账号，返回原站内后台路径。
- 普通用户直接访问 `/admin` 和已有 `/admin/locations/*` 得到 HTTP 403，页面无后台数据。
- 管理员访问后台首页、桌面侧栏和移动抽屉，并能返回公共前台。
- 公共页面中的后台/快速操作入口只对管理员显示；直接伪造 DOM 不会绕过服务端授权。
- 320px、内容断点附近、1440px 和 200% zoom 下无横向页面溢出，主操作始终可达。
- 键盘和触屏分别完成打开/关闭；关闭后焦点回到原触发按钮。
- 初始公共页面不下载后续地点完整表单 bundle；管理员打开快速操作后才按需加载消费者内容。

不设置脱离风险的全局覆盖率数字；上述每条授权分支和交互状态必须有自动化断言。

## Boundaries

### Always do

- 先写会失败的授权、路由和交互测试，再实现行为。
- 每个 `/admin/*` 页面和管理员 API 都使用共享访问合同。
- 在最终 API 写入边界重新授权；SSR 检查不能替代写入授权。
- 所有外部输入在边界验证，数据库查询参数化，响应遵循现有 API error envelope。
- 管理员页面使用 `private, no-store`，用户可见文案走完整 i18n namespace。
- 使用现有设计 token，并验证键盘、可访问名称、移动端、safe-area、200% zoom 和 reduced-motion。
- 同步更新 `docs/frontend-pages.md`；授权合同变化同步更新 `docs/backend-api.md`。

### Ask first

- 新增角色、修改 Cookie/session/auth 流程或改变 401/403 产品语义。
- 数据库 schema、CI、CORS、rate limit、生产配置或安全 header 变更。
- 新增依赖、运行时插件系统、后台分析指标或收集新的个人数据。
- 将快速操作从单一管理员入口扩展为普通用户可用能力。

### Never do

- 把客户端 `role`、隐藏按钮或路由名称当作授权边界。
- 信任 session 中缓存的旧角色而跳过当前 D1 用户行复核。
- 在日志或错误响应中写入 body、headers、cookie、token、secret、原始 email/IP、用户资料、
  Error message/stack/cause。
- 为后台引入独立 API origin、CORS、第二个 Worker 或前后端双进程。
- 展示尚不可用的后台占位导航，或在首屏加载地点完整表单代码。
- 绕过 i18n、设计 token、焦点管理或 reduced-motion 约束。

## Success Criteria

1. 管理员访问 `/admin` 得到 HTTP 200、独立后台布局和当前已上线模块入口；不存在死链接或
   未实现占位项。
2. 访客访问任意 locale 形式的 `/admin/*` 得到安全的登录跳转；登录后只能返回合法的原
   `/admin` 站内路径，不存在开放重定向。
3. active 普通用户访问任意 `/admin/*` 得到 HTTP 403；管理员页面 HTML 和业务数据均未渲染。
4. 现有及未来管理员 API 通过同一 adapter 返回统一 401/403；移除地点 utils 中的私有
   `requireAdmin` 副本，测试证明不存在客户端提权或过期角色授权。
5. 后台在桌面呈现侧边栏，在内容无法继续容纳时切换为移动顶部栏和抽屉；320px、1440px、
   200% zoom 与中英日文案下没有不可达操作或页面级横向溢出。
6. 快速操作容器满足 Dialog/Bottom Sheet、可访问名称、44×44 目标、焦点圈定、Escape、
   焦点恢复、safe-area 和 reduced-motion 合同。
7. 公共 Navbar 只对管理员呈现后台能力；后续地点表单 bundle 在打开快速操作前不下载。
8. 既有 `/admin/locations/new` 和 `/admin/locations/[id]/edit` 纳入统一 SSR guard 和后台布局，
   其既有业务行为在本模块中不被改写。
9. 定向测试、i18n build/validate、lint、type-check、unit、server tests 和 production build 全部通过。
10. `docs/frontend-pages.md`、必要时的 `docs/design-system.md` 与 `docs/backend-api.md` 和实现一致。

## Open Questions

无。若实现中需要改变已确认假设、模块边界或上述接口合同，必须先更新本规格并重新审批。
