import 'package:flutter/material.dart';
import '../core/theme/app_tokens.dart';

/// 底部导航 Tab 配置项
class AppNavItem {
  const AppNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.badge,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;

  /// 徽标数字（null 表示无徽标）
  final int? badge;
}

/// GoMate 底部导航栏
///
/// 特性：
/// - 5个 Tab：首页 / 探索 / + / 队伍 / 我的
/// - 中间 FAB 样式（渐变背景，突出显示）
/// - 选中 Tab：icon scale + label fade 动画
/// - 底部安全区适配
/// - Material 3 风格
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.items,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  /// 自定义 Tab 项（null 时使用默认 GoMate 配置）
  final List<AppNavItem>? items;

  /// 默认 Tab 配置
  static const List<AppNavItem> _defaultItems = [
    AppNavItem(
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
      label: '首页',
    ),
    AppNavItem(
      icon: Icons.explore_outlined,
      activeIcon: Icons.explore_rounded,
      label: '探索',
    ),
    // 中间 FAB 占位（index=2）
    AppNavItem(
      icon: Icons.add,
      activeIcon: Icons.add,
      label: '',
    ),
    AppNavItem(
      icon: Icons.group_outlined,
      activeIcon: Icons.group_rounded,
      label: '队伍',
    ),
    AppNavItem(
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
      label: '我的',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final navItems = items ?? _defaultItems;

    return Container(
      decoration: const BoxDecoration(
        color: AppTokens.colorBgSurface,
        border: Border(
          top: BorderSide(
            color: AppTokens.colorBorder,
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x142DD4BF),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: AppTokens.bottomNavHeight,
          child: Row(
            children: List.generate(navItems.length, (index) {
              final item = navItems[index];
              final isSelected = index == currentIndex;
              final isFab = index == 2 && navItems.length == 5;

              if (isFab) {
                return _FabNavItem(
                  onTap: () => onTap(index),
                  icon: item.icon,
                );
              }

              return _NavItem(
                item: item,
                isSelected: isSelected,
                onTap: () => onTap(index),
              );
            }),
          ),
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  普通 Tab Item
// ──────────────────────────────────────────────────────────────────

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.item,
    required this.isSelected,
    required this.onTap,
  });

  final AppNavItem item;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 图标（带 scale 动画）
            _BadgeIcon(
              icon: isSelected ? item.activeIcon : item.icon,
              isSelected: isSelected,
              badge: item.badge,
            ),
            const SizedBox(height: 4),
            // 标签（带 fade 动画）
            AnimatedDefaultTextStyle(
              duration: AppTokens.durationNormal,
              style: TextStyle(
                fontSize: AppTokens.fontSizeXS,
                fontWeight:
                    isSelected ? FontWeight.w600 : FontWeight.w400,
                color: isSelected
                    ? AppTokens.colorPrimary
                    : AppTokens.colorTextTertiary,
                height: 1.0,
              ),
              child: Text(item.label),
            ),
          ],
        ),
      ),
    );
  }
}

/// 带徽标的图标组件
class _BadgeIcon extends StatelessWidget {
  const _BadgeIcon({
    required this.icon,
    required this.isSelected,
    this.badge,
  });

  final IconData icon;
  final bool isSelected;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    Widget iconWidget = AnimatedScale(
      scale: isSelected ? 1.15 : 1.0,
      duration: AppTokens.durationNormal,
      curve: AppTokens.curveSpring,
      child: Icon(
        icon,
        size: AppTokens.iconLG,
        color: isSelected
            ? AppTokens.colorPrimary
            : AppTokens.colorTextTertiary,
      ),
    );

    if (badge != null && badge! > 0) {
      iconWidget = Stack(
        clipBehavior: Clip.none,
        children: [
          iconWidget,
          Positioned(
            right: -4,
            top: -4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: const BoxDecoration(
                color: AppTokens.colorError,
                borderRadius: BorderRadius.all(Radius.circular(8)),
              ),
              child: Text(
                badge! > 99 ? '99+' : badge.toString(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                ),
              ),
            ),
          ),
        ],
      );
    }

    // 选中态：显示指示器背景
    if (isSelected) {
      iconWidget = AnimatedContainer(
        duration: AppTokens.durationNormal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: AppTokens.colorPrimaryContainer,
          borderRadius: BorderRadius.circular(AppTokens.radiusFull),
        ),
        child: iconWidget,
      );
    }

    return iconWidget;
  }
}

// ──────────────────────────────────────────────────────────────────
//  中间 FAB Tab Item
// ──────────────────────────────────────────────────────────────────

class _FabNavItem extends StatefulWidget {
  const _FabNavItem({
    required this.onTap,
    required this.icon,
  });

  final VoidCallback onTap;
  final IconData icon;

  @override
  State<_FabNavItem> createState() => _FabNavItemState();
}

class _FabNavItemState extends State<_FabNavItem> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        onTap: widget.onTap,
        child: Center(
          child: AnimatedScale(
            scale: _isPressed ? 0.9 : 1.0,
            duration: AppTokens.durationFast,
            curve: AppTokens.curveSpring,
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: AppTokens.gradientBrand,
                shape: BoxShape.circle,
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x402DD4BF),
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(
                widget.icon,
                color: Colors.white,
                size: AppTokens.iconXL,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
