import 'package:flutter_dotenv/flutter_dotenv.dart';

/// API 端点常量定义
class ApiConstants {
  ApiConstants._();

  /// API 基础 URL，从环境变量读取，默认指向本地开发服务
  /// iOS 模拟器中 localhost/127.0.0.1 均指向宿主机（与 Android 不同）
  /// Android 模拟器需使用 10.0.2.2 访问宿主机
  static String get baseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'http://localhost:8799';

  // ─── 认证端点（Hono 后端挂载在 /auth）──────────────────────────────────────
  static const String signIn = '/auth/sign-in/email';
  static const String signUp = '/auth/sign-up/email';
  static const String signOut = '/auth/sign-out';
  static const String session = '/auth/get-session';

  // ─── 地点端点 ──────────────────────────────────────────────────────────────
  static const String locations = '/locations';
  static String locationDetail(String id) => '/locations/$id';

  // ─── 路线端点 ──────────────────────────────────────────────────────────────
  static const String routes = '/routes';
  static String routeDetail(String id) => '/routes/$id';

  // ─── 队伍端点 ──────────────────────────────────────────────────────────────
  static const String teams = '/teams';
  static String teamDetail(String id) => '/teams/$id';
  static String joinTeam(String id) => '/teams/$id/join';
  static String leaveTeam(String id) => '/teams/$id/leave';
  static String teamMembers(String id) => '/teams/$id/members';
  static String teamMyStatus(String id) => '/teams/$id/my-status';
  static String teamApplications(String id) => '/teams/$id/applications';
  static String approveMember(String teamId, String userId) => '/teams/$teamId/members/$userId/approve';
  static String rejectMember(String teamId, String userId) => '/teams/$teamId/members/$userId/reject';
  static String approveLeave(String teamId, String userId) => '/teams/$teamId/members/$userId/approve-leave';
  static String rejectLeave(String teamId, String userId) => '/teams/$teamId/members/$userId/reject-leave';
  static String leaveTeamRequest(String id) => '/teams/$id/leave-request';

  // ─── 用户端点 ──────────────────────────────────────────────────────────────
  /// 获取指定用户信息：GET /users/:id
  static String userProfile(String id) => '/users/$id';
  /// 更新用户信息：PATCH /users/update
  static const String userUpdate = '/users/update';

  // ─── 收藏端点 ──────────────────────────────────────────────────────────────
  static const String favorites = '/favorites';
  static String favoriteToggle(String entityType, String entityId) =>
      '/favorites/$entityType/$entityId';

  // ─── 城市端点 ──────────────────────────────────────────────────────────────
  static const String cities = '/cities';

  // ─── 标签端点 ──────────────────────────────────────────────────────────────
  static const String tags = '/tags';

  // ─── 上传端点 ──────────────────────────────────────────────────────────────
  static const String upload = '/upload';
}
