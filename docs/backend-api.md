# GoMate API 合同

本文记录当前代码的运行边界；接口字段、状态码和请求示例以自动生成的 OpenAPI 为准，不再维护第二份手写接口目录。仓库代码不证明生产已经部署相同版本。

## 契约与文档入口

统一 Worker 的 Hono 应用在同源 `/api/*` 提供服务，入口为 [app.ts](../src/server/app.ts)。普通路由使用 `@hono/zod-openapi` 的 `createRoute` / `app.openapi`，Zod 4 schema 同时定义输入校验和响应类型；公开 DTO 从 [共享合同](../src/contracts/) 推导。认证 JSON 和 multipart 上传保留有界读取，在同一 registry 登记特殊契约。

| 入口                                         | 内容                     | 权限                               |
| -------------------------------------------- | ------------------------ | ---------------------------------- |
| `/api/openapi.json`、`/api/docs`             | 公开及需登录的产品 API   | 文档可匿名读取，业务仍执行各自权限 |
| `/api/admin/openapi.json`、`/api/admin/docs` | 包含管理员操作的完整规范 | 当前 active admin                  |

`API_DOCS_ENABLED=true` 开启四个入口，其他值返回 404。公开规范排除管理员操作及仅由这些操作引用的组件；管理员 JSON 与 HTML 都独立鉴权。Scalar 资源由锁定版本构建到同源静态资源，生产/Preview 隐藏交互请求按钮，不持久保存认证信息。新增普通路由须登记 audience，覆盖测试检查实际路由和规范对应关系。

### 中文文档与维护方式

文档标题、Scalar 界面、分组、接口摘要、使用说明及关键字段注释统一使用简体中文，不随
`gomate_locale` 或 `Accept-Language` 切换。产品页面和邮件仍按现有中英文策略工作。
路径、字段名、枚举值、错误码与 `operationId` 保持稳定；完整文档多语言留待后续实现。

接口说明直接维护在 `createRoute`，字段语义使用共享或请求 Schema 的 `.describe()` / `.openapi()`。
说明应覆盖身份权限、分页、状态限制、幂等及失败处理；公共错误说明集中在 OpenAPI helper，
全局写保护由文档生成器补充。新增操作必须有中文摘要、使用说明及响应描述，覆盖测试同时检查
公开/管理员文档隔离与退役接口不再出现，不另行手写 OpenAPI JSON。

多数列表使用 `limit/cursor`，`nextCursor=null` 表示结束，更换筛选后重新分页；标签目录保留
`page/pageSize`，默认每页 50、最大 200，优先采用 `pageSize`，其次 `limit`。
地图统计仅包含坐标完整的公开地点，`total` 与 `points` 使用同一口径。

## 请求与认证边界

- 浏览器请求同源 `/api/*`；Astro SSR 使用进程内 dispatcher，不向生产域名 self-fetch。
- Better Auth 仅暴露受控产品入口，session 使用 HttpOnly Cookie；邮箱验证和密码重置 token 从 URL fragment 经同源 POST body 提交，不进入 query/path 或日志。
- 携带 Cookie 的写请求先校验正式 `APP_URL` 或合法 Preview origin，再读业务 body；不满足条件返回 403。
- `WRITE_MODE=protected` 拒绝业务写入并返回 503、`Retry-After: 60`。合法 Preview 只允许特定登录/退出操作和相应 session 写入；其余业务写入仍被拒绝。Preview URL 不等于访问控制。
- 管理员操作从当前 D1 用户行复核 active、未删除及 admin 角色，不信任 UI 或缓存角色。无有效身份为 401，活跃普通用户为 403。
- 未匹配的 API 返回 JSON 404，不进入 Astro。已移除功能没有兼容别名。
- 错误 envelope 为 `{ success: false, error: { code, message, details? } }`。管理员 UI 使用稳定 reason 的翻译映射，未知错误显示本地化通用提示。
- HTTP 时间为 ISO 8601，D1 为 Unix 毫秒。列表采用有界分页；各模块允许的参数以生成契约为准。

## 核心业务行为

### 地点与队伍

公开地点必须是 published 且所属 city 已启用服务。筛选保留“城市单选、兴趣多选”：标签间 OR、不同维度间 AND。管理员默认归档地点，永久删除需要精确确认且没有队伍引用。

加入队伍直接写入 active membership，不存在申请/审批。人数上限包含队长，加入必须在活动开始前、开放招募、未取消且有名额。最终 SQL 同时复核用户状态、队伍状态和容量；数据库触发器提供最终人数护栏。重复加入已加入队伍返回成功的 `already_member`，不重复占用名额。退出与队长移除成员同样受活动时间、身份和最终写条件约束。

队伍的招募状态与生命周期不同；是否可加入由状态、时间和容量共同决定。集合信息属于队伍本身。完整状态与字段来自生成规范及 [数据库文档](database.md)，不保留行动本、聊天或故事回顾接口。

### 媒体

仅保留头像与地点媒体上传。服务端限制 multipart 总量和单文件大小，以实际内容识别格式；允许的格式与失败 reason 来自上传契约。HEIC/HEIF 经 Images binding 转为 WebP。R2 对象与 D1 引用分阶段提交，使用临时/最终 key、条件更新和有界清理；Worker 回滚不恢复已删除对象。

### 反馈

唯一反馈入口接受 `requestId`（UUID）、`email`、`content`：邮箱规范化，内容去空白后 1–5000 字符，实际请求体不超过 32 KiB；旧联系表单字段不再接受。反馈不保存为工单，发送到支持邮箱；HTML 转义，供应商返回失败或超时不会显示成功，不自动重发结果未知的邮件。同一表单内容失败后重试保留 `requestId`，更改内容或成功后重新提交生成新 ID；服务端向 Resend 传递 `feedback/{requestId}` 幂等键。供应商去重窗口为 24 小时，页面刷新或超过窗口不提供永久去重保证。参见 [Resend 幂等键](https://resend.com/docs/dashboard/emails/idempotency-keys)。

反馈复用已有 `AUTH_EMAIL_RATE_LIMITER`，每 key 每 60 秒 5 次，以加 `feedback:` 前缀后计算的客户端 IP 摘要作为 key。拒绝返回 429 和 `Retry-After: 60`，保护服务不可用返回 503。匿名反馈没有可信用户身份，因此采用 IP 摘要限流，共享网络用户可能共用额度；此为边缘防滥用限制，不是严格全局计数；其平台语义见 [Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。反馈与认证邮件使用不同 key 空间，复用同一个 binding，不新增 Cloudflare 资源。

## 测试与维护

主要验证边界是 Hono HTTP；Worker 测试确认真实入口、绑定、SSR 和写保护，少量浏览器测试验证核心组队流程与中英文。不要用纯 schema 快照替代真实响应、授权、并发及失败测试。

当前没有运行时 KV 或 Queues binding，不存在自动 outbox、跨存储事务或全局反馈配额。后续选型须依据 [可靠性与性能设计](../CODING_STANDARDS.md#可靠性与性能设计) 记录事实、适用条件和验证，不把建议写成已实现能力。
