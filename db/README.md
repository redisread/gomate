# GoMate 数据库开发指南

## 技术栈

- **ORM**: Drizzle ORM
- **数据库**: SQLite (本地开发) / Cloudflare D1 (生产环境)
- **迁移工具**: Drizzle Kit
- **Seed 工具**: better-sqlite3 + tsx

## 常用命令

### 开发环境

```bash
# 生成本地迁移文件（基于 schema.ts 的变更）
npm run db:generate

# 推送 schema 到本地数据库（开发时使用）
npm run db:push

# 启动 Drizzle Studio（可视化数据库管理）
npm run db:studio

# 填充 seed 数据（增量添加）
npm run db:seed

# 清空并重新填充 seed 数据
npm run db:seed:clear

# 重置本地数据库（清空 + schema + seed）
npm run db:reset
```

### 生产环境 (Cloudflare D1)

```bash
# 应用迁移到本地 D1
npm run d1:migrate:local

# 应用迁移到生产 D1
npm run d1:migrate:prod

# 生成 Wrangler 类型定义
npm run cf:typegen
```

## 目录结构

```
db/
├── index.ts          # 数据库连接配置
├── migrate.ts        # 迁移工具
├── schema.ts         # 数据库 schema 定义（15个表）
├── seed/             # Seed 数据目录
│   ├── index.ts      # Seed 主入口
│   ├── cities.ts     # 城市数据
│   ├── locations/    # 地点数据
│   │   ├── index.ts
│   │   └── shenzhen.ts
│   ├── routes/       # 路线数据
│   │   ├── index.ts
│   │   └── wutongshan.ts
│   ├── pois/         # POI 数据
│   │   ├── index.ts
│   │   └── wutongshan.ts
│   └── tags.ts       # 标签数据
└── README.md         # 本文件

drizzle/
├── 0000_initial_schema.sql  # 基础迁移文件
└── meta/
    └── _journal.json        # 迁移日志
```

## 添加新的 Seed 数据

### 添加新城市

编辑 `db/seed/cities.ts`，在 `citiesData` 数组中添加：

```typescript
{
  adcode: "440100",    // 城市行政区划代码
  name: "广州",        // 城市名称
  pinyin: "guangzhou", // 拼音
  province: "广东省",  // 所属省份
  level: "city",       // city | district
  isHot: true,         // 是否热门城市
  parentId: null,      // 父级 ID
}
```

### 添加新地点

1. 在 `db/seed/locations/` 下创建新的城市文件（如 `guangzhou.ts`）
2. 参考 `shenzhen.ts` 的格式定义地点数据
3. 在 `db/seed/locations/index.ts` 中导入并调用

### 添加新路线

1. 在 `db/seed/routes/` 下创建地点对应的路线文件
2. 定义路线数组，包含：名称、描述、难度、距离、耗时等
3. 在 `db/seed/routes/index.ts` 中导入并调用

### 添加新 POI

1. 在 `db/seed/pois/` 下创建地点对应的 POI 文件
2. 定义 POI 数组和实体关联数据
3. 在 `db/seed/pois/index.ts` 中导入并调用

### 添加新标签

编辑 `db/seed/tags.ts`，在 `tagsData` 和 `entityTagAssociations` 中添加。

## 修改 Schema

1. 编辑 `db/schema.ts` 修改表结构
2. 运行 `npm run db:generate` 生成迁移文件
3. 运行 `npm run db:migrate` 应用迁移（或 `npm run db:push` 直接推送）

## 数据依赖关系

Seed 数据按以下顺序插入：

```
1. cities (无依赖)
   ↓
2. locations (依赖 cities)
   ↓
3. routes (依赖 locations, cities)
   ↓
4. pois (无依赖)
   ↓
5. entity_to_pois (依赖 pois, locations/routes)
   ↓
6. tags (无依赖)
   ↓
7. entity_to_tags (依赖 tags, locations/routes)
```

**注意**: users, teams, team_members, user_favorites 为运行时数据，不参与 seed。

## 本地开发数据库位置

本地开发使用 better-sqlite3，数据库文件位置：

- **默认**: `./local.db`
- **Wrangler 模拟**: `./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`

直接查询本地 D1：

```bash
# 使用 sqlite3 CLI
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT * FROM users;"

# 或使用 Drizzle Studio
npm run db:studio
```

## 注意事项

1. **迁移文件**: 新的基础迁移文件 `0000_initial_schema.sql` 包含所有表的最终状态
2. **备份**: 旧迁移文件已备份到 `drizzle-archive/` 目录
3. **ID 生成**: 所有 seed 数据使用 `nanoid()` 生成唯一 ID
4. **JSON 字段**: 数组和对象使用 `JSON.stringify()` 序列化后存储
5. **时间戳**: 使用 `Date.now()` 生成 Unix 毫秒时间戳
