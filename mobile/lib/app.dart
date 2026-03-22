import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers/auth_provider.dart';
import 'core/navigation/app_router.dart';
import 'core/navigation/transitions.dart';
import 'shared/theme/app_theme_v2.dart';
import 'shared/widgets/app_nav_shell.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/auth/screens/register_screen.dart';
import 'features/home/screens/home_screen.dart';
import 'features/locations/screens/locations_list_screen.dart';
import 'features/locations/screens/location_detail_screen.dart';
import 'features/teams/screens/teams_list_screen.dart';
import 'features/teams/screens/team_detail_screen.dart';
import 'features/teams/screens/create_team_screen.dart';
import 'features/profile/screens/profile_screen.dart';
import 'features/profile/screens/edit_profile_screen.dart';
import 'features/teams/screens/team_manage_screen.dart';
import 'features/teams/screens/my_teams_screen.dart';

/// App 根组件：监听认证状态，刷新路由守卫
class GomateApp extends ConsumerStatefulWidget {
  const GomateApp({super.key});

  @override
  ConsumerState<GomateApp> createState() => _GomateAppState();
}

class _GomateAppState extends ConsumerState<GomateApp> {
  /// 用于触发 GoRouter 重新执行 redirect 的 Notifier
  final _routerRefresh = _RouterRefreshNotifier();
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = _buildRouter();
  }

  GoRouter _buildRouter() {
    return GoRouter(
      initialLocation: AppRoutes.home,
      refreshListenable: _routerRefresh,
      redirect: (context, state) {
        final authState = ref.read(authProvider);

        // 认证状态加载中，不重定向
        if (authState.isLoading) return null;

        final isLoggedIn = authState.valueOrNull?.isLoggedIn ?? false;
        final location = state.matchedLocation;

        // 未登录访问受保护路由 → 跳转登录页
        if (!isLoggedIn && _protectedRoutes.contains(location)) {
          return AppRoutes.login;
        }

        // 已登录访问登录/注册页 → 跳转首页
        if (isLoggedIn && _authOnlyRoutes.contains(location)) {
          return AppRoutes.home;
        }

        return null;
      },
      routes: [
        // 带底部导航的主 Shell 路由（Tab 页面）
        ShellRoute(
          builder: (context, state, child) => AppNavShell(child: child),
          routes: [
            GoRoute(
              path: AppRoutes.home,
              pageBuilder: (context, state) => _buildFadePage(
                state: state,
                child: const HomeScreen(),
              ),
            ),
            GoRoute(
              path: AppRoutes.locations,
              pageBuilder: (context, state) => _buildFadePage(
                state: state,
                child: const LocationsListScreen(),
              ),
            ),
            GoRoute(
              path: AppRoutes.teams,
              pageBuilder: (context, state) => _buildFadePage(
                state: state,
                child: const TeamsListScreen(),
              ),
            ),
            GoRoute(
              path: AppRoutes.myTeams,
              pageBuilder: (context, state) => _buildFadePage(
                state: state,
                child: const MyTeamsScreen(),
              ),
            ),
            GoRoute(
              path: AppRoutes.profile,
              pageBuilder: (context, state) => _buildFadePage(
                state: state,
                child: const ProfileScreen(),
              ),
            ),
          ],
        ),
        // 全屏页面（不含底部导航）
        GoRoute(
          path: AppRoutes.login,
          pageBuilder: (context, state) => _buildSlidePage(
            state: state,
            child: const LoginScreen(),
          ),
        ),
        GoRoute(
          path: AppRoutes.register,
          pageBuilder: (context, state) => _buildSlidePage(
            state: state,
            child: const RegisterScreen(),
          ),
        ),
        GoRoute(
          path: AppRoutes.locationDetail,
          pageBuilder: (context, state) => _buildFadeScalePage(
            state: state,
            child: LocationDetailScreen(
              locationId: state.pathParameters['id']!,
            ),
          ),
        ),
        GoRoute(
          path: AppRoutes.teamCreate,
          pageBuilder: (context, state) => _buildSlideUpPage(
            state: state,
            child: const CreateTeamScreen(),
          ),
        ),
        GoRoute(
          path: AppRoutes.teamDetail,
          pageBuilder: (context, state) => _buildFadeScalePage(
            state: state,
            child: TeamDetailScreen(
              teamId: state.pathParameters['id']!,
            ),
          ),
          routes: [
            GoRoute(
              path: 'manage',
              pageBuilder: (context, state) => _buildSlidePage(
                state: state,
                child: TeamManageScreen(
                  teamId: state.pathParameters['id']!,
                ),
              ),
            ),
          ],
        ),
        GoRoute(
          path: AppRoutes.profileEdit,
          pageBuilder: (context, state) => _buildSlidePage(
            state: state,
            child: const EditProfileScreen(),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _routerRefresh.dispose();
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 仅在登录态变化时通知 GoRouter 重新执行 redirect
    // 更新用户资料时 isLoggedIn 不变，不触发路由守卫，避免误重定向
    ref.listen<AsyncValue<AuthState>>(authProvider, (previous, next) {
      final prevLoggedIn = previous?.valueOrNull?.isLoggedIn;
      final nextLoggedIn = next.valueOrNull?.isLoggedIn;
      if (prevLoggedIn != nextLoggedIn) {
        _routerRefresh.notify();
      }
    });
    return MaterialApp.router(
      title: 'GoMate',
      debugShowCheckedModeBanner: false,
      theme: AppThemeV2.light,
      themeMode: ThemeMode.light,
      routerConfig: _router,
    );
  }
}

// ── 页面转场构建器（委托 AppTransitions）────────────────────────────

/// Tab 切换 — 淡入（无位移感，减少 Tab 间视觉跳跃）
CustomTransitionPage<void> _buildFadePage({
  required GoRouterState state,
  required Widget child,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 200),
    reverseTransitionDuration: const Duration(milliseconds: 150),
    transitionsBuilder: AppTransitions.heroFade,
  );
}

/// 标准右滑进入 — 二级页面
CustomTransitionPage<void> _buildSlidePage({
  required GoRouterState state,
  required Widget child,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 300),
    reverseTransitionDuration: const Duration(milliseconds: 200),
    transitionsBuilder: AppTransitions.slideFromRight,
  );
}

/// 淡入 + 放大 — 详情页（有内容层次感）
CustomTransitionPage<void> _buildFadeScalePage({
  required GoRouterState state,
  required Widget child,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 300),
    reverseTransitionDuration: const Duration(milliseconds: 200),
    transitionsBuilder: AppTransitions.fadeScale,
  );
}

/// 底部弹出 — 创建类页面
CustomTransitionPage<void> _buildSlideUpPage({
  required GoRouterState state,
  required Widget child,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 400),
    reverseTransitionDuration: const Duration(milliseconds: 280),
    transitionsBuilder: AppTransitions.slideFromBottom,
  );
}

// ── 路由守卫常量（引用 AppRoutes，避免魔法字符串）───────────────────

/// 需要登录才能访问的路由
const _protectedRoutes = {
  AppRoutes.teamCreate,
  AppRoutes.myTeams,
  AppRoutes.profile,
  AppRoutes.profileEdit,
};

/// 已登录用户不应访问的路由
const _authOnlyRoutes = {
  AppRoutes.login,
  AppRoutes.register,
};

/// GoRouter refreshListenable 的简单封装，暴露公开的 notify() 方法
class _RouterRefreshNotifier extends ChangeNotifier {
  void notify() => notifyListeners();
}
