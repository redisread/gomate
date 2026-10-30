# 性能验收

目标是让内容尽早出现，并让连续操作、失败和恢复保持清楚、稳定。LCP ≤ 2.5 秒、INP ≤ 200ms、CLS ≤ 0.1 为目标，桌面与移动分别评估。真实用户验收采用第 75 百分位；本地实验不能替代线上数据。[Web Vitals 定义](https://web.dev/articles/vitals)

## 可重复的本地测量

1. 按[本地开发](local-dev-worktrees.md)准备隔离 D1、示例配置与专用端口；使用项目固定的 Node/pnpm。确认 HTML 来自构建产物，不含 `/@vite/client`。
2. 用 `pnpm exec astro build` 构建，再通过 `wrangler dev --config dist/server/wrangler.json --persist-to "$GOMATE_LOCAL_STATE" --port 5439 --var APP_URL:http://127.0.0.1:5439` 启动。不要连接共享生产数据的 Preview 做写入实验。
3. 执行 `PERF_ORIGIN=http://127.0.0.1:5439 node scripts/measure-browser-performance.mjs .lighthouseci/baseline.json`。修改并重建后，以相同数据库、外部资源、端口和负载输出另一个文件。
4. 比较各页面/视口三次样本的中位数，同时检查错误、HTML 内容、JS 传输量和长任务；测量期间不并行运行构建、测试或修改数据。改动后不得只报告改善项目，需说明退化和取舍。

脚本覆盖首页、地点与队伍列表、隐私页，以及数据库中存在的首个地点/队伍详情。固定 Chromium、4 倍 CPU 降速、80ms 网络延迟、200000 B/s 下载、冷浏览器缓存；外部图片用固定本地 WebP 替代，其他外部请求阻止。它隔离应用开销，**不衡量真实图片 CDN、地区网络或 Safari 性能**。空队伍数据不能代表有内容的队伍列表，必须另补有代表性数据的场景。

脚本记录 load 后 2.5 秒内的 LCP、无近期输入的布局偏移总和及长任务。偏移总和不等于正式 CLS session-window 算法，不能称作线上 CLS；脚本也不测量 INP。完整指标需真实用户数据或专门的交互观测。产物位于忽略目录，某次结果与负载记录在 PR 中，不成为永久性能承诺。

## 全系统检查入口

| 范围 | 检查重点与代码入口 |
| --- | --- |
| 首屏与翻译 | `src/pages/`、`src/i18n/context.tsx`：HTML 正文、首帧一致、跨请求语言隔离、重复 API 读取、脚本与序列化字节 |
| 浏览与探索 | `features/home/`、`features/locations/`、`features/teams/`：地图数据量、随机抽样扫描、筛选乱序、防抖、URL 游标、返回滚动、快速重复输入 |
| 图片 | `ui/lazy-image.tsx`、`location-detail/gallery-image.tsx`、`server/routes/upload.ts`：首图发现、固定空间、原始文件体积、延迟加载、解码失败与切换；真实 CDN 单独测量 |
| 表单和账号 | `features/teams/form/`、`features/profile-edit/`、`features/profile-client.tsx`、`features/my-teams/`：提交反馈、输入恢复、身份读取、并行时间线、追加分页、未知写入结果 |
| 后台 | `components/admin/`：有界列表、搜索乱序、保留结果、抽屉切换、焦点与读取权限；写入必须用隔离数据库 |
| API 与 D1 | `server/routes/locations/queries.ts`、`teams/queries.ts`、`users/timeline-query.ts`：真实数据规模、查询计划、扫描行数、关联批量读取、count 与正文请求次数、权限裁剪 |
| 缓存与异步 | `server/lib/http-cache.ts`、`lib/api.ts`、`server/scheduled.ts`：共享缓存与身份边界、会话失效、定时 SQL 范围、失败重试、写保护 |
| 构建与交付 | `pnpm test:ci`、`worker:dry-run`、`worker:size`、E2E：精确提交产物、Worker 集成、构建体积与真实发布状态 |

地图统计返回全部可见点位，随机地点使用 `random()` 扫描候选；模糊搜索与总数查询也需要随规模观测。不能因数据集很小便宣称不存在瓶颈，也不能未经测量就增加索引、KV、队列或全站缓存。新增服务或明显持续费用须给出具体收益与费用。

## 交互与兼容性

- 快速搜索、连续点击、旧请求晚返回、离线、超时、错误重试、前进/后退及刷新；旧内容必须带更新或失败反馈。
- 模态层打开、退出中重开、菜单切到另一个弹窗、取消动画，以及 reduced-motion 运行中切换；焦点、滚动锁和背景交互均恢复。
- 中英文、键盘、深浅主题及 320/390/768/1024/1440px 视口；不得把 viewport 或 WebKit 模拟称作 iPhone/Safari 真机验收。
- 桌面 Chrome/Edge/Safari、iPhone Safari/Android Chrome 为验收矩阵；当前环境不能执行的浏览器单独列明。核心流程不依赖原生 View Transitions，装饰效果可以退化。[跨文档转场](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition)、[Motion 无障碍](https://motion.dev/docs/react-accessibility)

可用 `pnpm exec playwright test --project=webkit` 运行关键流程的 WebKit 回归，或 `pnpm exec playwright test e2e/performance-experience.spec.ts --project=chrome` 使用已安装的 Google Chrome；先安装对应浏览器，并配置隔离测试服务。

现有自动回归包括 `e2e/performance-experience.spec.ts` 的无 JavaScript 正文、重复请求、SSR 隐私边界、筛选失败保留结果、游标/滚动恢复及取消退出动画；其他功能 E2E 与 Workers/D1 测试共同覆盖业务正确性。通过这些测试不等于全量真实设备性能认证。
