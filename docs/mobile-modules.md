# GoMate 移动端模块文档

> 最后更新：2026-03-27
> 框架：Flutter 3.24 + Riverpod 2.6 + GoRouter 14 + Dio 5.7
> UI 设计系统：Design System v2.0（温暖琥珀色调 #D97706）

## 项目结构总览

```
mobile/lib/
├── main.dart                    # 应用入口
├── app.dart                     # 应用根组件 + 路由配置
├── core/
│   ├── api/                     # HTTP 客户端 + API 封装
│   ├── i18n/                    # 全局文案
│   ├── models/                  # 数据模型
│   ├── navigation/              # 路由定义 + 页面转场
│   ├── providers/               # 全局状态管理
│   └── theme/                   # 主题配置（旧）
├── features/
│   ├── auth/                    # 认证模块
│   ├── home/                    # 首页模块
│   ├── locations/               # 地点模块
│   ├── teams/                   # 队伍模块
│   ├── profile/                 # 个人资料模块
│   └── info/                    # 信息页模块（关于/帮助/联系/隐私/条款）
├── shared/
│   ├── theme/                   # Design Tokens + Material 3 主题
│   └── widgets/                 # 共享组件库
└── widgets/                     # 旧版组件（可废弃）
```

---

## 1. 应用入口

### `main.dart`
- 初始化 Flutter Binding
- 配置沉浸式系统 UI（状态栏/导航栏透明化，暗色图标）
- 设置仅支持竖屏
- 加载 `.env` 环境变量
- 启动 `ProviderScope`（Riverpod 根容器）

### `app.dart` — `GomateApp`
- 监听 `authProvider` 登录状态变化
- 通过 `_RouterRefreshNotifier` 驱动 GoRouter 刷新路由守卫
- 差异化页面转场动画（Tab 淡入、详情页缩放、创建页底部弹出）

**路由守卫规则：**
- **受保护路由**（需登录）：`/teams/create`、`/my-teams`、`/profile`、`/profile/edit`、`/favorites`
- **仅限未登录**（已登录重定向到首页）：`/login`、`/register`

---

## 2. 路由配置

### 路由表（`core/navigation/app_router.dart`）

| 路由 | 页面 | 认证 | 说明 |
|------|------|------|------|
| `/` | 首页 | 否 | ShellRoute 内，含底部导航 |
| `/login` | 登录页 | 否（已登录重定向） | 独立路由 |
| `/register` | 注册页 | 否（已登录重定向） | 独立路由 |
| `/forgot-password` | 忘记密码 | 否 | 独立路由 |
| `/locations` | 地点列表 | 否 | ShellRoute 内 |
| `/locations/:id` | 地点详情 | 否 | 独立路由，缩放淡入转场 |
| `/teams` | 队伍列表 | 否 | ShellRoute 内 |
| `/teams/create` | 创建队伍 | **是** | 底部弹出转场 |
| `/teams/:id` | 队伍详情 | 否 | 缩放淡入转场 |
| `/teams/:id/manage` | 队伍管理 | **是**（仅队长） | 独立路由 |
| `/my-teams` | 我的队伍 | **是** | ShellRoute 内 |
| `/favorites` | 我的收藏 | **是** | 独立路由 |
| `/profile` | 个人资料 | **是** | ShellRoute 内 |
| `/profile/edit` | 编辑资料 | **是** | 独立路由 |
| `/users/:id` | 用户公开资料 | 否 | 独立路由 |
| `/about` | 关于我们 | 否 | 独立路由 |
| `/help` | 帮助中心 | 否 | 独立路由 |
| `/contact` | 联系我们 | 否 | 独立路由 |
| `/privacy` | 隐私政策 | 否 | 独立路由 |
| `/terms` | 服务条款 | 否 | 独立路由 |

### 底部导航（`shared/widgets/app_nav_shell.dart`）

| Tab | 标签 | 路由 |
|-----|------|------|
| 0 | 首页 | `/` |
| 1 | 探索 | `/locations` |
| 2 | 发布 | `/teams/create` |
| 3 | 队伍 | `/teams` |
| 4 | 我的 | `/profile` |

### 页面转场动画（`core/navigation/transitions.dart`）

| 类型 | 效果 | 应用场景 |
|------|------|----|
| `heroFade` | 纯淡入 | Tab 切换 |
| `slideFromRight` | 右→中（含视差） | 二级页面导航 |
| `fadeScale` | 淡入 + 缩放（0.94→1.0） | 详情页、模态页 |
| `slideFromBottom` | 下→中 + 淡入 | 创建队伍、底部弹窗 |

---

## 3. 功能模块

### 3.1 认证模块（`features/auth/`）

#### 登录页 `login_screen.dart`
- 邮箱 + 密码表单
- 实时验证（邮箱格式、密码非空）
- 密码可见性切换（Eye/EyeOff 图标）
- 错误提示（邮箱/密码错误、网络超时、连接失败）
- 注册入口链接
- 「忘记密码」链接 → `/forgot-password`
- 调用：`authProvider.notifier.login(email, password)`

#### 注册页 `register_screen.dart`
- 邮箱 + 密码 + 昵称表单
- 密码长度校验（≥8 位）
- 同意服务条款勾选框（链接跳转 `/terms`）
- 「已有账户，登录」链接
- 调用：`authProvider.notifier.register(email, password, name)`

#### 忘记密码页 `forgot_password_screen.dart` ⭐ 待实现
- 邮箱输入表单
- 发送重置链接按钮（loading 态）
- 发送成功提示
- 「返回登录」链接
- 调用：`POST /auth/forget-password`

---

### 3.2 首页模块（`features/home/`）

#### 首页 `home_screen.dart`
- 顶部品牌 Logo（渐变文字）+ 个人资料入口按钮
- 假搜索栏（点击跳转到地点列表）
- **热门地点** 横向卡片滑动列表（6 个地点，含封面图 + 城市名）
- **招募中队伍** 纵向列表（5 个队伍，含人数 + 状态标签）
- 下拉刷新
- 骨架屏（shimmer 扫光）
- 错误态（重试按钮）
- `Future.wait()` 并行加载地点和队伍数据

---

### 3.3 地点模块（`features/locations/`）

#### 地点列表 `locations_list_screen.dart`
- 网格布局（2 列，宽高比 0.8）
- 搜索框（关键词模糊匹配，防抖 300ms）⭐ 待实现
- 筛选底部弹窗（`_FilterBottomSheet`）：
  - 城市单选（含「全部」选项）
  - 标签多选（Wrap 布局）
  - 重置 / 确认按钮
- 筛选状态指示器（活跃筛选时显示蓝点）
- 下拉刷新
- 骨架屏（加载中）
- 错误/空状态处理
- 分页加载（上拉加载更多）⭐ 待实现

#### 地点详情 `location_detail_screen.dart`
- 封面图 + SliverAppBar（可折叠）
- 收藏按钮（需登录，心形图标）
- 地点基本信息（名称、副标题、城市、标签）
- 地点描述（温暖琥珀色调文字）
- 路线信息卡片列表：
  - 路线名称 + `AppDifficultyBadge` 难度徽章
  - 路线详情（距离、时长、高程）
  - 卡片阴影效果增强层次感
- **正在招募的队伍列表**（实时加载）
- **分享按钮**（系统 Share Sheet）
- 「在此地找队伍」底部按钮（品牌渐变色）→ `/teams?locationId=xxx`

**API 调用：**
- `LocationsApi().getLocations(cityId, tagIds, q, type)` — 地点列表（含关键词搜索、类型筛选）
- `LocationsApi().getLocation(id)` — 地点详情
- `LocationsApi().favoriteLocation(id)` — 切换收藏
- `GET /favorites?entityType=location` — 获取收藏列表（初始化收藏状态）
- `GET /teams?locationId=xxx&status=recruiting` — 该地点招募中队伍 ⭐ 待实现

**UI 更新（2026-03-25）：**
- 导入 `AppStatusBadge` 组件
- 路线卡片使用 `AppDifficultyBadge` 展示难度
- 文字颜色统一使用新的 Design Tokens
- 卡片添加阴影效果

---

### 3.4 队伍模块（`features/teams/`）

#### 队伍列表 `teams_list_screen.dart`
- 状态 Tab 筛选（FilterChip）：招募中 / 已满 / 已组建 / 已完成
- 难度多选筛选 ⭐ 待实现
- 搜索框（关键词模糊匹配，防抖 300ms）⭐ 待实现
- 队伍卡片纵向列表（封面图、标题、人数进度条、日期、状态标签）
- 底部 FAB（「发布队伍」快捷入口）
- 下拉刷新
- 骨架屏（加载中）
- 空状态（含「创建队伍」入口）

#### 队伍详情 `team_detail_screen.dart`
基本信息区：
- 队伍图标容器（琥珀色浅色背景）+ `AppStatusBadge` 状态徽章
- 队伍标题（w600 字重）
- 4 列数据网格（日期、时间、人数、时长）
- 领队信息（使用 `AppAvatar.sm` 头像）
- 队伍描述 + 入队要求（琥珀色项目符号）
- 成员列表（使用 `AppAvatar` 组件 + 队长角标）

底部操作栏（差异化显示）：

| 用户角色 | 状态条件 | 显示内容 |
|---------|---------|---------|
| 访客 | 招募中 + 有空位 | 「申请加入」按钮（品牌渐变） |
| 访客 | 已满/已组建/已完成 | 灰化按钮 + 原因文案 |
| 申请者 | pending | 「申请审核中」+ 「取消申请」链接（琥珀色边框） |
| 成员 | approved | 「已加入 ✓」+ 「申请退出」链接（绿色边框） |
| 申请者 | rejected | 「申请被拒绝」+ 「重新申请」按钮 |
| 成员 | leave_pending | 「退出申请审核中」提示（琥珀色边框） |
| 队长 | 任何 | 「管理队伍」按钮（品牌渐变）→ `/teams/:id/manage` |

分享功能：
- 分享按钮（AppBar 右上角）
- 触发系统 Share Sheet（分享链接）

用户操作：
- `joinTeam(teamId, message)` — 申请加入（含留言输入）
- `leaveTeam(teamId)` — 取消申请 / 退出（二次确认 AlertDialog）
- `requestLeave(teamId)` — 申请退出（已组建队伍）

**UI 更新（2026-03-25）：**
- 使用 `AppStatusBadge` 替换旧状态标签
- 使用 `AppAvatar.sm` 展示领队头像
- 底部操作栏统一使用品牌渐变色
- 所有状态提示边框色更新为 Design Tokens

#### 创建队伍 `create_team_screen.dart`
表单字段：
- 队伍标题（必填，≥3 字）
- 地点选择（下拉，必填）
- 活动时间（日期 + 时间 picker，不早于当前时间 +3 天）
- 最大成员数
- 队伍描述
- 入队要求（可添加多条）
- URL 参数预填（`locationId`）⭐ 待实现

#### 队伍管理 `team_manage_screen.dart`（队长专用）
- **申请列表 Tab**：待审核申请（头像 + 昵称 + 微信 + 批准/拒绝按钮）
- **成员管理 Tab**：已加入成员（含删除/移出功能）
- **队伍设置 Tab**：修改基本信息、状态流转

#### 我的队伍 `my_teams_screen.dart`
- Tab 1「我创建的」：按 `leaderId == currentUserId` 过滤
- Tab 2「我加入的」：按 `MyTeamRole.member` 过滤（含申请状态标签）
- Tab 3「我的申请」：按 `memberStatus == 'pending'` 过滤
- 支持下拉刷新

**API 调用：**
- `TeamsApi().getTeams(status, locationId, q, difficulty)` — 队伍列表
- `TeamsApi().getTeam(id)` — 队伍详情
- `TeamsApi().getMyStatus(teamId)` — 当前用户状态
- `TeamsApi().createTeam(data)` — 创建队伍
- `TeamsApi().joinTeam(id)` / `leaveTeam(id)` / `requestLeave(id)`
- `TeamsApi().getApplications(teamId)` — 申请列表（队长）
- `TeamsApi().approveApplication(teamId, userId)` / `rejectApplication()`
- `TeamsApi().approveLeave(teamId, userId)` / `rejectLeave()`

---

### 3.5 个人资料模块（`features/profile/`）

#### 个人资料 `profile_screen.dart`
头部信息区（渐变背景）：
- 用户头像（网络图片 + 首字母回退）
- 展示名称（优先 nickname，回退 name）
- 个人简介（bio）
- 统计数据：已完成徒步次数 | 等级

菜单列表：
- 我的队伍 → `/my-teams`
- 发布队伍 → `/teams/create`
- 我的收藏 → `/favorites` ⭐ 待接入（当前为空回调）
- 账号设置（TODO）
- 退出登录（红色，含确认弹窗）

统计卡片扩展 ⭐ 待实现：
- 创建队伍数、加入队伍数、完成队伍数（对齐 Web 端）

#### 编辑资料 `edit_profile_screen.dart`
- 头像上传（拍照/选择相册）
- 昵称、个人简介、等级、性别、微信号编辑
- **出生日期选择**（DatePicker）
- **户外经验描述**（多行文本）
- **装备清单**（多选 FilterChip）
- 保存流程：先上传头像（如有修改）→ 调用 `updateUser()` → 更新 `authProvider`

**API 调用：**
- `AuthApi().updateUser()` — 更新用户信息
- `AuthApi().uploadAvatar(file)` — 上传头像，返回 URL

---

### 3.6 我的收藏模块 `features/profile/favorites_screen.dart`

#### 收藏页 `favorites_screen.dart`
- 收藏地点列表（封面图 + 名称 + 地址 + 城市）
- 取消收藏按钮（实时移除列表项，支持左滑删除）
- 骨架屏（加载中）
- 空状态（无收藏时展示引导）
- 未登录时重定向到 `/login`

**API 调用：**
- `GET /favorites?entityType=location` — 获取收藏列表
- `DELETE /favorites?entityType=location&entityId=xxx` — 取消收藏

---

### 3.7 用户公开资料模块 `features/profile/user_detail_screen.dart`

#### 用户详情页 `user_detail_screen.dart`
- 用户卡片：头像 + 名称 + 等级徽章 + 年龄 + 性别 + Bio
- 统计区：创建队伍数、参加队伍数、完成队伍数、加入日期
- 额外信息：户外经验、装备清单

**路由：** `/users/:id`

**API 调用：**
- `GET /users/:id` — 获取用户公开信息

---

### 3.8 信息页模块 `features/info/`

所有信息页使用统一布局（面包屑 + 标题 + 内容区）。

#### 关于我们 `about_screen.dart`
- 品牌介绍（GoMate 定位与使命）
- 核心特色三栏（发现地点、组建队伍、收藏路线）
- 联系信息（邮箱）

#### 帮助中心 `help_screen.dart`
- FAQ 手风琴列表（6 个常见问题，含展开/收起动画）
  - 如何加入队伍
  - 如何创建队伍
  - 如何联系队长
  - 队伍状态说明
  - 如何修改个人资料
  - 忘记密码处理
- 底部联系入口（跳转联系我们）

#### 联系我们 `contact_screen.dart`
- 联系表单：姓名、邮箱、主题、留言（4 字段）
- 提交按钮（loading 态）
- 提交成功态（图标 + 成功提示 + 重置按钮）
- 错误提示

**API 调用：**
- `POST /contact` — 提交联系表单

#### 隐私政策 `privacy_screen.dart`
- 7 个章节：信息收集、信息使用、信息保护、Cookie 使用、第三方服务、用户权利、联系我们

#### 服务条款 `terms_screen.dart`
- 多章节条款：接受条款、服务描述、用户账号、行为准则、内容所有权等
- 最后更新日期展示

**信息页入口（从个人资料页菜单追加）：**
- 关于我们 → `/about`
- 帮助中心 → `/help`
- 服务条款 → `/terms`
- 隐私政策 → `/privacy`
- 联系我们 → `/contact`

---

## 4. 状态管理

### `authProvider`（`core/providers/auth_provider.dart`）

```dart
// 认证状态
class AuthState {
  final UserModel? user;
  final bool isLoading;
  bool get isLoggedIn => user != null;
}
```

提供的方法：
- `login(email, password)` — 登录
- `register(email, password, name)` — 注册
- `updateUser(...)` — 更新用户信息
- `uploadAvatar(file)` — 上传头像
- `logout()` — 退出登录

**使用方式：**
```dart
// 读取状态
final authState = ref.watch(authProvider);

// 调用方法
await ref.read(authProvider.notifier).login(email, password);
```

---

## 5. 数据模型

### `UserModel`（`core/models/user.dart`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 用户 ID |
| `name` | String | 真实姓名 |
| `nickname` | String? | 昵称（展示优先级高于 name） |
| `email` | String? | 邮箱 |
| `image` | String? | 头像 URL |
| `bio` | String? | 个人简介 |
| `gender` | String? | male \| female \| other |
| `level` | String | beginner \| intermediate \| advanced \| expert |
| `completedHikes` | int | 已完成徒步次数 |
| `wechat` | String? | 微信号 |
| `role` | String | user \| admin |
| `status` | String | active \| suspended \| banned \| deleted |

### `TeamModel`（`core/models/team.dart`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 队伍 ID |
| `title` | String | 队伍标题 |
| `date` / `time` | String | 出发日期 / 时间（"2026-03-30" / "09:00"） |
| `durationMin` | int | 活动时长（分钟） |
| `maxMembers` / `currentMembers` | int | 最大 / 当前人数 |
| `status` | TeamStatus | 队伍状态枚举 |
| `leader` | UserModel? | 队长信息 |
| `hasVacancy` | bool | 是否有空位（computed） |

**相关枚举：**
- `TeamStatus`：`recruiting` \| `full` \| `formed` \| `completed` \| `cancelled`
- `TeamMemberStatus`：`pending` \| `approved` \| `rejected` \| `leavePending`
- `MyTeamRole`：`visitor` \| `member` \| `leader`

### `LocationModel`（`core/models/location.dart`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` / `name` / `slug` | String | 基础标识 |
| `type` | String? | 地点类型（hiking\|explore\|leisure\|travel，nullable） |
| `coverImage` | String | 封面图 URL |
| `bestSeason` | List\<String\> | 最佳季节 |
| `coordinates` | Coordinates | 经纬度 |
| `routes` | List\<RouteModel\> | 关联路线 |

**`RouteModel` 字段：** `difficulty`（Difficulty 枚举）、`durationMin/Max`、`distance`（km）、`elevation`（m）

---

## 6. API 层

### HTTP 客户端（`core/api/api_client.dart`）
- Dio 单例
- 自动 Cookie 管理（session token 持久化）
- 请求/响应/错误拦截器
- 401 时自动重定向到登录页

### API 类汇总

| 类 | 主要方法 |
|----|---------|
| `AuthApi` | `login()`, `register()`, `forgotPassword()` ⭐, `updateUser()`, `uploadAvatar()`, `logout()` |
| `LocationsApi` | `getLocations(q, cityId, tagIds, type)`, `getLocation()`, `favoriteLocation()`, `getFavorites()` ⭐ |
| `TeamsApi` | `getTeams(q, status, difficulty, locationId)`, `getTeam()`, `createTeam()`, `joinTeam()`, `leaveTeam()`, `requestLeave()`, `getMyStatus()`, `getApplications()`, `approveApplication()`, `rejectApplication()`, `approveLeave()`, `rejectLeave()` |
| `CitiesApi` | `getCities()` |
| `TagsApi` | `getLocationTags()`, `getTeamTags()` |
| `UsersApi` ⭐ | `getUser(id)` |
| `ContactApi` ⭐ | `submitContact(name, email, subject, message)` |

> ⭐ 标注为待实现的新增方法

**基础 URL：** 读取 `.env` 中的 `API_BASE_URL`，默认 `http://localhost:8799`

---

## 7. 设计系统

### Design Tokens（`shared/theme/app_tokens.dart`）

**品牌色（温暖琥珀调）：**
- 主色：`#D97706`（温暖琥珀）
- 深色：`#B45309`（深琥珀）
- 浅色：`#FFFBEB`（浅琥珀）

**中性色（沙米调）：**
- 背景基色：`#faf8f5`（温暖沙米）
- 表面色：`#f2ede7`（沙米）
- 边框色：`#e8e0d7`（暖灰）

**文字颜色：**
- 主文字：`#1e1812`（深棕黑）
- 次文字：`#8f7f6e`（暖灰棕）
- 占位符：`#a89b8c`（暖灰）

**语义色：**
- 成功：苔绿 `#52C41A`
- 错误：珊瑚红 `#FF6B6B`

**渐变色：**
- `gradientBrand`：`#D97706 → #B45309`（品牌主渐变）
- `gradientBrandAccent`：`#D97706 → #FF7a65`（品牌强调渐变）
- `gradientCard`：`#FFFFFF → #FFFBEB`（卡片背景渐变）
- `gradientHero`：`#FFFBEB → #faf8f5`（Hero 区背景渐变）

**圆角：** `8px / 12px / 16px / 24px / 9999px`

**阴影：** `0x0A1A2332`（柔和阴影）、`0x40D97706`（品牌色阴影）

### 共享组件库（`shared/widgets/`）

| 组件 | 用途 |
|------|------|
| `AppNavShell` | 底部导航壳层 |
| `AppButton` | 按钮（支持渐变、禁用态） |
| `AppCard` | 卡片容器（圆角 + 阴影） |
| `AppFilterChip` | 筛选芯片（单/多选） |
| `AppStatusBadge` | 状态徽章（5 状态 + 扩散动画） |
| `AppDifficultyBadge` | 难度徽章（4 难度等级） |
| `AppAvatar` | 用户头像（5 尺寸 + 字母占位） |
| `AppAvatarStack` | 头像叠加组件（+N 显示） |
| `AppTeamCard` | 队伍卡片（完整信息展示） |
| `AppEmptyState` | 空状态提示（插图 + 文案） |
| `AppSectionHeader` | 章节标题（含「查看全部」链接） |
| `AppShimmer` | 骨架屏扫光组件 |

**已更新页面使用新组件：**
- 首页：使用 `AppStatusBadge` 展示队伍状态
- 队伍列表页：使用 `AppStatusBadge`，添加卡片阴影
- 队伍详情页：使用 `AppStatusBadge`、`AppAvatar`，更新底部操作栏为品牌渐变
- 地点详情页：使用 `AppDifficultyBadge` 展示路线难度，更新卡片样式
- 个人中心页：使用 `AppAvatar.large` 展示用户头像

---

## 8. 核心业务流程

### 登录流程
1. 用户填写邮箱 + 密码 → `LoginScreen`
2. 调用 `authProvider.notifier.login()`
3. `AuthApi` 请求 `/auth/sign-in/email`
4. 成功 → 更新 `AuthState`
5. `GomateApp` 监听到 `isLoggedIn` 变化 → 通知 GoRouter
6. 路由守卫重定向到 `/`

### 申请加入队伍流程
1. 访客查看队伍详情，队伍状态为「招募中」且有空位
2. 点击「申请加入」→ `TeamsApi().joinTeam(teamId)`
3. 后端创建 `pending` 状态的成员记录
4. 页面切换为「申请审核中」状态 + 「取消申请」链接

### 队长管理申请流程
1. 队长进入队伍详情 → 点击「管理队伍」
2. 跳转 `/teams/:id/manage`
3. 查看申请列表 → 批准/拒绝
4. 批准后成员状态变为 `approved`，队伍人数 +1
5. 人满时队伍状态自动变为 `full`

### 创建队伍流程
1. 用户点击底部 Tab「发布」（需登录）
2. 填写表单 → 点击「发布」
3. `TeamsApi().createTeam(data)` → 后端创建队伍
4. 导航至新队伍详情页 `/teams/:id`

### 收藏地点流程
1. 用户进入地点详情，点击心形收藏按钮（需登录）
2. 调用 `LocationsApi().favoriteLocation(locationId)`
3. 后端切换收藏状态（toggle）
4. 前端更新心形图标状态（heartbeat 动效）

---

## 9. 功能对齐进度（对比 Web 端）

| 功能 | Web | 移动端 | 状态 |
|------|-----|--------|------|
| 首页（地点 + 队伍展示） | ✅ | ✅ | 已实现 |
| 地点列表（搜索 + 筛选） | ✅ | ✅ | 已实现 |
| 地点详情（完整信息） | ✅ | ✅ | 已实现（含招募队伍、分享） |
| 收藏功能（切换 + 列表） | ✅ | ✅ | 已实现 |
| 队伍列表（搜索 + 难度筛选） | ✅ | ✅ | 已实现 |
| 队伍详情（5 状态操作卡） | ✅ | ✅ | 已实现 |
| 队伍详情（分享） | ✅ | ✅ | 已实现 |
| 创建队伍（locationId 预填） | ✅ | ✅ | 已实现 |
| 队伍管理（审批 + 成员） | ✅ | ✅ | 已实现 |
| 我的队伍（3 Tab） | ✅ | ✅ | 已实现 |
| 个人资料（完整统计） | ✅ | ✅ | 已实现 |
| 编辑资料（完整字段） | ✅ | ✅ | 已实现 |
| 用户公开资料页 | ✅ | ✅ | 已实现 |
| 登录 | ✅ | ✅ | 已实现 |
| 注册 | ✅ | ✅ | 已实现 |
| 忘记密码 | ✅ | ✅ | 已实现 |
| 关于我们 | ✅ | ✅ | 已实现 |
| 帮助中心 | ✅ | ✅ | 已实现 |
| 联系我们 | ✅ | ✅ | 已实现 |
| 隐私政策 | ✅ | ✅ | 已实现 |
| 服务条款 | ✅ | ✅ | 已实现 |
