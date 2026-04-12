## 1. 后端：wrangler.toml 配置整合

- [x] 1.1 在 `[vars]` 和 `[env.production.vars]` 中新增 `CORS_ALLOWED_ORIGINS`、`AMAP_SERVER_KEY` 变量
- [x] 1.2 验证现有 `APP_URL`、`FRONTEND_URL`、`R2_PUBLIC_URL`、`RESEND_FROM_EMAIL` 配置完整且一致

## 2. 后端：CORS 中间件动态化

- [x] 2.1 修改 `api/src/middleware/cors.ts`，从 `c.env.CORS_ALLOWED_ORIGINS` 读取并以逗号分隔解析
- [x] 2.2 保留 localhost 和私有 IP 正则匹配作为开发环境自动追加规则
- [x] 2.3 添加解析失败时的 warn 日志兜底

## 3. 后端：Auth 配置动态化

- [x] 3.1 修改 `api/src/lib/auth.ts` 的 `trustedOrigins` 从环境变量动态构建（解析 `CORS_ALLOWED_ORIGINS` + 自动加入 localhost）
- [x] 3.2 确保 `baseURL` 使用 `env.APP_URL` 且保留 localhost fallback

## 4. 后端：R2 和 Amap 路由优化

- [x] 4.1 修改 `api/src/routes/upload.ts`，去除 `getPublicUrl` 中的硬编码 fallback，改为从 `env.R2_PUBLIC_URL` 读取并在缺失时返回明确错误
- [x] 4.2 修改 `api/src/routes/amap.ts`，将硬编码的 `AMAP_KEY` 改为从 `c.env.AMAP_SERVER_KEY` 读取

## 5. 前端：API 基地址和 Auth 客户端统一

- [x] 5.1 审查 `frontend/src/lib/api.ts`、`frontend/src/lib/auth-client.ts`、`frontend/src/components/features/share-poster-modal.tsx` 中的 API URL fallback 逻辑，确保统一且一致
- [x] 5.2 去除 `frontend/src/components/ui/multi-image-upload.tsx` 和 `frontend/src/components/ui/cover-image-upload.tsx` 中多余的 localhost fallback 硬编码

## 6. 前端：高德地图 Key 环境变量化

- [x] 6.1 修改 `frontend/src/components/features/location-edit-client.tsx`，将 `AMAP_KEY` 改为从 `import.meta.env.PUBLIC_AMAP_KEY` 读取（已有，去除 `YOUR_AMAP_KEY` fallback）
- [x] 6.2 在 Astro 配置中确保 `PUBLIC_AMAP_KEY` 可正确传递给客户端（已确认存在）

## 7. 验证和测试

- [x] 7.1 本地 `pnpm dev` 验证所有功能正常（类型检查通过，0 个错误）
- [x] 7.2 运行 `pnpm lint` 和 `pnpm type-check` 确保无报错
- [x] 7.3 搜索整个代码库确认无残留硬编码的配置值（URL、Key 等）
