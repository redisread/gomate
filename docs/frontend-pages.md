# GoMate 前端页面与运行时

前端使用 Astro SSR 与 React islands，并和 Hono API 运行在同一个 Cloudflare Worker。
页面入口以 [`src/pages/`](../src/pages/) 为准，交互组件位于
[`src/components/`](../src/components/)。

## 页面目录

| 领域     | 路径                                                                          | 说明                                                |
| -------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| 首页     | `/`                                                                           | 访客发现入口；登录用户的行程、推荐和 onboarding     |
| 认证     | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | 同源 Cookie 认证；验证与重置 token 从 fragment 提交 |
| 地点     | `/locations`, `/locations/[id]`                                               | 地点列表、详情、标签、队伍和 Story 回顾             |
| Team     | `/teams`, `/teams/[id]`, `/teams/create`, `/teams/[id]/edit`                  | 筛选、详情、创建、编辑、申请、成员和行动本          |
| Story    | `/discover`, `/discover/[id]`, `/discover/create`, `/discover/[id]/edit`      | Story feed、详情、创建、编辑、点赞和收藏            |
| 收藏     | `/favorites`                                                                  | 地点与 Story 收藏                                   |
| 消息     | `/messages`, `/messages/[id]`                                                 | 会话 inbox 与 cursor 消息历史                       |
| 用户     | `/my-teams`, `/profile`, `/profile/edit`, `/users/[id]`                       | 当前用户队伍、资料和公开主页                        |
| 管理后台 | `/admin`, `/admin/locations`, `/admin/locations/new`, `/admin/locations/[id]/edit`, `/admin/tags`, `/admin/users` | 地点、标签与用户角色管理 |
| 博客     | `/blog`, `/blog/[slug]`                                                       | 内容集合与详情                                      |
| 信息页   | `/about`, `/contact`, `/feedback`, `/help`, `/privacy`, `/terms`              | 产品与法律信息                                      |
| 创建入口 | `/create`                                                                     | 创建 Team 或 Story 的统一入口                       |

`sitemap.xml.ts` 是 SSR 端点，不是用户页面。

## 核心页面合同

### 首页

- 访客看到 Hero、公开 Team、地点推荐与注册入口。
- 登录用户看到下一次行程、推荐和 onboarding。
- 本地圈公共部分直接从 D1 读取并按请求合并当前用户数据，不把用户相关结果写入共享缓存。
- 全国地图读取 `/api/locations/stats` 的 Region DTO。

### 地点

- 列表只展示 `published` 且所属 city Region 已启用服务的地点。
- 详情路由只使用全局 Location ID，slug 不参与路由解析。
- 页面消费共享 Location DTO：`region`、`supportedActivityTypes`、`coverImageUrl`、`images` 与结构化 `extra`。
- 详情的徒步攻略保留路线参数、概述、提示和警告；不展示地点装备或“决策信息”区块，原区块中的
  地图打开入口也不迁移到其他位置。
- 地点 Story 使用 `/api/stories?locationId=<id>`；收藏使用 `/api/favorites/locations`。

### Team

- 列表按 Region、活动类型、时间和派生 lifecycle 筛选。
- 创建和编辑 Team 时，`activityType` 必须来自共享代码枚举；所选地点的
  `supportedActivityTypes` 只把推荐项排在前面，不过滤其他活动类型。
- Team 列表筛选直接读取共享代码枚举，名称统一通过 i18n 展示。
- 详情展示 leader、active members、申请、行程和行动本；member 离队直接结束 active membership。
- 已结束且成行的 Team 中，leader 或 active member 可通过 `/discover/create?teamId=<id>` 发布回顾。
- Team 详情的通用分享弹窗与移动端底部分享面板共用三套 SVG 海报预设；切换预设时保留旧预览，
  直到新预览生成完成。

### 分享海报

- Location 与 Team 的分享入口提供 `dusk`、`ridge`、`journal` 三套固定预设；名称、说明和选择器
  文案都通过 `share` namespace 本地化。Story 不在本轮预设范围内。
- 选择只作为当前设备的本地偏好，不写入 D1、R2 或用户资料；服务端只按 allowlist query 生成
  SVG，不提供自由编辑、任意 CSS、PNG 导出或已渲染海报持久化。
- 切换期间保留上一个可用 Blob 预览、取消过期请求并缓存本次打开期间已浏览的变体；若新预设
  生成失败，则清除当前可下载预览并显示重试状态，避免把旧预设误作当前选择。关闭分享面板时
  撤销全部 Blob URL。

### Story

- 普通 Story 与 Team 回顾共用 DTO、卡片和 cursor feed。
- 新图片先通过 `/api/upload/story` 上传临时 key，提交 Story 时只发送当前用户的 `imageKeys[]`。
- Team 回顾只提交 `teamId`，Location 由服务端推导。
- 关联地点失去公开资格后，对应 Story 不再进入公开读取、点赞或收藏路径。

### 消息

- 会话由 `teamId + memberUserId` 唯一确定，只有该 member 或 Team 当前 leader 可访问。
- 首屏读取最新消息；加载历史和轮询都使用服务端 opaque cursor，并按消息 ID 去重。
- 轮询不能覆盖用户当前的历史 cursor；遇到无重叠的最新页时沿 cursor 回溯并合并缺口。

### 管理后台

- `/admin/*` 在 Astro middleware 中先完成服务端授权：访客以 302 前往登录页并携带经过校验的
  站内 `returnTo`，active 普通用户得到 HTTP 403，管理员响应使用 `private, no-store`。
- 后台不渲染公共 Navbar 或 Footer。宽布局使用固定侧栏，内容无法继续容纳时切换为移动顶部栏
  和抽屉；导航包含地点列表/新增、活动类型、标签、用户以及返回前台入口。
- 地点新增、编辑继续按可见性懒加载现有表单，但只使用统一后台壳层，不再重复渲染公共导航。
- 地点完整编辑表单不采集或校验必带、选带装备；Team 行动本中的装备清单是独立能力，保持不变。
- 地点管理列表可搜索并按 draft/published/archived 筛选；删除默认归档，永久删除只在归档后
  通过精确 ID 确认发起，后端仍会拒绝存在业务引用的地点。
- 活动类型后台支持新增、改名、排序和启停；标签后台支持新增、改名、查看引用计数并确认解除
  引用后删除；用户后台可搜索并授予或撤销管理员角色，但不能修改自己或撤销最后一名管理员。
- 公共 Navbar 从 `/api/users/me` 的当前 `role` 判断是否显示 `/admin` 和快速地点入口；访客、
  loading 与普通用户不渲染这些能力。快速入口打开响应式 Dialog/Bottom Sheet，管理员填写
  地点名称、介绍和地区即可直接保存草稿；封面、标签和推荐活动类型折叠为可选扩展，保存后可
  继续进入完整编辑页。
- 地点封面和相册只开放服务端实际支持的格式，并在客户端即时提示格式、大小、内容识别、HEIC
  转换或权限错误；iPhone 相册可能转换图片内容但保留原文件元数据，上传端点以实际可解码格式
  为准，HEIC/HEIF 图片转为 WebP，管理员无需手工转码。
- 无前缀及 `en`、`ja` locale 前缀的后台路径使用同一授权与布局合同。
- 后台桌面侧栏和移动顶部栏都提供 `zh-CN`、`en`、`ja` 语言切换；切换时保留当前后台路径，
  后台内部导航也保留当前 locale 前缀。服务端把当前 locale 传给切换 island，避免 hydration 前
  短暂显示错误语言。
- 角色、账号状态、地点状态、季节和活动类型等内部值必须通过共享 `enums` namespace 的穷尽
  映射展示，不把 `admin`、`draft`、`spring` 等原始枚举值渲染给用户。后台流程、确认和操作
  错误属于 `admin` namespace。
- 管理员操作失败只根据已知 `error.details.reason` 选择本地化文案；未知 payload 使用当前操作
  的本地化 fallback，不能把 server message 当作 UI 文案。地点名、地区名、标签名、用户昵称等
  D1 业务内容保持原样，不由界面翻译；这套展示合同不需要数据库或迁移变化。

#### 后台地点保存与发布

完整地点表单将“保存内容”和“改变发布状态”分开，`locations.status` 是唯一发布状态来源：

| 当前状态 | 编辑页主要操作 | 公开页入口 |
| -------- | -------------- | ---------- |
| `draft` | 保存草稿、发布地点 | 不显示 |
| `published` | 保存更改 | 显示“查看公开页” |
| `archived` | 保存更改、恢复为草稿 | 不显示，且不能直接发布 |

- 表单用只读状态标识和状态相关操作代替通用状态下拉框。发布操作显式提交
  `status: "published"`；恢复操作显式提交 `status: "draft"`，普通保存保持当前状态。
- 编辑现有地点成功后停留在当前后台编辑页并显示成功状态，不再延时跳转。首次创建成功后只进入
  新地点的 `/admin/locations/<id>/edit`，不自动进入公开详情。
- 后台编辑页的“返回”始终指向 `/admin/locations`。只有 `published` 地点提供独立的
  `/locations/<id>` 查看入口。
- 发布前必须在客户端和 API 两侧继续验证封面、纬度、经度；客户端展示字段错误并把焦点移到
  第一个缺失字段。验证失败不得发送发布请求或改变现有状态。
- 快速创建入口仍只创建 `draft`，并继续引导管理员进入完整编辑页。
- 状态转换由操作显式表达，不从按钮文案或 DOM 推断；公开链接只从服务端已保存状态派生。
- 此流程不包含批量发布、定时发布、审批流或 `published_at`。

## 运行时约束

- 浏览器 API helper 只接受资源路径，例如 `/teams`，并统一添加 `/api` 前缀。
- SSR 使用 [`src/lib/server-api.ts`](../src/lib/server-api.ts) 进程内调用 API，不请求自身域名。
- [`src/worker.ts`](../src/worker.ts) 将 `/api/*` 交给 Hono，其余请求交给 Astro 官方 Cloudflare handler。
- 用户可见文案全部来自 i18n；locale 变化后运行 build、validate、lint、type-check、test 和 build 门禁。
- `pnpm i18n:validate` 除了校验三语言 key 和 island namespace，还扫描后台页面与管理组件，拒绝
  硬编码标题/展示文案、无效静态 key、退役后台枚举 key、原始角色/状态输出和可能泄露服务端
  message 的通用错误 helper；三语言后台关键路径由 Chromium E2E 覆盖。
- React island 的 i18n 首次渲染必须在 SSR 与浏览器端保持同一加载态；浏览器在 hydration 后再消费页面注入的 namespace 缓存。
- 只有需要客户端状态的交互使用 React island；纯展示保持 Astro SSR。
- UI 规则与验证清单见 [`design-system.md`](design-system.md)。
