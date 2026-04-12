## Context

当前项目的配置管理呈现"散落式"特征：

- **wrangler.toml** 中已有 `[vars]` 段，包含 `R2_PUBLIC_URL`、`RESEND_FROM_EMAIL`、`APP_URL`、`FRONTEND_URL`，但这些值在代码中多处 fallback 时又硬编码了一次
- **CORS 白名单** 在 `cors.ts` 和 `auth.ts` 中各自维护了一份，存在不一致风险
- **高德地图 API Key** 在前端组件中硬编码（`AMAP_KEY`），后端 `amap.ts` 中也是硬编码字符串
- **第三方 CDN/外部资源 URL**（字体、社交媒体链接）直接在组件中硬编码

项目已经使用了 Cloudflare Workers 的环境变量机制（`wrangler.toml` 的 `[vars]` 和 `[env.production.vars]`），但代码中大量使用 fallback 硬编码作为"保险"，反而导致配置源混乱。

## Goals / Non-Goals

**Goals:**
- 所有环境相关的配置值统一从 `c.env.*` 或 `import.meta.env.*` 读取
- CORS 白名单单一配置源（wrangler.toml）
- 高德地图 Key 通过环境变量注入，不在源码中暴露
- 保留开发环境的合理默认值，确保 `pnpm dev` 开箱即用
- 生产部署通过 Cloudflare 环境变量设置，无需修改代码

**Non-Goals:**
- 不引入额外的配置管理系统或 .env 文件（依赖 Cloudflare 原生机制）
- 不改变现有的 wrangler.toml 变量名约定（保持 `APP_URL`、`FRONTEND_URL`、`R2_PUBLIC_URL` 等）
- 不修改移动端（Flutter）的配置机制

## Decisions

### 1. CORS 白名单：逗号分隔字符串 → 代码中 split 解析

**选择**：在 `wrangler.toml` 中用逗号分隔的字符串存储多个源（如 `"http://localhost:5432,https://gomate.live"`），代码中用 `split(',')` 解析。

**理由**：wrangler.toml 不支持数组类型的环境变量，Cloudflare Dashboard 也只支持字符串。逗号分隔是最简单且可读性好的方案。

**替代方案**：
- JSON 字符串（如 `'["url1","url2"]'`）→ 需要 `JSON.parse`，增加出错风险
- 多个独立变量（`ORIGIN_1`、`ORIGIN_2`）→ 不灵活，数量变化需改代码

### 2. 高德地图 Key：新增 `AMAP_WEB_KEY` 环境变量

**选择**：新增 `AMAP_WEB_KEY` 环境变量，前端通过 `import.meta.env.PUBLIC_AMAP_WEB_KEY` 读取。

**理由**：高德地图的 Web 端 JS API Key 与后端 REST API Key 可能是不同的（权限范围不同），分开管理更安全。

### 3. 去除代码中的 fallback 硬编码

**选择**：开发环境保留 `|| "http://localhost:xxxx"` 兜底（确保 `pnpm dev` 开箱即用），但生产环境中强制要求环境变量存在，缺失时通过明确错误提示而非静默 fallback。

**理由**：当前 fallback 硬编码让开发者误以为"不需要配环境变量也能跑生产"，实际上生产部署时 Cloudflare 会自动注入 `[env.production.vars]`，不需要代码兜底。

### 4. 字体 CDN 等外部资源 URL

**选择**：对于极少变更的外部资源 URL（如 Google Fonts CDN 替代、像素字体 CDN），如果变更频率极低（1-2 年不变），保留代码中硬编码，不作为重点治理对象。仅对高德 Key、CORS、API URL 等高频/敏感配置做集中管理。

**理由**：过度配置化会增加维护负担。这些 URL 不涉及安全敏感，且极少需要变更。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 去除 fallback 后，本地开发如果环境变量缺失会报错 | 保留 `|| "http://localhost:xxxx"` 兜底，确保开发不受影响 |
| CORS 白名单从单个字符串解析，如果 wrangler.toml 格式错误会导致所有源失效 | 在 cors.ts 中增加解析失败时的 warn 日志，保留空数组时的安全兜底 |
| 高德 Key 变量名从硬编码改为 `AMAP_WEB_KEY`，需要更新 Cloudflare 环境变量 | 在 proposal 中明确列出需要新增的环境变量清单 |
| 多个文件同时修改同一配置变量，存在合并冲突风险 | 每个配置值有明确的单一读取点，避免多处定义 |

## Migration Plan

1. **第一阶段（代码修改）**：更新所有源文件，从环境变量读取，保留 fallback
2. **第二阶段（wrangler.toml 整合）**：确保本地 `[vars]` 和 `[env.production.vars]` 完整
3. **第三阶段（验证）**：本地 `pnpm dev` 验证所有功能正常
4. **第四阶段（部署）**：推送到 main，CI/CD 自动部署，验证生产环境

**回滚策略**：所有改动保留 fallback 逻辑，如果环境变量缺失则回退到原有硬编码值，不会导致生产中断。

## Open Questions

- 高德地图是否有独立的 Web 端 Key 和后端 Key？当前代码中前后端是否共用同一个 Key？
  - 当前代码：前端 `location-edit-client.tsx` 使用 `AMAP_KEY`，后端 `amap.ts` 也使用 `AMAP_KEY` → 统一为 `AMAP_WEB_KEY`（前端）和 `AMAP_SERVER_KEY`（后端）更安全
