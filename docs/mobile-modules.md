# GoMate 移动端模块文档

> 最后更新：2026-03-22
> 框架：Flutter 3.24 + Riverpod 2.6 + GoRouter 14 + Dio 5.7

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
│   └── profile/                 # 个人资料模块
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
- **受保护路由**（需登录）：`/teams/create`、`/my-teams`、`/profile`、`/profile/edit`
- **仅限未登录**（已登录重定向到首页）：`/login`、`/register`

---

## 2. 路由配置

### 路由表（`core/navigation/app_router.dart`）

| 路由 | 页面 | 认证 | 说明 |
|------|------|------|------|
| `/` | 首页 | 否 | ShellRoute 内，含底部导航 |
| `/login` | 登录页 | 否（已登录重定向） | 独立路由 |
| `/register` | 注册页 | 否（已登录重定向） | 独立路由 |
| `/locations` | 地点列表 | 否 | ShellRoute 内 |
| `/locations/:id` | 地点详情 | 否 | 独立路由 |
| `/teams` | 队伍列表 | 否 | ShellRoute 内 |
| `/teams/create` | 创建队伍 | **是** | 底部弹出转场 |
| `/teams/:id` | 队伍详情 | 否 | 缩放淡入转场 |
| `/teams/:id/manage` | 队伍管理 | **是**（仅队长） | 独立路由 |
| `/my-teams` | 我的队伍 | **是** | ShellRoute 内 |
| `/profile` | 个人资料 | **是** | ShellRoute 内 |
| `/profile/edit` | 编辑资料 | **是** | 独立路由 |

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
|------|------|---------|
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
- 调用：`authProvider.notifier.login(email, password)`

#### 注册页 `register_screen.dart`
- 邮箱 + 密码 + 昵称表单
- 密码长度校验（≥8 位）
- 调用：`authProvider.notifier.register(email, password, name)`

---

### 3.2 首页模块（`features/home/`）

#### 首页 `home_screen.dart`
- 顶部品牌 Logo（渐变文字）+ 个人资料入口按钮
- 假搜索栏（点击跳转到地点列表）
- **热门地点** 横向卡片滑动列表（6 个地点）
- **招募中队伍** 纵向列表（5 个队伍）
- 下拉刷新
- `Future.wait()` 并行加载地点和队伍数据

---

### 3.3 地点模块（`features/locations/`）

#### 地点列表 `locations_list_screen.dart`
- 网格布局（2 列，宽高比 0.8）
- 筛选底部弹窗（`_FilterBottomSheet`）：
  - 城市单选（含「全部」选项）
  - 标签多选（Wrap 布局）
  - 重置 / 确认按钮
- 筛选状态指示器（活跃筛选时显示蓝点）
- 下拉刷新
- 错误/空状态处理

#### 地点详情 `location_detail_screen.dart`
- 封面图 + SliverAppBar（可折叠）
- 收藏按钮（需登录）
- 地点基本信息（名称、描述、地址、坐标）
- 关联路线列表（难度、时长、距离、高程）
- 最佳季节标签
- 图片画廊

**API 调用：**
- `LocationsApi().getLocations(cityId, tagIds)` — 地点列表
- `LocationsApi().getLocation(id)` — 地点详情
- `LocationsApi().favoriteLocation(id)` — 切换收藏

---

### 3.4 队伍模块（`features/teams/`）

#### 队伍列表 `teams_list_screen.dart`
- 状态 Tab 筛选（FilterChip）：招募中 / 已满 / 已组建 / 已完成
- 队伍卡片纵向列表（图标、标题、人数、日期、状态标签）
- 底部 FAB（「发布队伍」快捷入口）
- 下拉刷新

#### 队伍详情 `team_detail_screen.dart`
基本信息区：
- 队伍图标 + 标题 + 状态
- 人数 / 活动时间 / 时长 / 领队信息
- 活动描述 + 入队要求

底部操作栏（差异化显示）：

| 用户角色 | 状态条件 | 显示内容 |
|---------|---------|---------|
| 访客 | 招募中 + 有空位 | 「申请加入」按钮（绿色） |
| 访客 | 已满/已组建/已完成 | 灰化按钮 + 原因文案 |
| 申请者 | pending | 「申请审核中」+ 「取消申请」链接 |
| 成员 | approved | 「已加入 ✓」+ 「申请退出」链接 |
| 申请者 | rejected | 「申请被拒绝」+ 「重新申请」按钮 |
| 成员 | leave_pending | 「退出申请审核中」提示 |
| 队长 | 任何 | 「管理队伍」按钮 → `/teams/:id/manage` |

用户操作：
- `joinTeam(teamId)` — 申请加入
- `leaveTeam(teamId)` — 取消申请 / 退出
- `requestLeave(teamId)` — 申请退出（已组建队伍）

#### 创建队伍 `create_team_screen.dart`
表单字段：
- 队伍标题（必填，≥3 字）
- 地点选择（下拉，必填）
- 活动时间（日期 + 时间 picker，不早于当前时间 +3 天）
- 最大成员数
- 队伍描述
- 入队要求（可添加多条）

#### 队伍管理 `team_manage_screen.dart`（队长专用）
- **申请列表 Tab**：待审核申请（头像 + 昵称 + 微信 + 批准/拒绝按钮）
- **成员管理 Tab**：已加入成员（含删除/移出功能）
- **队伍设置 Tab**：修改基本信息、状态流转

#### 我的队伍 `my_teams_screen.dart`
- Tab 1「我创建的」：按 `leaderId == currentUserId` 过滤
- Tab 2「我加入的」：按 `MyTeamRole.member` 过滤
- Tab 3「我的申请」：按 `memberStatus == 'pending'` 过滤
- 支持下拉刷新

**API 调用：**
- `TeamsApi().getTeams(status, locationId)` — 队伍列表
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
- 我的收藏（TODO）
- 账号设置（TODO）
- 退出登录（红色，含确认弹窗）

#### 编辑资料 `edit_profile_screen.dart`
- 头像上传（拍照/选择相册）
- 昵称、个人简介、等级、性别、微信号编辑
- 保存流程：先上传头像（如有修改）→ 调用 `updateUser()` → 更新 `authProvider`

**API 调用：**
- `AuthApi().updateUser()` — 更新用户信息
- `AuthApi().uploadAvatar(file)` — 上传头像，返回 URL

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
| `date` / `time` | String | 出发日期 / 时间（\"2026-03-30\" / \"09:00\"） |
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
| `AuthApi` | `login()`, `register()`, `updateUser()`, `uploadAvatar()`, `logout()` |
| `LocationsApi` | `getLocations()`, `getLocation()`, `favoriteLocation()` |
| `TeamsApi` | `getTeams()`, `getTeam()`, `createTeam()`, `joinTeam()`, `leaveTeam()`, `requestLeave()`, `getMyStatus()`, `getApplications()`, `approveApplication()`, `rejectApplication()`, `approveLeave()`, `rejectLeave()` |
| `CitiesApi` | `getCities()` |
| `TagsApi` | `getLocationTags()`, `getTeamTags()` |

**基础 URL：** 读取 `.env` 中的 `API_BASE_URL`，默认 `http://localhost:8799`

---

## 7. 设计系统

### Design Tokens（`shared/theme/app_tokens.dart`）

**品牌色：**
- 主色：`#2EC4B6`（清新蓝绿）
- 深色：`#1A9E92`
- 浅色：`#D6F5F2`

**语义色：**
- 成功：苔绿 `#52C41A`
- 错误：珊瑚红 `#FF6B6B`

**文字层级：**
- 主文字：`#1A2332`
- 次文字：`#5A6A7A`
- 占位符：`#9AAAB8`

**背景：**
- 主背景：`#F7F9FC`
- Surface：`#FFFFFF`
- Elevated：`#F0F4F8`

**圆角：** `8px / 12px / 16px / 24px`

### 共享组件库（`shared/widgets/`）

| 组件 | 用途 |
|------|------|
| `AppNavShell` | 底部导航壳层 |
| `AppButton` | 按钮（支持渐变、禁用态） |
| `AppCard` | 卡片容器（圆角 + 阴影） |
| `AppFilterChip` | 筛选芯片（单/多选） |
| `AppStatusBadge` | 状态徽章 |
| `AppEmptyState` | 空状态提示（插图 + 文案） |
| `AppSectionHeader` | 章节标题（含「查看全部」链接） |

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
