import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'transitions.dart';

// ── 页面导入（维持现有结构）────────────────────────────────────────
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/locations/screens/locations_list_screen.dart';
import '../../features/locations/screens/location_detail_screen.dart';
import '../../features/teams/screens/teams_list_screen.dart';
import '../../features/teams/screens/team_detail_screen.dart';
import '../../features/teams/screens/create_team_screen.dart';
import '../../features/teams/screens/team_manage_screen.dart';
import '../../features/teams/screens/my_teams_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/profile/screens/edit_profile_screen.dart';
import '../../features/profile/screens/favorites_screen.dart';
import '../../features/profile/screens/user_detail_screen.dart';
import '../../features/info/screens/about_screen.dart';
import '../../features/info/screens/help_screen.dart';
import '../../features/info/screens/contact_screen.dart';
import '../../features/info/screens/privacy_screen.dart';
import '../../features/info/screens/terms_screen.dart';
import '../../features/feedback/screens/feedback_screen.dart';

/// GoMate 路由路径常量
abstract class AppRoutes {
  AppRoutes._();

  static const String home = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String locations = '/locations';
  static const String locationDetail = '/locations/:id';
  static const String teams = '/teams';
  static const String teamCreate = '/teams/create';
  static const String teamDetail = '/teams/:id';
  static const String teamManage = '/teams/:id/manage';
  static const String myTeams = '/my-teams';
  static const String favorites = '/favorites';
  static const String profile = '/profile';
  static const String profileEdit = '/profile/edit';
  static const String userDetail = '/users/:id';
  static const String about = '/about';
  static const String help = '/help';
  static const String contact = '/contact';
  static const String privacy = '/privacy';
  static const String terms = '/terms';
  static const String feedback = '/feedback';

  /// 构建地点详情路径
  static String locationDetailPath(String id) => '/locations/$id';

  /// 构建队伍详情路径
  static String teamDetailPath(String id) => '/teams/$id';

  /// 构建队伍管理路径
  static String teamManagePath(String id) => '/teams/$id/manage';
}

/// 需要登录才能访问的路由集合
const _protectedRoutes = {
  '/teams/create',
  '/my-teams',
  '/favorites',
  '/profile',
  '/profile/edit',
};

/// 已登录用户不应访问的路由
const _authOnlyRoutes = {
  '/login',
  '/register',
};

/// 构建应用 GoRouter 实例
///
/// [isLoggedIn]：当前认证状态（用于路由守卫）
/// [refreshListenable]：认证状态变化通知器（GoRouter 自动重执行 redirect）
GoRouter buildAppRouter({
  required bool Function() isLoggedIn,
  required Listenable refreshListenable,
}) {
  return GoRouter(
    initialLocation: AppRoutes.home,
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final loggedIn = isLoggedIn();
      final location = state.matchedLocation;

      if (!loggedIn && _protectedRoutes.contains(location)) {
        return AppRoutes.login;
      }
      if (loggedIn && _authOnlyRoutes.contains(location)) {
        return AppRoutes.home;
      }
      return null;
    },
    routes: [
      // ── 首页 ────────────────────────────────────
      GoRoute(
        path: AppRoutes.home,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const HomeScreen(),
          transitionType: _TransitionType.fade,
        ),
      ),

      // ── 认证 ────────────────────────────────────
      GoRoute(
        path: AppRoutes.login,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const LoginScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),
      GoRoute(
        path: AppRoutes.register,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const RegisterScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const ForgotPasswordScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),

      // ── 地点 ────────────────────────────────────
      GoRoute(
        path: AppRoutes.locations,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const LocationsListScreen(),
          transitionType: _TransitionType.fade,
        ),
      ),
      GoRoute(
        path: AppRoutes.locationDetail,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: LocationDetailScreen(
            locationId: state.pathParameters['id']!,
          ),
          transitionType: _TransitionType.fadeScale,
        ),
      ),

      // ── 队伍 ────────────────────────────────────
      GoRoute(
        path: AppRoutes.teams,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const TeamsListScreen(),
          transitionType: _TransitionType.fade,
        ),
      ),
      GoRoute(
        path: AppRoutes.teamCreate,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: CreateTeamScreen(
            locationId: state.uri.queryParameters['locationId'],
          ),
          // 创建页使用底部弹出
          transitionType: _TransitionType.slideUp,
        ),
      ),
      GoRoute(
        path: AppRoutes.teamDetail,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: TeamDetailScreen(
            teamId: state.pathParameters['id']!,
          ),
          transitionType: _TransitionType.fadeScale,
        ),
        routes: [
          GoRoute(
            path: 'manage',
            pageBuilder: (context, state) => _buildPage(
              state: state,
              child: TeamManageScreen(
                teamId: state.pathParameters['id']!,
              ),
              transitionType: _TransitionType.slideRight,
            ),
          ),
        ],
      ),

      // ── 我的队伍 ─────────────────────────────────
      GoRoute(
        path: AppRoutes.myTeams,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const MyTeamsScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),

      // ── 我的收藏 ─────────────────────────────────
      GoRoute(
        path: AppRoutes.favorites,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const FavoritesScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),

      // ── 个人资料 ─────────────────────────────────
      GoRoute(
        path: AppRoutes.profile,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const ProfileScreen(),
          transitionType: _TransitionType.fade,
        ),
        routes: [
          GoRoute(
            path: 'edit',
            pageBuilder: (context, state) => _buildPage(
              state: state,
              child: const EditProfileScreen(),
              transitionType: _TransitionType.slideRight,
            ),
          ),
        ],
      ),

      // ── 用户公开资料 ─────────────────────────────
      GoRoute(
        path: AppRoutes.userDetail,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: UserDetailScreen(
            userId: state.pathParameters['id']!,
          ),
          transitionType: _TransitionType.fadeScale,
        ),
      ),

      // ── 信息页 ─────────────────────────────────
      GoRoute(
        path: AppRoutes.about,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const AboutScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),
      GoRoute(
        path: AppRoutes.help,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const HelpScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),
      GoRoute(
        path: AppRoutes.contact,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const ContactScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),
      GoRoute(
        path: AppRoutes.privacy,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const PrivacyScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),
      GoRoute(
        path: AppRoutes.terms,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const TermsScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),

      // ── 反馈建议 ───────────────────────────────
      GoRoute(
        path: AppRoutes.feedback,
        pageBuilder: (context, state) => _buildPage(
          state: state,
          child: const FeedbackScreen(),
          transitionType: _TransitionType.slideRight,
        ),
      ),
    ],
  );
}

// ──────────────────────────────────────────────────────────────────
//  私有辅助类型 + 方法
// ──────────────────────────────────────────────────────────────────

enum _TransitionType {
  slideRight,
  slideUp,
  fadeScale,
  fade,
}

/// 根据 [_TransitionType] 构建 CustomTransitionPage
CustomTransitionPage<void> _buildPage({
  required GoRouterState state,
  required Widget child,
  _TransitionType transitionType = _TransitionType.slideRight,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: _durationForType(transitionType),
    reverseTransitionDuration: const Duration(milliseconds: 200),
    transitionsBuilder: _builderForType(transitionType),
  );
}

Duration _durationForType(_TransitionType type) {
  switch (type) {
    case _TransitionType.slideUp:
      return const Duration(milliseconds: 400);
    case _TransitionType.fadeScale:
    case _TransitionType.slideRight:
      return const Duration(milliseconds: 300);
    case _TransitionType.fade:
      return const Duration(milliseconds: 200);
  }
}

RouteTransitionsBuilder _builderForType(_TransitionType type) {
  switch (type) {
    case _TransitionType.slideRight:
      return AppTransitions.slideFromRight;
    case _TransitionType.slideUp:
      return AppTransitions.slideFromBottom;
    case _TransitionType.fadeScale:
      return AppTransitions.fadeScale;
    case _TransitionType.fade:
      return AppTransitions.heroFade;
  }
}
