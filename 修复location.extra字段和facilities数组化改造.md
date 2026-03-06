# Locations 表 Extra 字段修复与 Facilities 数组化改造

## 修复概述

本次修复解决了 `locations` 表的 `extra` 字段使用不当和 `facilities` 格式优化问题。

### 修复前的问题

1. **代码逻辑错误**：API 代码尝试读写不存在的字段（`location.facilities`、`location.tips` 等），导致 `extra` 数据无法被正确使用
2. **Facilities 格式低效**：使用对象格式 `{parking: true, restroom: false, ...}` 存储，改为字符串数组 `["parking", "restroom"]` 更简洁

### 修复后的效果

- ✅ 所有 API 统一使用 `location.extra` 字段存储和读取扩展信息
- ✅ `facilities` 从对象格式改为数组格式，更简洁高效
- ✅ 数据库中 14 条地点记录全部成功迁移
- ✅ 前端组件适配新的数组格式

## 修改文件清单

### 1. 数据迁移脚本

#### 新建文件：`scripts/migrate-facilities-to-array-local.ts`
- 将 `extra.facilities` 从对象格式转为数组格式
- 使用 better-sqlite3 直接访问本地 D1 数据库
- 迁移结果：14 条记录全部成功

### 2. 类型定义

#### 修改文件：`lib/types.ts`
**修改内容**：
- 将 `extra.facilities` 类型从对象改为字符串数组
- 删除兼容层中的 `facilities` 对象定义

```typescript
// 修改前
extra?: {
  facilities?: {
    parking: boolean;
    restroom: boolean;
    water: boolean;
    food: boolean;
  };
  tips?: string;
  warnings?: string[];
};

// 修改后
extra?: {
  facilities?: string[];  // ["parking", "restroom", "water", "food"]
  tips?: string;
  warnings?: string[];
};
```

### 3. API 路由修改

#### 修改文件：`app/api/locations/route.ts`

**GET 请求（第 37 行）**：
```typescript
// 修改前
extra: {
  facilities: location.facilities ? JSON.parse(location.facilities as string) : undefined,
  tips: location.tips || undefined,
  warnings: location.warnings ? JSON.parse(location.warnings as string) : undefined,
},

// 修改后
extra: location.extra ? JSON.parse(location.extra as string) : undefined,
```

**POST 请求（第 120-147 行）**：
删除以下不存在字段的写入逻辑：
- `difficulty`, `duration`, `distance`, `elevation` （已移至 routes 表）
- `routeDescription`, `routeGuide`, `waypoints`, `equipmentNeeded` （已移至 routes 表）
- `tips`, `warnings`, `facilities` （应通过 extra 字段存储）
- `tags`, `adcode` （tags 已独立表，adcode 不再使用）

新增 `extra` 字段写入：
```typescript
extra: body.extra ? JSON.stringify(body.extra) : null,
```

**PUT 请求（第 200-226 行）**：
删除所有不存在字段的更新逻辑，新增：
```typescript
if (updateData.extra !== undefined) {
  dataToUpdate.extra = updateData.extra ? JSON.stringify(updateData.extra) : null;
}
```

#### 修改文件：`app/api/locations/[id]/route.ts`

**GET 请求（第 55-68 行）**：
```typescript
// 修改前
return NextResponse.json({
  success: true,
  location: {
    ...location,
    images: safeJsonParse(location.images, []),
    bestSeason: safeJsonParse(location.bestSeason, []),
    tags: safeJsonParse(location.tags, []),
    coordinates: safeJsonParse(location.coordinates, { lat: 0, lng: 0 }),
    waypoints: safeJsonParse(location.waypoints, []),
    warnings: safeJsonParse(location.warnings, []),
    equipmentNeeded: safeJsonParse(location.equipmentNeeded, []),
    facilities: safeJsonParse(location.facilities, { parking: false, ... }),
    routeGuide: safeJsonParse(location.routeGuide, {}),
  },
});

// 修改后
return NextResponse.json({
  success: true,
  location: {
    ...location,
    images: safeJsonParse(location.images, []),
    bestSeason: safeJsonParse(location.bestSeason, []),
    coordinates: safeJsonParse(location.coordinates, { lat: 0, lng: 0 }),
    extra: safeJsonParse(location.extra, undefined),
  },
});
```

### 4. 数据层修改

#### 修改文件：`lib/data/locations.ts`

**parseLocation 函数（第 7-22 行）**：
```typescript
// 修改前
function parseLocation(location: Record<string, unknown>) {
  return {
    ...location,
    bestSeason: typeof location.bestSeason === 'string' ? JSON.parse(location.bestSeason) : location.bestSeason,
    images: typeof location.images === 'string' ? JSON.parse(location.images) : location.images,
    equipmentNeeded: location.equipmentNeeded ? ... : [],
    coordinates: typeof location.coordinates === 'string' ? JSON.parse(location.coordinates) : location.coordinates,
    tags: typeof location.tags === 'string' ? JSON.parse(location.tags) : location.tags,
    waypoints: typeof location.waypoints === 'string' ? JSON.parse(location.waypoints) : location.waypoints,
    warnings: typeof location.warnings === 'string' ? JSON.parse(location.warnings) : location.warnings,
    facilities: typeof location.facilities === 'string' ? JSON.parse(location.facilities) : location.facilities,
    routeGuide: typeof location.routeGuide === 'string' ? JSON.parse(location.routeGuide) : location.routeGuide,
    adcode: location.adcode || undefined,
    cityName: location.cityName || undefined,
  };
}

// 修改后
function parseLocation(location: Record<string, unknown>) {
  return {
    ...location,
    bestSeason: typeof location.bestSeason === 'string' ? JSON.parse(location.bestSeason) : location.bestSeason,
    images: typeof location.images === 'string' ? JSON.parse(location.images) : location.images,
    coordinates: typeof location.coordinates === 'string' ? JSON.parse(location.coordinates) : location.coordinates,
    extra: typeof location.extra === 'string' ? JSON.parse(location.extra) : location.extra,
  };
}
```

### 5. 前端组件修改

#### 修改文件：`app/components/features/location-info-card.tsx`

```typescript
// 修改前
const facilities = location.extra?.facilities || location.facilities;
const facilityList = facilities ? [
  { icon: Car, label: "停车场", available: facilities.parking },
  { icon: Toilet, label: "洗手间", available: facilities.restroom },
  { icon: Droplets, label: "补给点", available: facilities.water },
  { icon: UtensilsCrossed, label: "餐饮", available: facilities.food },
] : [];

// 修改后
const facilities = location.extra?.facilities || [];
const facilityConfig = [
  { key: "parking", icon: Car, label: "停车场" },
  { key: "restroom", icon: Toilet, label: "洗手间" },
  { key: "water", icon: Droplets, label: "补给点" },
  { key: "food", icon: UtensilsCrossed, label: "餐饮" },
];
const facilityList = facilityConfig.map(config => ({
  ...config,
  available: facilities.includes(config.key),
}));
```

#### 修改文件：`components/features/location-info-card.tsx`

同样的修改逻辑。

## 数据迁移结果

### 迁移统计
- ✅ 成功迁移：14 条
- ⏭️ 跳过：0 条
- ❌ 失败：0 条
- 📊 总计：14 条

### 迁移示例

| 地点名称 | 迁移前（对象格式） | 迁移后（数组格式） |
|---------|------------------|------------------|
| 七娘山 | `{parking:true, restroom:true, water:false, food:false}` | `["parking","restroom"]` |
| 梧桐山 | `{parking:true, restroom:true, water:true, food:true}` | `["parking","restroom","water","food"]` |
| 东西冲 | `{parking:true, restroom:false, water:false, food:false}` | `["parking"]` |
| 排牙山 | `{parking:false, restroom:false, water:false, food:false}` | `[]` |

## 验证方法

### 1. 数据库验证
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
  "SELECT id, name, json_extract(extra, '$.facilities') FROM locations LIMIT 3;"
```

预期输出：
```
qiniangshan|七娘山|["parking","restroom"]
wutongshan|梧桐山|["parking","restroom","water","food"]
dongxichong|东西冲|["parking"]
```

### 2. 运行验证脚本
```bash
npx tsx scripts/verify-facilities-migration.ts
```

### 3. API 测试
```bash
npm run dev
curl http://localhost:3000/api/locations | jq '.locations[0].extra.facilities'
```

预期输出：`["parking", "restroom", "water"]`

### 4. 前端测试
访问地点详情页（如 `http://localhost:3000/locations/wutongshan`），确认：
- 配套设施图标正确显示（有的显示绿色勾，无的显示灰色叉）
- 所有 4 种设施（停车场、洗手间、补给点、餐饮）都能正确渲染

## 技术要点

### 1. Schema 设计原则
- `extra` 字段用于存储扩展信息，采用 JSON 格式
- 核心字段（如 `name`、`description`）直接存储在表中
- 路线相关字段（如 `difficulty`、`duration`）已移至 `routes` 表

### 2. 数据格式优化
- **对象格式**：`{parking: true, restroom: false, ...}` - 占用空间大，需遍历所有键
- **数组格式**：`["parking", "restroom"]` - 占用空间小，只存储有效值

### 3. 前端适配
- 使用 `includes()` 方法检查设施是否可用
- 配置驱动的渲染逻辑，易于扩展新设施类型

## 后续优化建议

1. **统一 Extra 字段使用**：确保所有新增的扩展信息都通过 `extra` 字段存储
2. **类型安全**：为 `extra` 字段创建专门的 TypeScript 类型定义
3. **文档完善**：在 CLAUDE.md 中明确 `extra` 字段的使用规范
4. **测试覆盖**：添加单元测试验证 `extra` 字段的序列化和反序列化

## 相关文档

- [数据库 Schema 文档](./db/schema.ts)
- [CLAUDE.md 项目指引](./CLAUDE.md)
- [重构文档：Locations 拆分为 Locations + Routes](./docs/refactor-locations-routes.md)

---

**修复时间**：2026-03-05
**修复人员**：Claude Opus 4.6 (1M context)
**影响范围**：数据库（14 条记录）、API 路由（4 个文件）、前端组件（2 个文件）
