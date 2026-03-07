# POI 重构快速入门指南

## 🎯 目标

将 `points` 表重构为 `pois`（物理实体）+ `entity_to_pois`（角色关联）的双表结构，解决数据冗余问题。

## 📋 前置条件

- Node.js >= 20.0.0
- npm >= 10.0.0
- 已有本地开发环境（`.wrangler/state/v3/d1/` 目录存在）

## 🚀 执行步骤

### Step 1: 安装依赖

```bash
npm install
```

这会安装新增的 `tsx` 依赖，用于运行 TypeScript 脚本。

### Step 2: 生成迁移文件

```bash
npm run db:generate
```

这会根据 `db/schema.ts` 的变更生成 Drizzle 迁移文件。

### Step 3: 应用数据库迁移

**本地开发环境：**

```bash
npm run db:migrate
```

**远程 Cloudflare D1（可选）：**

```bash
npm run d1:migrate:prod
```

### Step 4: 迁移数据

```bash
npm run migrate:points-to-pois
```

**预期输出：**

```
📁 使用数据库: .wrangler/state/v3/d1/miniflare-D1DatabaseObject/xxx.sqlite

🔍 Step 1: 检查数据库状态...
✅ 发现 X 条 point 记录
✅ 新表已创建

🔍 Step 2: 分析数据，识别重复的物理位置...
📊 统计信息:
   - 总 point 数: X
   - 唯一坐标数: Y
   - 重复位置数: Z

🚀 Step 3: 开始数据迁移...
📝 准备插入:
   - Y 条 POI 记录
   - X 条角色关联记录

✅ 数据迁移成功！

🔍 Step 4: 验证数据完整性...
✅ 坐标唯一性验证通过
✅ 关联完整性验证通过

✅ 迁移完成！
```

### Step 5: 验证数据

```bash
npm run verify:pois-migration
```

**验证内容：**

- ✅ 基础统计
- ✅ 按类别统计
- ✅ 按角色类型统计
- ✅ 多角色 POI 检查
- ✅ 数据完整性检查
- ✅ 查询示例

### Step 6: 测试应用功能

启动开发服务器：

```bash
npm run dev
```

测试以下功能：

1. **路线途径点显示**
   - 访问路线详情页
   - 确认途径点按顺序显示
   - 检查坐标和描述是否正确

2. **地点兴趣点显示**
   - 访问地点详情页
   - 确认打卡点、观景点等显示正常
   - 检查图片和扩展信息

3. **创建操作**（需要管理员权限）
   - 创建新 POI
   - 为路线/地点添加 POI 关联

4. **更新操作**（需要管理员权限）
   - 修改 POI 信息
   - 更新角色关联

5. **删除操作**（需要管理员权限）
   - 删除 POI（验证级联删除）
   - 删除角色关联

### Step 7: 清理旧表（可选）

⚠️ **警告：此操作不可逆，请确保已充分测试！**

```bash
npm run cleanup:old-points
```

**交互式确认：**

```
⚠️  警告：此操作将删除旧的 points 表

📊 points 表信息:
   - 记录数: X

📊 新表信息:
   - POI 记录数: Y
   - 角色关联记录数: X

✅ 数据数量验证通过

❓ 确认要删除 points 表吗？此操作不可逆！(yes/no): yes
❓ 再次确认：您确定已经测试过应用功能正常吗？(yes/no): yes

📦 创建备份...
✅ 备份已创建（表名：points_backup）

🗑️  删除 points 表...
✅ points 表已删除

✅ 清理完成！
```

## 📊 数据结构对比

### 之前（points 表）

```typescript
// 同一物理位置在不同角色下重复存储
points: [
  {
    id: "point_1",
    name: "梧桐山山顶",
    coordinates: { lat: 22.5850, lng: 114.2180 },
    entityType: "route",
    entityId: "route_1",
    type: "waypoint"
  },
  {
    id: "point_2",
    name: "梧桐山山顶",  // 重复！
    coordinates: { lat: 22.5850, lng: 114.2180 },  // 重复！
    entityType: "location",
    entityId: "location_1",
    type: "viewpoint"
  }
]
```

### 现在（pois + entity_to_pois）

```typescript
// 物理位置只存储一次
pois: [
  {
    id: "poi_1",
    name: "梧桐山山顶",
    coordinates: { lat: 22.5850, lng: 114.2180 },
    category: "mountain_peak"
  }
]

// 角色关联
entity_to_pois: [
  {
    id: "etp_1",
    poiId: "poi_1",
    entityType: "route",
    entityId: "route_1",
    roleType: "waypoint",
    order: 2
  },
  {
    id: "etp_2",
    poiId: "poi_1",
    entityType: "location",
    entityId: "location_1",
    roleType: "viewpoint"
  }
]
```

## 🔧 常用 API

### 查询路线途径点

```typescript
import { getRouteWaypoints } from "@/app/actions/pois";

const waypoints = await getRouteWaypoints("route_wutongshan");
// 返回：[{ poi: {...}, role: { order: 0, ... } }, ...]
```

### 查询地点兴趣点

```typescript
import { getLocationPois } from "@/app/actions/pois";

const pois = await getLocationPois("wutongshan", "viewpoint");
// 返回：[{ poi: {...}, role: {...} }, ...]
```

### 创建 POI 并关联

```typescript
import { createPoi, addPoiToEntity } from "@/app/actions/pois";

// 1. 创建 POI
const { poiId } = await createPoi({
  name: "梧桐山山顶",
  coordinates: { lat: 22.5850, lng: 114.2180 },
  category: "mountain_peak",
});

// 2. 添加角色关联
await addPoiToEntity({
  poiId,
  entityType: "route",
  entityId: "route_wutongshan",
  roleType: "waypoint",
  order: 2,
});
```

### 批量创建

```typescript
import { createPoisWithRoles } from "@/app/actions/pois";

await createPoisWithRoles({
  entityType: "route",
  entityId: "route_wutongshan",
  roleType: "waypoint",
  pois: [
    { name: "起点", coordinates: {...}, order: 0 },
    { name: "中点", coordinates: {...}, order: 1 },
    { name: "终点", coordinates: {...}, order: 2 },
  ],
});
```

## 🐛 故障排除

### 问题 1: 迁移脚本找不到数据库文件

**错误信息：**
```
❌ 未找到数据库文件
```

**解决方案：**
```bash
# 确保本地开发环境已初始化
npm run dev
# 停止后再运行迁移脚本
```

### 问题 2: 数据数量不一致

**错误信息：**
```
❌ 数据数量不一致，迁移可能有问题
```

**解决方案：**
1. 检查迁移脚本输出的详细信息
2. 运行验证脚本查看具体问题
3. 如需重新迁移，先删除 pois 和 entity_to_pois 表的数据：
   ```bash
   sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
     "DELETE FROM entity_to_pois; DELETE FROM pois;"
   ```

### 问题 3: 应用代码报错

**错误信息：**
```
Cannot find module '@/app/actions/pois'
```

**解决方案：**
1. 确保已重启开发服务器
2. 清理 Next.js 缓存：
   ```bash
   rm -rf .next
   npm run dev
   ```

### 问题 4: TypeScript 类型错误

**错误信息：**
```
Type 'Poi' is not assignable to type 'Point'
```

**解决方案：**
1. 更新代码以使用新的类型定义
2. 参考 `app/actions/pois.ts` 中的示例

## 📚 相关文档

- [POI 重构完成报告](./POI重构完成报告.md) - 详细的重构说明
- [数据库 Schema](./db/schema.ts) - 表结构定义
- [类型定义](./lib/poi-types.ts) - POI 类型定义
- [Server Actions](./app/actions/pois.ts) - POI 操作函数
- [API 路由](./app/api/pois/) - REST API 端点

## ✅ 检查清单

迁移完成后，请确认以下项目：

- [ ] 安装了 tsx 依赖
- [ ] 执行了数据库迁移（生成新表）
- [ ] 执行了数据迁移脚本（迁移数据）
- [ ] 运行了验证脚本（确认数据完整性）
- [ ] 测试了路线途径点显示
- [ ] 测试了地点兴趣点显示
- [ ] 测试了创建、更新、删除操作
- [ ] 更新了前端组件（如果需要）
- [ ] 清理了旧的 points 表（可选）

## 💡 提示

1. **备份数据**：在执行迁移前，建议备份数据库文件
2. **逐步迁移**：可以先在本地环境测试，确认无误后再迁移远程数据库
3. **保留旧表**：建议在确认一切正常后再删除 points 表
4. **监控日志**：迁移过程中注意查看脚本输出的详细信息

## 🆘 获取帮助

如果遇到问题，请查看：

1. 迁移脚本的详细输出
2. 验证脚本的检查结果
3. 相关文档和代码注释
4. 项目的 GitHub Issues

祝迁移顺利！🎉
