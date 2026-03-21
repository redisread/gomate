# GoMate Mobile

GoMate 移动端应用，基于 Flutter 构建，支持 iOS 和 Android 平台。

## 技术栈

- **Flutter** 3.x
- **Riverpod 2** - 状态管理
- **GoRouter** - 路由导航
- **Dio** - HTTP 客户端
- **flutter_secure_storage** - 安全存储 session token
- **flutter_dotenv** - 环境变量管理

## 项目结构

```
mobile/
├── lib/
│   ├── main.dart              # 应用入口
│   ├── app.dart               # 路由和主题配置
│   ├── core/
│   │   ├── api/               # API 客户端封装
│   │   │   ├── api_client.dart        # Dio 基础客户端
│   │   │   ├── auth_api.dart          # 认证 API
│   │   │   ├── teams_api.dart         # 队伍 API
│   │   │   └── locations_api.dart     # 地点 API
│   │   ├── models/            # 数据模型
│   │   │   ├── user.dart
│   │   │   ├── team.dart
│   │   │   ├── location.dart
│   │   │   └── route.dart
│   │   └── constants/
│   │       └── api_constants.dart     # API 端点常量
│   └── features/
│       ├── auth/screens/      # 登录、注册页面
│       ├── home/screens/      # 首页
│       ├── locations/screens/ # 地点列表和详情
│       ├── teams/screens/     # 队伍列表、详情、创建
│       └── profile/screens/   # 个人资料
├── assets/
│   ├── images/                # 图片资源
│   └── icons/                 # 图标资源
├── pubspec.yaml
└── .env.example
```

## 快速开始

### 1. 安装依赖

```bash
flutter pub get
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 设置 API_BASE_URL
```

### 3. 运行开发环境

```bash
# iOS
flutter run -d ios

# Android
flutter run -d android
```

### 4. 代码生成（Riverpod）

```bash
dart run build_runner build
```

## 路由

| 路径 | 页面 |
|------|------|
| `/` | 首页 |
| `/login` | 登录 |
| `/register` | 注册 |
| `/locations` | 地点列表 |
| `/locations/:id` | 地点详情 |
| `/teams` | 队伍列表 |
| `/teams/create` | 创建队伍 |
| `/teams/:id` | 队伍详情 |
| `/profile` | 个人资料 |

## API 接入

移动端通过 `ApiClient`（Dio 封装）与后端通信，认证使用 Better Auth 的 session cookie 机制：

1. 登录成功后，响应头中的 `set-cookie` 会被拦截器提取并存入 `flutter_secure_storage`
2. 后续每次请求自动注入 `Cookie: better-auth.session_token=<token>` 头

## 构建

```bash
# Android APK
flutter build apk --release

# iOS IPA
flutter build ipa --release
```
