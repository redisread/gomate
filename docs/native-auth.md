# iOS 原生认证

GoMate iOS 复用现有用户、账号及可撤销 session。原生请求通过 `Authorization: Bearer` 认证，最终权限仍经过当前账号状态与资源归属检查。浏览器继续从受控入口使用 HttpOnly Cookie，浏览器登录与 session JSON 保持移除 token。

## 邮箱与会话

`POST /api/auth/native/sign-in/email` 复用现有密码校验与邮箱验证规则，响应包含 `token`。原生客户端将其存入按 origin 隔离的 Keychain。注册、邮件验证、重置密码、注销及业务接口复用现有公开合同。

原生登录入口拒绝 Cookie 和跨站 Origin，并检查正式或本地 origin 以及 `WRITE_MODE=open`。共享生产数据的 Preview 不提供原生认证写入。

## Google

1. App 生成高熵 verifier，将 SHA-256 challenge 提交到 `/api/auth/native/google/start`。
2. 服务端在现有 verifications 表记录五分钟有效的请求，返回系统认证窗口 URL。
3. Google OAuth state 验证成功后，回调处理从此次新建会话取得身份，绑定请求并生成随机兑换码。数据库仅保存兑换码摘要。
4. 固定回跳 `gomate://auth/callback` 的 fragment 携带请求 ID 和兑换码。App 验证请求 ID，再将请求 ID、兑换码及 verifier 放入 `/api/auth/native/exchange` 的 JSON body。
5. 条件 `DELETE RETURNING` 原子消费请求。只有同时持有兑换码和 verifier 的客户端可获得新会话。响应丢失后重新发起登录。

普通 GET 完成地址无法根据既有浏览器 Cookie 授予原生会话。回跳地址固定，API 日志使用路由模板。

## Apple

`POST /api/auth/native/sign-in/apple` 接收原生授权码、nonce 和可选姓名。服务端兑换一次性授权码，Better Auth 校验 ID token 的签名、issuer、audience 和 nonce。Apple 后续缺少 email 时，仅按已验证的 provider subject 查询既有账号邮箱。

Better Auth 1.7.10 的 ID-token 登录路径没有自动保存 refresh token，因此受控的单次 Apple 登录实例通过账号 create/update hook 一并写入加密 refresh token。账号删除先撤销 Apple 授权，撤销失败返回可重试错误并保留账号，后续执行头像清理、个人资料匿名化及本地凭据和 session 撤销。

## 部署配置

正式 Worker `gomate` 的受保护运行时需提供 `APPLE_CLIENT_ID`、`APPLE_TEAM_ID`、`APPLE_KEY_ID` 和 `APPLE_PRIVATE_KEY`。客户端 ID 使用 iOS Bundle ID，私钥使用 PEM 格式。服务端按请求生成五分钟有效的 Apple client secret。

公开变量 `IOS_APP_ID` 使用 `TeamID.BundleID`。`/.well-known/apple-app-site-association` 据此为邮箱验证和密码重置页面声明 Universal Links。未配置时返回空关联目录，邮件仍可由 Web 处理。

这些值通过现有受保护环境配置，代码提交本身没有设置远程配置。该变更复用现有 D1 表、Worker 和 rate limit binding，新增路由随已审核 PR 的 main 发布流程上线。回滚 Worker 会关闭新增原生认证能力，已创建的用户与账号仍保留在共享数据中。
