import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers/auth_provider.dart';
import 'shared/theme/app_theme.dart';
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

/// 需要登录才能访问的路由
const _protectedRoutes = {
  '/teams/create',
  '/profile',
  '/profile/edit',
  '/my-teams',
};

/// 已登录用户不应访问的路由（登录/注册）
const _authRoutes = {'/login', '/register'};

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
      initialLocation: '/',
      refreshListenable: _routerRefresh,
      redirect: (context, state) {
        final authState = ref.read(authProvider);

        // 认证状态加载中，不重定向
        if (authState.isLoading) return null;

        final isLoggedIn = authState.valueOrNull?.isLoggedIn ?? false;
        final location = state.matchedLocation;

        // 未登录访问受保护路由 → 跳转登录页
        if (!isLoggedIn && _protectedRoutes.contains(location)) {
          return '/login';
        }

        // 已登录访问登录/注册页 → 跳转首页
        if (isLoggedIn && _authRoutes.contains(location)) {
          return '/';
        }

        return null;
      },
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/locations',
          builder: (context, state) => const LocationsListScreen(),
        ),
        GoRoute(
          path: '/locations/:id',
          builder: (context, state) => LocationDetailScreen(
            locationId: state.pathParameters['id']!,
          ),
        ),
        GoRoute(
          path: '/teams',
          builder: (context, state) => const TeamsListScreen(),
        ),
        GoRoute(
          path: '/teams/create',
          builder: (context, state) => const CreateTeamScreen(),
        ),
        GoRoute(
          path: '/teams/:id',
          builder: (context, state) => TeamDetailScreen(
            teamId: state.pathParameters['id']!,
          ),
          routes: [
            GoRoute(
              path: 'manage',
              builder: (context, state) => TeamManageScreen(
                teamId: state.pathParameters['id']!,
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/my-teams',
          builder: (context, state) => const MyTeamsScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileScreen(),
          routes: [
            GoRoute(
              path: 'edit',
              builder: (context, state) => const EditProfileScreen(),
            ),
          ],
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
    // ref.listen 在 build 中注册：仅在登录态变化时通知 GoRouter 重新执行 redirect
    // 更新用户资料时 isLoggedIn 不变，不触发路由守卫，避免保存期间误重定向
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
      theme: AppTheme.light.copyWith(
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
            TargetPlatform.android: ZoomPageTransitionsBuilder(),
          },
        ),
      ),
      themeMode: ThemeMode.light,
      routerConfig: _router,
    );
  }
}

/// GoRouter refreshListenable 的简单封装，暴露公开的 notify() 方法
class _RouterRefreshNotifier extends ChangeNotifier {
  void notify() => notifyListeners();
}
