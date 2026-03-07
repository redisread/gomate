# Birthday 类型错误修复

## 问题描述

**错误信息**：
```
TypeError: birthDate.getFullYear is not a function
at calculateAge (lib/user-utils.ts:23:45)
```

**原因分析**：
- 数据库中 `birthday` 字段定义为 `integer("birthday", { mode: "timestamp" })`
- Drizzle ORM 在查询时会将其转换为 `Date` 对象
- 但在某些情况下（如 JSON 序列化后），`birthday` 可能以字符串形式传递
- 原始的 `calculateAge` 函数只处理 `Date | number` 类型，未处理字符串

## 修复方案

### 1. 增强 `calculateAge` 函数

**文件**: `lib/user-utils.ts`

**修改前**：
```typescript
export function calculateAge(birthday: Date | number | null): number | null {
  if (!birthday) return null;
  const birthDate = typeof birthday === "number" ? new Date(birthday) : birthday;
  // ...
}
```

**修改后**：
```typescript
export function calculateAge(birthday: Date | number | string | null): number | null {
  if (!birthday) return null;

  let birthDate: Date;

  if (typeof birthday === "number") {
    birthDate = new Date(birthday);
  } else if (typeof birthday === "string") {
    birthDate = new Date(birthday);
  } else if (birthday instanceof Date) {
    birthDate = birthday;
  } else {
    return null;
  }

  // 验证日期是否有效
  if (isNaN(birthDate.getTime())) {
    return null;
  }

  // 计算年龄...
}
```

**改进点**：
1. ✅ 支持字符串类型输入
2. ✅ 显式类型检查，避免运行时错误
3. ✅ 添加日期有效性验证
4. ✅ 更健壮的错误处理

### 2. 更新 `getAgeGroup` 函数签名

**文件**: `lib/user-utils.ts`

```typescript
export function getAgeGroup(birthday: Date | number | string | null): string | null {
  const age = calculateAge(birthday);
  // ...
}
```

### 3. 更新类型定义

**文件**: `lib/types.ts`

**TeamMember 接口**：
```typescript
birthday?: Date | number | string | null; // 生日（可能是 Date、时间戳或字符串）
```

**Team.leader 接口**：
```typescript
birthday?: Date | number | string | null; // 生日（可能是 Date、时间戳或字符串）
```

## 为什么会出现这个问题？

1. **数据库层**：Drizzle ORM 将 `timestamp` 模式的整数转换为 `Date` 对象
2. **API 层**：`NextResponse.json()` 序列化时，`Date` 对象被转换为 ISO 字符串
3. **客户端层**：前端接收到的是字符串，而不是 `Date` 对象

## 测试验证

修复后，以下场景都能正常工作：

```typescript
// 场景1：数据库直接返回的 Date 对象
calculateAge(new Date("1995-06-15")); // ✅

// 场景2：时间戳
calculateAge(803145600000); // ✅

// 场景3：JSON 序列化后的字符串
calculateAge("1995-06-15T00:00:00.000Z"); // ✅

// 场景4：空值
calculateAge(null); // ✅ 返回 null

// 场景5：无效日期
calculateAge("invalid-date"); // ✅ 返回 null
```

## 影响范围

### 修改的文件
- ✅ `lib/user-utils.ts` - 增强类型处理
- ✅ `lib/types.ts` - 更新类型定义

### 影响的页面
- ✅ `/profile` - 个人资料页
- ✅ `/teams/[id]` - 队伍详情页（领队卡片和成员列表）
- ✅ 所有使用 `getAgeGroup()` 的地方

## 总结

通过增强类型处理和添加日期有效性验证，`calculateAge` 和 `getAgeGroup` 函数现在能够：
- ✅ 处理 Date、number、string 三种输入格式
- ✅ 优雅处理无效输入，返回 null 而不是抛出异常
- ✅ 提供更好的类型安全性

这个修复确保了用户资料展示功能在所有场景下都能稳定运行。
