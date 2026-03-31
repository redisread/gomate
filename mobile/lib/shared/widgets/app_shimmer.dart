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

// ============================================================
// 详情页骨架屏组件
// ============================================================

/// 地点详情页骨架屏
class LocationDetailShimmer extends StatelessWidget {
  const LocationDetailShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        // 封面图占位
        SliverToBoxAdapter(
          child: AppShimmer(
            width: double.infinity,
            height: 280,
            borderRadius: 0,
          ),
        ),
        // 内容区域
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 标题占位
                AppShimmer(width: 200, height: 24),
                const SizedBox(height: AppTokens.space2),
                // 副标题占位
                AppShimmer(width: 150, height: 16),
                const SizedBox(height: AppTokens.space3),
                // 信息行占位
                Row(
                  children: [
                    AppShimmer(width: 16, height: 16, borderRadius: 8),
                    const SizedBox(width: AppTokens.space1),
                    AppShimmer(width: 100, height: 14),
                  ],
                ),
                const SizedBox(height: AppTokens.space4),
                // 标签占位
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: List.generate(
                    3,
                    (_) => AppShimmer(
                      width: 60,
                      height: 24,
                      borderRadius: 12,
                    ),
                  ),
                ),
                const SizedBox(height: AppTokens.space5),
                const Divider(),
                const SizedBox(height: AppTokens.space4),
                // 地点介绍标题
                AppShimmer(width: 80, height: 18),
                const SizedBox(height: AppTokens.space2),
                // 介绍内容占位
                AppShimmer(width: double.infinity, height: 14),
                const SizedBox(height: AppTokens.space1),
                AppShimmer(width: double.infinity, height: 14),
                const SizedBox(height: AppTokens.space1),
                AppShimmer(width: 200, height: 14),
                const SizedBox(height: AppTokens.space5),
                const Divider(),
                const SizedBox(height: AppTokens.space4),
                // 正在招募的队伍标题
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    AppShimmer(width: 120, height: 18),
                    AppShimmer(width: 60, height: 14),
                  ],
                ),
                const SizedBox(height: AppTokens.space3),
                // 队伍列表占位
                ...List.generate(
                  2,
                  (_) => Padding(
                    padding: const EdgeInsets.only(bottom: AppTokens.space3),
                    child: _TeamCardShimmer(),
                  ),
                ),
                const SizedBox(height: AppTokens.space6),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// 队伍卡片骨架屏（用于地点详情页）
class _TeamCardShimmer extends StatelessWidget {
  const _TeamCardShimmer();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTokens.bgSurface,
        border: Border.all(color: AppTokens.borderDefault),
        borderRadius: BorderRadius.circular(AppTokens.radiusM),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppShimmer(width: 48, height: 48, borderRadius: AppTokens.radiusS),
              const SizedBox(width: AppTokens.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppShimmer(width: 150, height: 16),
                    const SizedBox(height: AppTokens.space1),
                    AppShimmer(width: 80, height: 12),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.space2),
          Row(
            children: [
              AppShimmer(width: 14, height: 14, borderRadius: 7),
              const SizedBox(width: AppTokens.space1),
              AppShimmer(width: 80, height: 13),
              const SizedBox(width: AppTokens.space3),
              AppShimmer(width: 14, height: 14, borderRadius: 7),
              const SizedBox(width: AppTokens.space1),
              AppShimmer(width: 60, height: 13),
            ],
          ),
          const SizedBox(height: AppTokens.space1),
          AppShimmer(width: double.infinity, height: 4, borderRadius: 2),
        ],
      ),
    );
  }
}

/// 队伍详情页骨架屏
class TeamDetailShimmer extends StatelessWidget {
  const TeamDetailShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题和状态占位
          Row(
            children: [
              // 队伍图标占位
              AppShimmer(
                width: 64,
                height: 64,
                borderRadius: AppTokens.radiusM,
              ),
              const SizedBox(width: AppTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppShimmer(width: 180, height: 20),
                    const SizedBox(height: AppTokens.space1),
                    AppShimmer(width: 80, height: 16),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.space5),
          // 信息卡片占位
          _InfoRowShimmer(),
          _InfoRowShimmer(),
          _InfoRowShimmer(),
          _InfoRowShimmer(),
          const SizedBox(height: AppTokens.space4),
          const Divider(),
          const SizedBox(height: AppTokens.space4),
          // 活动介绍标题
          AppShimmer(width: 80, height: 18),
          const SizedBox(height: AppTokens.space2),
          // 介绍内容占位
          AppShimmer(width: double.infinity, height: 14),
          const SizedBox(height: AppTokens.space1),
          AppShimmer(width: double.infinity, height: 14),
          const SizedBox(height: AppTokens.space1),
          AppShimmer(width: 250, height: 14),
          const SizedBox(height: AppTokens.space4),
          // 入队要求标题
          AppShimmer(width: 80, height: 18),
          const SizedBox(height: AppTokens.space2),
          // 要求列表占位
          ...List.generate(
            3,
            (_) => Padding(
              padding: const EdgeInsets.only(bottom: AppTokens.space1),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppShimmer(width: 10, height: 14, borderRadius: 5),
                  const SizedBox(width: AppTokens.space1),
                  AppShimmer(width: 200, height: 14),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppTokens.space4),
          const Divider(),
          const SizedBox(height: AppTokens.space3),
          // 成员列表标题
          AppShimmer(width: 120, height: 18),
          const SizedBox(height: AppTokens.space3),
          // 成员列表占位
          ...List.generate(
            4,
            (_) => Padding(
              padding: const EdgeInsets.only(bottom: AppTokens.space2),
              child: Row(
                children: [
                  AppShimmer(
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                  ),
                  const SizedBox(width: AppTokens.space3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppShimmer(width: 120, height: 14),
                        const SizedBox(height: AppTokens.space1),
                        AppShimmer(width: 80, height: 12),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppTokens.space6),
        ],
      ),
    );
  }
}

/// 信息行骨架屏
class _InfoRowShimmer extends StatelessWidget {
  const _InfoRowShimmer();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          AppShimmer(width: 18, height: 18, borderRadius: 9),
          const SizedBox(width: AppTokens.space2),
          AppShimmer(width: 50, height: 14),
          const SizedBox(width: AppTokens.space1),
          AppShimmer(width: 120, height: 14),
        ],
      ),
    );
  }
}
