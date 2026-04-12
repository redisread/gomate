# client-data-fetching Specification

## Purpose
TBD - created by archiving change migrate-frontend-to-workers. Update Purpose after archive.
## Requirements
### Requirement: 所有数据获取通过客户端 fetch 调用 API Worker
前端所有动态数据获取 MUST 通过浏览器端 `fetch()` 调用后端 API Worker（`https://api.gomate.live`），不依赖 SSR 数据注入。

#### Scenario: 页面加载后客户端请求数据
- **WHEN** 用户访问首页 `/`
- **THEN** 页面 HTML 壳加载后，`HomeClient` 组件通过 `fetchAPI()` 请求后端 API
- **AND** 数据展示在页面上

#### Scenario: API 地址使用 PUBLIC_API_URL
- **WHEN** `api.ts` 中的 `fetchAPI()` 被调用
- **THEN** 请求目标为 `import.meta.env.PUBLIC_API_URL` + 路径
- **AND** 本地开发时指向 `http://localhost:8799`
- **AND** 生产环境时指向 `https://api.gomate.live`

### Requirement: CORS 配置兼容静态前端来源
后端 API Worker 的 CORS 配置 MUST 允许前端 Workers 域名（`https://gomate.live`）作为合法来源。

#### Scenario: 跨域请求成功
- **WHEN** 前端 Workers（`https://gomate.live`）向后端 API Worker（`https://api.gomate.live`）发送请求
- **THEN** 响应包含正确的 `Access-Control-Allow-Origin` 头
- **AND** 请求正常完成，无 CORS 错误

