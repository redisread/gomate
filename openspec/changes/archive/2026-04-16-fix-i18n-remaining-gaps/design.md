## Context

当前 i18n 架构在前端已相对完善（3 语言、22+ 命名空间），API 邮件模板也已支持多语言。但代码审查发现以下遗留问题：

1. **邮件模板翻译质量** — 日文邮件 welcome.feature3 残留中文字符（"ハイキング爱好者と一緒に出发"），英文邮件 greeting 缺少空格（"Hello{name},"）
2. **组件硬编码残留** — SeasonPicker 的季节/月份、上传组件错误提示、POI 编辑错误、地图加载错误、aria-label、相对时间等仍有硬编码中文
3. **命名空间不一致** — 季节信息同时存在于 `locations.seasons.*` 和 `admin.seasons.*`，SeasonPicker 使用 `locations` 但硬编码 fallback 是组件内的中文
4. **API 侧可观测性不足** — 非法 locale 传入时无日志记录

**约束条件：**
- 所有翻译数据仍以 JSON 文件管理，不引入 CMS
- 不修改现有 `t()` 函数签名（保持向后兼容）
- API 侧不引入新的依赖

## Goals / Non-Goals

**Goals:**
- 修复所有已知邮件模板翻译错误
- 消除前端所有用户可见的硬编码中文字符串
- 统一季节相关文案的命名空间来源
- 增强 API 侧非法 locale 的可观测性

**Non-Goals:**
- 不修改 Flutter 移动端 i18n（需单独变更）
- 不做 API 响应错误消息国际化（已在之前决策排除）
- 不引入翻译管理系统（CMS）

## Decisions

### 1. SeasonPicker 翻译：统一使用 `locations.seasons` 命名空间

**决策：** SeasonPicker 组件通过 `t('locations.seasons.{key}.label')` 和 `t('locations.seasons.{key}.months')` 获取文案，移除组件内的硬编码中文 fallback。

**理由：** `locations.json` 已有 `seasons` 节点（用于地点筛选），语义上季节属于地点域。`admin.seasons.*` 用于管理后台表单，两者场景不同可共存，但 UI 展示层统一走 `locations`。

**备选方案：**
- ❌ 新建 `seasons.json`：季节信息量小，单独命名空间增加维护成本
- ❌ 统一到 `admin.seasons`：admin 域语义过强，不适合面向用户的展示场景

### 2. 错误提示文案：归入 `ui.json` 命名空间

**决策：** 上传失败、地图加载失败、POI 编辑失败等错误提示归入 `ui.json` 的 `upload` 和 `map` 子节点。

**理由：** `ui.json` 已承载 UI 组件级别的文案（按钮、提示、空状态），错误提示天然属于此域。

### 3. 相对时间和未保存提示：归入 `common.json` 命名空间

**决策：** "刚刚"、"有未保存的更改" 等通用提示归入 `common.json`。

**理由：** 这类文案跨功能域使用，`common.json` 是通用文案的合适归属。

### 4. aria-label 本地化：使用 `t()` + fallback

**决策：** aria-label 使用 `t('common.showPassword') || 'Show password'` 模式，即使翻译缺失也能保持可访问性。

**理由：** aria-label 对无障碍访问至关重要，不能因为翻译缺失而消失。fallback 使用英文确保基本可用性。

### 5. API 侧非法 locale 日志：console.warn 而非 throw

**决策：** `getTemplateData()` 收到非法 locale 时输出 `console.warn` 并回退到 zh-CN，不抛出异常。

**理由：** 邮件发送是关键路径，不应因 locale 参数错误而中断用户流程。warn 日志足够用于排查问题。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| SeasonPicker 移除硬编码后，如果 `locations.seasons` 翻译缺失，season label 会显示 key 本身 | `t()` 函数已有回退链 ja→en→zh-CN，且 DEV 模式会输出 warn |
| 多个组件同时修改，合并冲突风险较高 | 每个组件独立修改，按文件粒度提交 |
| 日文邮件翻译质量依赖 AI 翻译，可能有语法不自然之处 | 先修复明显的中文字符残留，后续可由母语用户校对 |
| `locations.json` 和 `admin.json` 同时有 seasons 节点，维护者可能困惑 | 在 JSON 文件顶部添加注释说明两者的使用场景 |

## Migration Plan

1. **邮件模板修复**（零风险，纯数据修改）：
   - 修正 `email.ja.json` welcome.feature3
   - 修正 `email.en.json` welcome.greeting 空格
   - 修正 `email.zh-CN.json` welcome.greeting 格式一致性

2. **前端硬编码迁移**：
   - 在 `locations.json` 扩展 `seasons` 节点（如尚未完整）
   - 在 `ui.json` 新增错误提示 key
   - 在 `common.json` 新增通用提示 key
   - 逐个组件替换硬编码字符串为 `t()` 调用

3. **API 侧增强**：
   - `email-i18n.ts` 的 `getTemplateData` 增加 console.warn

4. **部署**：
   - 先部署 API（邮件模板修正）
   - 再部署前端（组件文案变更）
   - 任一方向可独立回滚

## Open Questions

- **装饰性浮窗文案**（home-hero.tsx 的"七娘山"、"3人已组队"）：这些是纯视觉装饰元素，是否需要翻译？（当前决策：需要，因为用户在切换语言时会看到这些文字）
- **POI 编辑的"缺少 POI ID"**：这是内部错误还是用户可见错误？（当前决策：用户可见，需要翻译）
