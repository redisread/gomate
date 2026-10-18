# 可登录演示环境方案（待确认，尚未实现）

## 目标与授权

本次目标为在线上提供可登录的演示账号，让这些账号加入明确标注的演示队伍。
用户已授权演示数据，并明确要求完整隔离机制；独立静态展示页不能满足该要求。
本文件是待确认方案，不表示已创建账号、开通资源或放宽正式站写保护。

验收目标：6 个可登录普通账号、3 支演示队伍、仅演示队伍之间的成员分配；
正式用户、队伍名额、统计、通知和存储对象不受影响。

## 已核对的现状

- `src/server/lib/auth.ts` 用 `env.DB` 存储用户、密码账户和会话，并要求邮箱验证；
  当前启用验证邮件、欢迎邮件及可选 Google OAuth。
- `src/server/app.ts` 挂载认证、队伍、用户、地点、上传、反馈和管理员路由。
- `src/worker.ts` 同时承载 API、Astro SSR 和定时任务。
- `wrangler.jsonc` 只有正式 D1 `gomate-db-v3` 和正式域名 `gomate.live`；
  当前 Preview 共享正式 D1/R2，不能充当可写演示环境。
- `scripts/deploy-production.mjs` 只迁移 `DB` 后部署；尚无演示数据库创建、
  schema 初始化、账号配置或演示 smoke 的受保护入口。
- 最新页面文档确认聊天、消息中心及申请审批已退役；本次不恢复这些功能。

## 建议资源和边界

| 项目              | 精确目标                                 | 预期变化                                                                      |
| ----------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Worker            | 现有 `gomate`                            | 复用现有代码与受保护 main 发布                                                |
| 域名              | `demo.gomate.live`                       | 新增同 Worker 的 custom domain，仅明确匹配该 origin 才进入演示上下文          |
| D1                | 新建 `gomate-demo-db`，binding `DEMO_DB` | 独立存储演示认证、业务数据及会话，不复制正式用户数据                          |
| Secret            | `DEMO_AUTH_SECRET`                       | 独立认证密钥，仅由受保护环境提供                                              |
| 初始化 Secret     | `DEMO_BOOTSTRAP_MANIFEST`                | 有界账号清单及密码哈希，初始化成功并核对后移除，不记录其内容                  |
| R2 / 邮件 / OAuth | 不新增资源                               | 演示环境禁止上传、删除对象、反馈投递、邮件发送、注册、密码重置和 Google OAuth |

新增域名、D1 和 secrets 属于明确的基础设施变更，需批准以上精确范围。
不能用本机 Cloudflare 写命令、Dashboard 临时操作或生产数据库 migration 塞入账号。
现行单远程环境文档必须在实现 PR 内明确增加此演示例外，正式 Preview 的保护保持生效。

## 实现约束

1. 在 API 和 SSR 获取 binding 之前解析受信任 origin，构造请求专属环境；
   不修改共享 `env`，不按 query、Cookie、请求体或转发头选择数据库。
   同时覆盖 `src/lib/server-api.ts` 与 `src/middleware.ts` 中直接导入
   `cloudflare:workers` 的路径，避免 SSR 绕过请求上下文。
2. 演示上下文只暴露 `DEMO_DB`、演示认证密钥和必要只读能力；
   允许复用原生认证限流 binding，但限流 key 必须加入服务端确定的环境标识，
   隔离同 IP/邮箱的正式与演示额度，不接受客户端提供环境标识。
   不包含正式 `DB`、R2、邮件或 OAuth 凭据。缺少演示 binding/secret 时拒绝请求，
   禁止退回正式资源。正式入口也不得接受演示会话。
3. 会话使用独立 Cookie 名、host-only、Secure、HttpOnly 和现有 CSRF 校验；
   baseURL / trusted origin 严格匹配演示 origin。不启用跨子域 Cookie。
   隔离验证须包括手工向正式站发送演示 Cookie，以及反方向重放。
4. 所有演示页面（含登录、错误页）有持续可见的多语言演示标识；
   账号和队伍详情标注演示身份，设置 noindex，不写入正式 sitemap。
5. 演示账号为普通用户，不能提升角色或进入管理 API；关闭自助删除、改邮箱和密码变更，
   防止共享演示凭据被访客永久修改。允许登录、查看资料、创建/加入/退出演示队伍。
6. 演示数据只通过演示 DB 读写。正式定时任务继续只访问正式 DB；
   演示队伍到期的处理需单独作用于演示 DB，不允许依赖请求 origin 推断 Cron 的上下文。
7. 先实现有界、幂等且只接受演示 binding 的初始化步骤，再将其接入受保护发布流程。
   准备 schema 与稳定参考目录，随后初始化账号和队伍；业务 seed 不进入 migrations。
   以固定版本 ID 和固定业务 ID 去重，失败保留未就绪状态，核对后重试，不能每次发布重置。
8. 不向假邮箱发信。初始化清单使用保留域名 `.invalid`，预置为已验证身份只适用于
   独立演示数据库，不改正式注册或验证逻辑。密码使用项目现有哈希实现。

## 首批数据与凭据交付

| 登录标识             | 昵称 | 身份     |
| -------------------- | ---- | -------- |
| linzhou@demo.invalid | 林舟 | 演示用户 |
| xiaoman@demo.invalid | 小满 | 演示用户 |
| muyan@demo.invalid   | 木言 | 演示用户 |
| qinghe@demo.invalid  | 清禾 | 演示用户 |
| ayue@demo.invalid    | 阿越 | 演示用户 |
| xingye@demo.invalid  | 星野 | 演示用户 |

三支队伍：公园晨间散步、山间轻徒步、海边日落同行，标题和详情带演示标识。
地点使用演示数据库中的稳定参考目录，按实际地点支持的活动类型匹配。
出发时间以首次初始化时刻后的未来周末为准，不虚构已经发生的活动。
每支队伍一名队长，再从其余五人中抽取 2–3 名成员；同队不重复，人数含队长，
容量为 6。抽样结果在首次初始化时固定保存，重复部署不重新抽签。

六个密码分别随机生成。明文仅保存到本机工作区外、权限为 0600 的交付文件，
不进入 Git、PR、聊天正文、命令参数、构建日志或 artifact；只把哈希清单
交给受保护环境。禁止公开共享密码或提供免登录管理员入口。
密钥配置与初始化清单如何注入受保护环境，需先核实可用的部署能力；
该通道目前未验证，不假设现有 Workers Builds 凭据已具备创建资源或写 secret 权限。

## 验证与完成条件

- 在隔离的两个本地 D1 中验证双向账号、会话和业务数据隔离；认证仍走实际密码校验。
- 用实际 D1 检查重复初始化、部分失败重试和人数约束，不仅依赖 mock。
- 六个账号均能登录，三队详情与成员数一致；退出、重新加入和队长操作可用。
- 同 IP/邮箱耗尽演示登录限流不影响正式登录，反方向亦然；缺失 limiter 时拒绝登录。
- 演示 Cookie、伪造 origin、跨站请求、正式对象 ID、直接调用上传/反馈/管理员接口
  均不能写入正式资源；缺失演示 binding 时失败关闭。
- 正式站公开列表、地图统计、用户资料与 sitemap 不包含演示账号和队伍。
- UI 验证中文、英文、日文，320px/桌面、键盘和 reduced-motion；账号凭据不出现在页面。
- 按仓库门禁执行 `pnpm i18n:build`、`pnpm test:ci`、
  `pnpm worker:types`、`pnpm worker:dry-run`、`pnpm worker:size`、
  `pnpm audit --prod --audit-level high`、`pnpm test:e2e:ci`。
- 子代理按 REVIEW.md 审查当前 head；修复后复审，PR CI 通过再合并。
- 正式与演示域名分别核对 Worker version、health、SSR、登录和跨环境权限边界。
  记录 Build URL 和版本；本地通过或 PR 合并不能替代线上验收。

## 失败与撤销

演示初始化未完成时只关闭演示入口，不停止正式站服务。
需要撤销时通过受保护发布禁用演示 origin；保留演示数据库用于核对，
不自动删除数据库、域名、secret 或重建旧 Worker。演示会话失效和资源清理
需另列精确范围；不得把 Worker 回滚描述为数据回滚。

## 决策题

是否批准新增 `demo.gomate.live`、`gomate-demo-db`、`DEMO_AUTH_SECRET`
及一次性 `DEMO_BOOTSTRAP_MANIFEST`，按上述范围实现可登录的演示环境？
在此范围批准并确认受保护资源配置通道前，不执行远程基础设施写入。

## 参考

- [Cloudflare D1 环境与多 binding 配置](https://developers.cloudflare.com/d1/configuration/environments/)
- [Better Auth Cookie 配置](https://better-auth.com/docs/concepts/cookies)
- [生产变更规约](prod-change-policy.md)
- [前端页面现状](frontend-pages.md)

官方文档用于确认选项可行性；具体代码必须同时核对 lockfile 所用版本与本地依赖实现。
