## Why

当前项目中存在多处硬编码配置，包括 API 地址、CORS 白名单、R2 公共 URL、邮件模板 URL、高德地图 Key、第三方字体 CDN 等。这些硬编码值散落在 10+ 个源文件中，导致：

1. **环境切换困难**：本地/生产/预发环境切换需要改动多处代码
2. **部署风险**：敏感信息（如高德地图 API Key）暴露在源码中
3. **维护成本高**：修改一个配置值需要同时更新多个文件，容易遗漏
4. **移动端访问受限**：CORS 白名单中的局域网 IP 正则虽能覆盖，但本地 localhost 地址在移动端调试时需要额外配置

## What Changes

- **集中配置管理**：将所有硬编码值统一收拢到 `wrangler.toml` 的 `[vars]` 段，通过环境变量注入
- **CORS 配置动态化**：CORS 白名单从环境变量读取，而非写死在代码中
- **R2 公共 URL 统一**：去除代码中的 fallback 硬编码值，强制从环境变量获取
- **Better Auth 配置动态化**：`trustedOrigins` 和 `baseURL` 从环境变量读取
- **高德地图 Key 环境变量化**：前后端的高德地图 API Key 统一从环境变量注入
- **第三方 CDN 地址配置化**：字体 CDN、社交媒体链接等外部资源地址配置化

## Capabilities

### New Capabilities
- `env-config-management`: 统一的环境变量配置管理体系，涵盖 CORS、R2 URL、Auth 配置、第三方服务 Key 等
- `dynamic-cors-origins`: 从环境变量动态读取 CORS 白名单，支持运行时配置
- `external-service-keys`: 第三方服务密钥（高德地图、Resend 邮件、字体 CDN）的环境变量管理

### Modified Capabilities
- (无现有 spec 需要修改)

## Impact

**受影响文件：**
- `api/wrangler.toml` — 新增/整合配置项
- `api/src/middleware/cors.ts` — CORS 白名单从 env 读取
- `api/src/lib/auth.ts` — trustedOrigins 和 baseURL 从 env 读取
- `api/src/routes/upload.ts` — R2 URL 从 env 读取，去除 fallback
- `api/src/routes/amap.ts` — 高德 Key 从 env 读取
- `frontend/src/lib/api.ts` — API 基地址处理优化
- `frontend/src/lib/auth-client.ts` — Auth URL 处理优化
- `frontend/src/components/features/location-edit-client.tsx` — 高德 Key 从 env 读取
- `frontend/src/components/features/location-detail-main-content.tsx` — 高德导航 URL 模板配置化
- `frontend/src/components/ui/multi-image-upload.tsx` — R2 URL 处理优化
- `frontend/src/components/ui/cover-image-upload.tsx` — R2 URL 处理优化
- `frontend/src/components/features/share-poster-modal.tsx` — 字体 CDN 配置化
- `frontend/src/components/features/poster-content.tsx` — 字体 CDN 配置化

**行为变化：**
- 本地开发：需确保 `wrangler.toml` 中 `[vars]` 段完整（已存在，仅需整合）
- 生产部署：需在 Cloudflare Dashboard 或 wrangler 中设置对应的环境变量
- 向后兼容：所有环境变量保留原有 fallback 逻辑作为过渡，确保已有部署不中断
