## Context

当前 i18n 架构在前端 Web 端已完善：
- 3 种语言（zh-CN/en/ja），22 个命名空间全覆盖
- SSR hydration 流程完善，三层缓存（内存 → localStorage → SSR inline）
- 语言回退链：ja → en → zh-CN

但存在两个缺口：
1. **API 层（Hono/Cloudflare Workers）** 无 i18n 能力，4 类邮件模板全部硬编码中文
2. **前端部分组件** 仍有硬编码中文文案（上传组件 ~13 处、FAQ 7 条、隐私页面 7 章节）

**约束条件：**
- API 运行在 Cloudflare Workers，无文件系统，翻译数据需内嵌或从 KV/D1 读取
- 用户 locale 存储在 `gomate_locale` cookie 中，API 侧可通过请求头读取
- 前端已有成熟的 `t()` 翻译引擎，不应重复造轮子

## Goals / Non-Goals

**Goals:**
- API 邮件模板支持 zh-CN/en/ja 三种语言，根据用户 cookie 自动选择
- 前端所有硬编码中文文案迁入翻译系统（ui.json, content.json, help.json）
- 零破坏性变更：现有中文用户体验完全不变

**Non-Goals:**
- 不做 Flutter 移动端 i18n（单独变更处理）
- 不做 API 响应错误消息国际化（当前 API 错误消息仅用于日志，前端有自己的错误文案）
- 不做翻译管理系统（CMS），翻译文件仍以 JSON 形式维护

## Decisions

### 1. API 邮件翻译数据来源：内嵌 JSON 模块

**决策：** 在 `api/src/lib/` 下创建 `locales/email.{zh-CN,en,ja}.json` 文件，通过 TypeScript `import` 直接加载。

**理由：**
- Cloudflare Workers 支持静态 JSON import（Wrangler bundler 自动处理）
- 邮件模板数据量小（每个 locale < 2KB），内存占用可忽略
- 相比 KV/D1 方案，无需额外读写，延迟更低
- 相比运行时 fetch，无外部依赖，可靠性更高

**备选方案：**
- ❌ KV 存储：增加读写延迟和成本，邮件模板极少变更
- ❌ 运行时 fetch CDN：增加外部依赖和失败面
- ❌ 从前端 `public/locales/` fetch：Workers 运行时无法访问前端静态文件

### 2. API 侧 Locale 检测：Cookie 优先，Accept-Language 兜底

**决策：** 邮件发送函数新增可选 `locale` 参数。调用方（auth.ts 等）从 cookie 提取 locale 传入。未提供时回退到 `zh-CN`。

**理由：**
- 用户已在前端设置 `gomate_locale` cookie，API 侧可从请求头 `Cookie` 提取
- 在 auth.ts 的邮件发送调用点已有 `c.req` 上下文，可读取 cookie
- 不依赖 Accept-Language 自动推断，避免与用户手动选择不一致

**备选方案：**
- ❌ 仅依赖 Accept-Language：与用户在前端手动切换的语言可能不一致
- ❌ 用户表存储 locale：增加 schema 变更，当前用户表无 locale 字段

### 3. 前端遗留文案：就地迁移，不新增命名空间

**决策：**
- 上传组件文案 → 现有 `ui.json` 命名空间下新增 `upload` 子节点
- FAQ 内容 → 新建 `help.json` 命名空间（proposal 中已列出）
- 隐私/条款内容 → 现有 `content.json` 命名空间下新增 `privacy` 和 `terms` 子节点

**理由：**
- `ui.json` 已承载 UI 组件文案（上传、空状态、选择器），上传错误提示天然属于此域
- `content.json` 已承载 about/help/privacy/terms 页面内容，隐私/条款属此域
- FAQ 当前无对应命名空间，新建 `help.json` 最符合语义

### 4. FAQ 和隐私页面：结构化数据 + 渲染引擎

**决策：** FAQ 和隐私页面的翻译值为结构化 JSON 对象（数组/嵌套对象），组件侧编写通用渲染逻辑遍历数据。

**理由：**
- FAQ 是多条问答，每条有 question + answer，适合数组结构
- 隐私页面有标题、段落、列表项的层级结构，适合嵌套对象
- 组件不再关心具体文案内容，只负责数据 → UI 的映射

**JSON 结构示例：**
```json
// help.json
{
  "faqItems": [
    {
      "question": "How do I join a team?",
      "answer": "Browse available teams on the Teams page..."
    }
  ]
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| API 侧 JSON 内嵌导致每次翻译更新需重新部署 API | 邮件模板更新频率极低（季度级），可接受 |
| FAQ/隐私页面内容通过 JSON 管理不如 MDX 直观 | 当前内容量可控（7 个 FAQ + 7 个隐私章节），JSON 结构可维护；未来若内容膨胀可考虑迁移到 MDX/CMS |
| 上传组件的硬编码文案分布在两个文件中，迁移易遗漏 | 先在翻译文件中定义所有 key，再逐个替换调用点，最后用 grep 确认无残留 |
| 英文/日文邮件翻译质量 | 当前使用 AI 翻译，后续可由母语用户校对 |

## Migration Plan

1. **API 邮件 i18n**：
   - 创建 3 个 locale JSON 文件
   - 重构 `email.ts` 的 4 个函数，接受 locale 参数并加载对应模板
   - 更新 `auth.ts` 和 `teams.ts` 中的调用点，传入用户 locale
   - 本地测试：手动设置 cookie 验证三种语言邮件

2. **前端硬编码迁移**：
   - 在 `ui.json`、`content.json`、`help.json` 中添加翻译 key
   - 逐个组件替换硬编码字符串为 `t()` 调用
   - 用 `grep` 确认无残留硬编码中文

3. **部署**：
   - 先部署 API（邮件模板变更）
   - 再部署前端（组件文案变更）
   - 回滚：任一方向可独立回滚，无交叉依赖

## Open Questions

- **深圳地域限制**：欢迎邮件中提到"深圳徒步"，对于非中文用户是否需要更通用的描述？（当前决策：保留深圳提及，因为项目确实聚焦深圳）
- **邮件模板 HTML 样式**：三种语言的邮件是否需要不同的 HTML 布局（如 RTL 支持）？（当前决策：不需要，三种语言均为 LTR）
