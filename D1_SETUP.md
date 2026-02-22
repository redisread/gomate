# CloudFlare D1 设置指南

## 概述

项目已迁移到 **CloudFlare D1** (SQLite-based serverless 数据库)。

## 开发模式

### 模式 1: 本地 D1 模拟（推荐开发使用）
运行 `npm run cf:dev` 自动启用本地 D1 模拟，无需额外配置。

### 模式 2: 本地 SQLite（备用方案）
```bash
# .env.local
USE_LOCAL_DB=true
LOCAL_DB_PATH=./local.db
```

### 模式 3: CloudFlare D1（生产环境）
```bash
# .env.local
USE_LOCAL_DB=false
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

## 创建 D1 数据库步骤

### 1. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 2. 登录 CloudFlare
```bash
wrangler login
```

### 3. 创建数据库
```bash
wrangler d1 create gomate-db
```

### 4. 获取数据库 ID
```bash
wrangler d1 list
```

### 5. 配置环境变量
在 `.env.local` 中填入：
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账号 ID
- `CLOUDFLARE_DATABASE_ID`: 上一步获取的数据库 ID
- `CLOUDFLARE_D1_TOKEN`: API Token（在 Cloudflare Dashboard 创建）

### 6. 生成并执行迁移
```bash
# 生成迁移文件
npm run db:generate

# 推送到 D1（使用 wrangler）
wrangler d1 migrations apply gomate-db
```

## 数据库 Schema

D1 使用 SQLite 语法，主要变化：

| PostgreSQL | SQLite/D1 |
|------------|-----------|
| `uuid` | `text` |
| `timestamp` | `integer` (Unix timestamp) |
| `jsonb` | `text` (JSON string) |
| `boolean` | `integer` (0/1) |
| 数组类型 | `text` (JSON string) |

## Drizzle Kit 命令

```bash
# 生成迁移
npm run db:generate

# 应用到本地 SQLite
npm run db:migrate

# 应用到 D1（通过 wrangler）
wrangler d1 migrations apply gomate-db

# 查看数据库（Drizzle Studio）
npm run db:studio
```

## 部署到 CloudFlare Workers

### 1. 配置 wrangler.toml
```toml
name = "gomate"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "gomate-db"
database_id = "your-database-id"
```

### 2. 部署
```bash
wrangler deploy
```

## 注意事项

1. **JSON 字段**: D1 中 JSON 数据以字符串存储，需要手动解析/序列化
2. **时间戳**: 使用 Unix 时间戳（整数）存储
3. **UUID**: 使用字符串形式存储
4. **关系查询**: Drizzle ORM 支持关系查询，但配置与 PostgreSQL 略有不同

## 故障排除

### 问题: 无法连接到 D1
- 检查 `CLOUDFLARE_D1_TOKEN` 是否有 D1:Edit 权限
- 验证 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_DATABASE_ID` 是否正确

### 问题: 迁移失败
- D1 不支持某些 SQLite 特性（如 ALTER TABLE 的部分操作）
- 考虑删除重建数据库或使用 `wrangler d1 execute` 执行原始 SQL

### 问题: 开发环境报错
- 本地 D1 模式需要运行 `npm run cf:dev`
- 本地 SQLite 模式需要 `better-sqlite3` 正确安装
