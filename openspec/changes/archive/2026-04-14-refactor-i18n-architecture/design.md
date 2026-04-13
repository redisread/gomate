## Context

GoMate 前端使用 Astro 4 + React 18 架构，SSR 模式部署在 Cloudflare Pages。当前 i18n 系统支持 3 种语言（zh-CN 默认、en、ja），通过 URL 前缀（`/en/`、`/ja/`）和 cookie（`gomate_locale`）进行语言检测。

**当前状态：**
- `copy.ts`：1462 行中文文案，28 个组件引用，按功能域组织
- `i18n/locales/*.json`：3 语言各 1412 行，32 个 namespace，编译时 import 打包
- Astro i18n 配置：`prefixDefaultLocale: false`，zh-CN 无 URL 前缀

**约束：**
- Cloudflare Pages 部署，静态资源通过 public 目录提供
- 组件使用 `useI18n()` hook 或 `getSSRT()` 获取翻译
- 需要保持 SSR 首屏渲染无闪烁

## Goals / Non-Goals

**Goals:**
1. 将翻译文件从编译时 import 改为运行时按需 fetch，减少 JS bundle 体积
2. 拆分单体 JSON 为 16 个 namespace 文件，按功能域组织
3. 将 copy.ts 全部内容迁移到 i18n 系统，消除双系统并存
4. 添加 namespace 级缓存和预加载机制
5. 添加 CI 中的 i18n key 一致性校验

**Non-Goals:**
- 不新增语言（仍为 zh-CN、en、ja 三种）
- 不改变 URL 路由结构（前缀策略不变）
- 不引入第三方 i18n 库（保持自研轻量引擎）
- 不修改后端 API 或数据库

## Decisions

### 1. 翻译文件存放位置：`public/locales/`

**选择理由：** Cloudflare Pages 自动提供 `public/` 目录下的静态文件，无需额外配置。运行时通过 `fetch('/locales/{locale}/{ns}.json')` 获取，不进入 JS bundle。

**替代方案：** 放在 `src/i18n/locales/` 并通过动态 import。缺点：Vite 会将所有动态 import 目标打包进 bundle，无法实现按需加载。

### 2. Namespace 拆分策略：20 个文件

将 32 个当前 namespace 合并为 20 个，合并规则：
- `nav` + `footer` + `theme` → `common.json`（29 keys）
- `hero` + `blog` + `about` + `help` + `privacy` + `terms` + `seo` → `content.json`（66 keys）
- `contact` → `feedback.json`（28 keys）
- `success` + `api` → `errors.json`（46 keys）

其余模块保持独立：`teams`（246 keys）、`admin`（173 keys）、`profile`（97 keys）、`myTeams`（88 keys）、`auth`（76 keys）、`locations`（70 keys）、`email`（57 keys）、`ui`（28 keys）、`filter`（28 keys）、`enums`（39 keys）、`pois`（39 keys）、`share`（20 keys）、`home`（23 keys）、`favorites`（12 keys）、`locationDetail`（15 keys）、`userDetail`（15 keys）。

### 3. 缓存策略：内存 + localStorage 双层

```
内存缓存（Map）── 页面内重复调用直接命中
      │
      │ 未命中
      ▼
localStorage ── 跨页面复用，避免重复 fetch
      │
      │ 未命中或过期
      ▼
fetch('/locales/...') ── 写入两层缓存
```

localStorage 中存储时附加 `expiresAt` 字段（默认 24 小时），超时后重新 fetch。

### 4. API 设计：保持 t() 签名兼容

```typescript
// 旧 API（保持兼容）
t('teams.joinTeam', { locale: 'en' })

// 新增：预加载函数
await loadNamespaces(['common', 'teams'], 'en')

// 新增：SSR 预加载
const ssrData = await preloadSSRLocales(['common', 'teams'], locale)
// 返回 { common: {...}, teams: {...} } 注入到页面
```

### 5. copy.ts 迁移策略：一次性导入

编写脚本将 `copy.ts` 的层级结构映射为 i18n JSON key 路径，批量导入到对应 namespace 文件中。完成后批量替换 28 个引用文件中的 `copy.xxx.yyy` 为 `t('xxx.yyy')`，最后删除 `copy.ts`。

### 6. SSR 兼容：内联关键翻译

SSR 渲染时，将当前页面所需的 namespace 数据内联到 `<script>` 标签中，客户端 hydration 时直接读取，避免首屏闪烁：

```html
<script id="__i18n_data__">
window.__I18N_DATA__ = { "zh-CN": { common: {...}, teams: {...} } }
</script>
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 运行时 fetch 增加首次渲染延迟 | 用户看到短暂的 key 缺失 | SSR 内联关键翻译数据，客户端 hydration 时已有数据 |
| localStorage 缓存过期 | 用户看到旧翻译 | 24 小时过期 + 部署版本号比对 |
| copy.ts 迁移遗漏文案 | 部分组件显示空白或 key | 迁移后运行 type-check + 全站点 E2E 遍历 |
| 16 个 namespace 文件管理 | 新增语言时需要创建 16 个文件 | 添加脚本自动生成空模板 |
| Cloudflare Pages 缓存静态 JSON | 部署后用户仍获取旧版本 | JSON 文件名附加 hash 或设置短 Cache-Control |
