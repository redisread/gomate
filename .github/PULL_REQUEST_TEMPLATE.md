<!--
v3.1 PR Description 模板（gomate 仓库强制）

按 v3.1 SOP（含 Martin CR + Wen 测试两层保护）补全 6 段。空段保留标题即可（按情况补内容）。
-->

## 目的

> 一句话说清楚"为什么" + "做什么"。不要写"修复 xxx 问题"没头没尾的描述。

## 改动一览

| 文件 / 模块 | 改动 |
| ----------- | ---- |
| ...         | ...  |

> 列**关键改动点**，不是每个文件一行。新增 / 删除 / 修改 大块分区即可。

## 验收方式（怎么验对）

- [ ] **手动验证步骤 1**（必要时附命令）
- [ ] **手动验证步骤 2**
- [ ] **回归确认**：本次改动不影响已上线功能 A / B / C

## 文件后缀清单 + 运行环境

> v3.1 SOP 必填项（Martin CR 基础检查）

| 文件                          | 后缀          | 运行环境                | 风险                        |
| ----------------------------- | ------------- | ----------------------- | --------------------------- |
| `api/wrangler.toml`           | .toml         | Cloudflare Workers      | wrangler 解析               |
| `frontend/src/components/...` | .astro / .tsx | Astro 客户端 hydrate    | TS 注释遗留在 Astro 编译 OK |
| `frontend/public/sw.js`       | .js           | Service Worker (native) | **不能有 TS 类型注解**      |
| `scripts/...`                 | .mjs / .sh    | node / shell            | 引号 / 路径转义             |

## 「不改某某文件」声明 + 页面层 CSS 扫描

> v3.1 SOP 必填项（避免 PR body 写「不改 index.astro」但被 `:global(body)` 硬编码覆盖）

- 本 PR 明确**不改**的文件：`api/src/services/foo.ts`、`frontend/src/components/Bar.astro`
- 已扫页面层 CSS 检查硬编码：无
- 或：本 PR **改动** `frontend/src/components/Bar.astro` scoped CSS，已确认无 `:global(body)` 残留

## Wen 需验证的场景

> v3.1 SOP 必填项（Martin CR 后由 Wen 接续测试）

- [ ] Chrome / Safari / Firefox **三浏览器**视觉对齐（如本 PR 涉及 UI）
- [ ] `getComputedStyle` 实测：在 homepage / 详情页读 `--bg-primary` 等关键 token
- [ ] Lighthouse a11y / perf 分数未退化（如本 PR 涉及 UI）
- [ ] Service Worker 注册 + cache 换代（如本 PR 改 public/sw.js）
- [ ] 移动端 3 列 / 2 列自适应正确（如本 PR 涉及 layout）
- [ ] reduced-motion 用户 fallback 正确
- [ ] 线上 prod 验证（如本 PR 影响生产）：`getRegistrations()` + `caches.keys()` + hard reload

## 回滚路径

> v3.1 SOP 必填项（明确告诉 Victor / Martin / Wen 出问题怎么 revert）

- `git revert <this-commit>` 无副作用（无 schema / 依赖 / CI 变化）
- 或：`git reset --hard <last-green-commit>` 回退 dev
- 或：Feature flag 关闭（如适用）

## 关联

- Slock task: #N（链接 thread）
- Spec: `notes/<spec>.md` vN
- 前置 PR: #N
- 上下游:（受影响服务 / 工具）
