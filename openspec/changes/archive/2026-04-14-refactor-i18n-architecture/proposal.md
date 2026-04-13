## Why

GoMate 前端当前存在两套并行的文案系统：`copy.ts`（中文专用，1462 行单文件，28 个文件引用）和 `i18n/locales/*.json`（多语言，3 个各 1412 行的单体 JSON，47 个文件引用）。这导致：

1. **维护成本高**：同一文案可能在两处都有定义，维护者不知道该改哪个文件
2. **性能浪费**：所有翻译全量打包到 JS bundle（~180KB），页面只需其中一小部分
3. **迁移未完成**：28 个组件仍依赖 `copy.ts`，i18n 多语言功能未完全覆盖

## What Changes

- **拆分**：将 3 个单体 JSON 文件拆分为 16 个 namespace 文件，按功能域组织
- **迁移**：将 `public/locales/` 作为静态资源目录，支持运行时按需 fetch 加载
- **合并**：将 `copy.ts` 中剩余的全部中文文案一次性迁移到 i18n 系统，随后删除 `copy.ts`
- **升级**：改造 i18n 引擎支持 namespace 动态加载、缓存和预加载
- **校验**：添加 CI 中的 i18n key 一致性检查，确保多语言文件 key 集对齐

## Capabilities

### New Capabilities
- `i18n-namespace-loading`: 按 namespace 按需加载翻译文件，支持运行时 fetch 和缓存
- `i18n-copy-migration`: 将 copy.ts 全部文案迁移到 i18n 系统，消除双系统并存
- `i18n-key-validation`: CI 中验证多语言翻译文件的 key 一致性

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **frontend/src/i18n/index.ts**: 引擎升级，支持动态 namespace 加载
- **frontend/src/i18n/locales/**: 从 3 个单体文件改为 16 个 namespace 文件 × 3 语言
- **frontend/public/locales/**: 新增静态翻译资源目录
- **frontend/src/lib/copy.ts**: 删除（迁移后不再需要）
- **28 个引用 copy.ts 的组件**: 批量替换为 `t()` 调用
- **frontend/src/hooks/useI18n.ts**: 支持多 namespace 声明和按需加载
- **CI 流程**: 新增 i18n key 完整性校验步骤
