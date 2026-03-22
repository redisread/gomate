import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

// ============================================================
// AppShimmer — 骨架屏加载占位组件
// 用于替代空白等待，提升感知速度
// ============================================================

/// 单个 Shimmer 占位块
class AppShimmer extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const AppShimmer({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = AppTokens.radiusM,
  });

  @override
  State<AppShimmer> createState() => _AppShimmerState();
}

class _AppShimmerState extends State<AppShimmer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _animation = Tween<double>(begin: -1.5, end: 1.5).animate(
      CurvedAnimation(parent: _controller, curve: Curves.linear),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(_animation.value - 1, 0),
              end: Alignment(_animation.value, 0),
              colors: const [
                AppTokens.bgSurfaceElevated,
                AppTokens.bgDivider,
                AppTokens.bgSurfaceElevated,
              ],
            ),
          ),
        );
      },
    );
  }
}

/// 首页地点横向卡片骨架屏
class HomeLocationShimmer extends StatelessWidget {
  const HomeLocationShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
        itemCount: 4,
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.only(right: AppTokens.space3),
          child: AppShimmer(
            width: AppTokens.cardWidthHorizontal,
            height: 200,
            borderRadius: AppTokens.radiusL,
          ),
        ),
      ),
    );
  }
}

/// 首页队伍列表骨架屏
class HomeTeamShimmer extends StatelessWidget {
  const HomeTeamShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(height: AppTokens.space2),
      itemBuilder: (_, __) => Container(
        padding: const EdgeInsets.all(AppTokens.space4),
        decoration: BoxDecoration(
          color: AppTokens.bgSurface,
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          border: Border.all(color: AppTokens.borderDefault, width: 1),
        ),
        child: Row(
          children: [
            AppShimmer(
              width: 48,
              height: 48,
              borderRadius: AppTokens.radiusS,
            ),
            const SizedBox(width: AppTokens.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppShimmer(width: double.infinity, height: 16),
                  const SizedBox(height: AppTokens.space2),
                  AppShimmer(width: 100, height: 12),
                ],
              ),
            ),
            const SizedBox(width: AppTokens.space3),
            AppShimmer(
              width: 56,
              height: 24,
              borderRadius: AppTokens.radiusS,
            ),
          ],
        ),
      ),
    );
  }
}

/// 地点网格骨架屏
class LocationGridShimmer extends StatelessWidget {
  const LocationGridShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(AppTokens.space4),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.8,
        crossAxisSpacing: AppTokens.space3,
        mainAxisSpacing: AppTokens.space3,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => AppShimmer(
        width: double.infinity,
        height: double.infinity,
        borderRadius: AppTokens.radiusL,
      ),
    );
  }
}
