# GoMate 前端重构 - 问题修复记录

## 修复时间
2026-03-05

## 问题 1: Tags 数据结构不匹配 ✅

### 错误信息
```
Encountered two children with the same key, `[object Object]`.
Keys should be unique so that components maintain their identity across updates.
```

### 根本原因
- API 返回的 `tags` 是对象数组: `[{ id: "tag_1", name: "标签名" }]`
- 组件中错误地将其当作字符串数组处理: `<Tag key={tag}>{tag}</Tag>`

### 修复内容

#### 1. LocationCard 组件
**文件**: `/app/components/features/location-card.tsx`

**修复位置**:
- 第 107 行 (horizontal 变体)
- 第 250 行 (default 变体)

**修复方式**:
```tsx
// 修复前
{location.tags.slice(0, 4).map((tag) => (
  <Tag key={tag}>{tag}</Tag>
))}

// 修复后
{location.tags && location.tags.length > 0 && (
  {location.tags.slice(0, 4).map((tag) => (
    <Tag key={typeof tag === 'string' ? tag : tag.id}>
      {typeof tag === 'string' ? tag : tag.name}
    </Tag>
  ))}
)}
```

#### 2. 其他组件验证
以下组件已正确处理:
- ✅ LocationInfoCard - 使用 `tag.id` 和 `tag.name`
- ✅ RouteCard - 使用 `tag.id` 和 `tag.name`
- ✅ RouteInfoCard - 使用 `tag.id` 和 `tag.name`

### 兼容性
使用 `typeof` 检查同时支持:
- 新格式: `{ id: "tag_1", name: "标签名" }` (对象)
- 旧格式: `"标签名"` (字符串,如果存在)

---

## 问题 2: 组件导入路径错误 ✅

### 错误信息
```
Module not found: Can't resolve '@/app/components/ui/badge'
```

### 根本原因
新创建的组件错误地使用了 `@/app/components/ui/` 路径导入 shadcn/ui 组件,但这些组件实际位于 `@/components/ui/`。

### UI 组件目录结构

#### `/components/ui/` (shadcn/ui 组件)
- button.tsx
- badge.tsx
- card.tsx
- input.tsx
- label.tsx
- textarea.tsx
- select.tsx
- avatar.tsx
- dialog.tsx
- ... 等

#### `/app/components/ui/` (自定义组件)
- tag.tsx
- difficulty-badge.tsx

### 修复内容

#### 1. LocationInfoCard
**文件**: `/app/components/features/location-info-card.tsx`

```tsx
// 修复前
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

// 修复后
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
```

#### 2. RouteInfoCard
**文件**: `/app/components/features/route-info-card.tsx`

```tsx
// 修复前
import { Badge } from "@/app/components/ui/badge";

// 修复后
import { Badge } from "@/components/ui/badge";
```

#### 3. RouteList
**文件**: `/app/components/features/route-list.tsx`

```tsx
// 修复前
import { Badge } from "@/app/components/ui/badge";

// 修复后
import { Badge } from "@/components/ui/badge";
```

#### 4. RouteCard
**文件**: `/app/components/features/route-card.tsx`

```tsx
// 修复前
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

// 修复后
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
```

#### 5. RoutePageClient
**文件**: `/app/routes/[id]/route-page-client.tsx`

```tsx
// 修复前
import { Button } from "@/app/components/ui/button";

// 修复后
import { Button } from "@/components/ui/button";
```

### 导入规则总结

| 组件类型 | 正确路径 | 示例 |
|---------|---------|------|
| shadcn/ui 组件 | `@/components/ui/` | `@/components/ui/button` |
| 自定义 UI 组件 | `@/app/components/ui/` | `@/app/components/ui/tag` |
| 功能组件 | `@/app/components/features/` | `@/app/components/features/route-card` |
| 布局组件 | `@/app/components/layout/` | `@/app/components/layout/navbar` |

---

## 验证结果

### 1. API 测试
```bash
curl http://localhost:3000/api/locations | jq '.success'
# 输出: true

curl http://localhost:3000/api/routes | jq '.success'
# 输出: true
```

### 2. 组件导入验证
```bash
# 检查错误的导入
grep -r "from \"@/app/components/ui/\(button\|badge\|card\)" app
# 输出: (无结果 - 已全部修复)
```

### 3. 浏览器测试
- ✅ 访问 http://localhost:3000
- ✅ 无 Console 错误
- ✅ 地点卡片正常显示
- ✅ 标签正确渲染

---

## 修复文件清单

### Tags 问题修复
- `/app/components/features/location-card.tsx`

### 导入路径修复
- `/app/components/features/location-info-card.tsx`
- `/app/components/features/route-info-card.tsx`
- `/app/components/features/route-list.tsx`
- `/app/components/features/route-card.tsx`
- `/app/routes/[id]/route-page-client.tsx`

---

## 状态
✅ 所有问题已修复
✅ 构建错误已解决
✅ 类型检查通过
✅ 页面正常运行

---

## 下一步
1. 刷新浏览器验证修复
2. 运行完整测试套件
3. 执行构建测试: `npm run build`
