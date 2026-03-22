import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_tokens.dart';

// ============================================================
// AppNavShell — 底部导航壳层
//
// 导航结构（5 Tab）：
//   Tab 0: 首页（Home）       - 精选地点 + 招募队伍
//   Tab 1: 探索（Explore）    - 地点列表 + 路线
//   Tab 2: 发布（+）          - FAB 中间快捷入口
//   Tab 3: 队伍（Teams）      - 队伍列表
//   Tab 4: 我的（Profile）    - 个人中心
// ============================================================

/// 导航项定义
class _NavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String path;

  const _NavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.path,
  });
}

const _navItems = [
  _NavItem(
    label: '首页',
    icon: Icons.home_outlined,
    activeIcon: Icons.home_rounded,
    path: '/',
  ),
  _NavItem(
    label: '探索',
    icon: Icons.explore_outlined,
    activeIcon: Icons.explore_rounded,
    path: '/locations',
  ),
  _NavItem(
    label: '发布',
    icon: Icons.add_circle_outline_rounded,
    activeIcon: Icons.add_circle_rounded,
    path: '/teams/create',
  ),
  _NavItem(
    label: '队伍',
    icon: Icons.group_outlined,
    activeIcon: Icons.group_rounded,
    path: '/teams',
  ),
  _NavItem(
    label: '我的',
    icon: Icons.person_outline_rounded,
    activeIcon: Icons.person_rounded,
    path: '/profile',
  ),
];

/// 底部导航壳层，包裹所有主 Tab 页面
class AppNavShell extends StatelessWidget {
  final Widget child;

  const AppNavShell({super.key, required this.child});

  /// 根据当前路由路径计算选中的 Tab 索引
  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    // 精确匹配或前缀匹配
    if (location == '/') return 0;
    if (location.startsWith('/locations')) return 1;
    if (location == '/teams/create') return 2;
    if (location.startsWith('/teams')) return 3;
    if (location.startsWith('/profile') || location.startsWith('/my-teams')) {
      return 4;
    }
    return 0;
  }

  void _onTap(BuildContext context, int index) {
    // Tab 2（发布）直接 push，不改变底部导航选中态
    if (index == 2) {
      context.push(_navItems[index].path);
      return;
    }
    context.go(_navItems[index].path);
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _currentIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: _AppNavBar(
        selectedIndex: selectedIndex,
        onTap: (i) => _onTap(context, i),
      ),
    );
  }
}

/// 底部导航栏 Widget
class _AppNavBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTap;

  const _AppNavBar({required this.selectedIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTokens.bgSurface,
        border: Border(
          top: BorderSide(color: AppTokens.bgDivider, width: 1),
        ),
      ),
      child: SafeArea(
        child: SizedBox(
          height: AppTokens.navBarHeight,
          child: Row(
            children: List.generate(_navItems.length, (index) {
              final item = _navItems[index];
              final isSelected = index == selectedIndex;
              final isCenter = index == 2;

              // 中间发布按钮特殊处理
              if (isCenter) {
                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onTap(index),
                    child: Center(
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: AppTokens.gradientBrand,
                          borderRadius:
                              BorderRadius.circular(AppTokens.radiusM),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x402EC4B6),
                              blurRadius: 12,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.add_rounded,
                          color: AppTokens.textInverse,
                          size: AppTokens.iconXL,
                        ),
                      ),
                    ),
                  ),
                );
              }

              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onTap(index),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedContainer(
                        duration: AppTokens.durationFast,
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTokens.space3,
                          vertical: AppTokens.space1,
                        ),
                        decoration: isSelected
                            ? BoxDecoration(
                                color: AppTokens.brandPrimaryLight,
                                borderRadius: BorderRadius.circular(
                                    AppTokens.radiusFull),
                              )
                            : null,
                        child: Icon(
                          isSelected ? item.activeIcon : item.icon,
                          color: isSelected
                              ? AppTokens.brandPrimary
                              : AppTokens.textTertiary,
                          size: AppTokens.iconL,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontSize: AppTokens.fontSizeXS,
                          fontWeight: isSelected
                              ? AppTokens.weightSemiBold
                              : AppTokens.weightRegular,
                          color: isSelected
                              ? AppTokens.brandPrimary
                              : AppTokens.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
