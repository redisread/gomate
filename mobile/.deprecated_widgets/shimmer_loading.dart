import 'package:flutter/material.dart';
import '../core/theme/app_tokens.dart';

/// Shimmer 骨架屏（纯 Flutter 实现，无需第三方包）
///
/// 使用方法：
/// ```dart
/// ShimmerLoading(child: ShimmerCard())
/// ShimmerLoading(child: ShimmerListItem())
/// ```
class ShimmerLoading extends StatefulWidget {
  const ShimmerLoading({
    super.key,
    required this.child,
    this.baseColor,
    this.highlightColor,
  });

  final Widget child;

  /// 底色（默认极浅蓝绿）
  final Color? baseColor;

  /// 高亮扫光色（默认白色半透明）
  final Color? highlightColor;

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    _animation = Tween<double>(begin: -2.0, end: 2.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final baseColor = widget.baseColor ?? AppTokens.colorBgElevated;
    final highlightColor =
        widget.highlightColor ?? Colors.white.withValues(alpha: 0.6);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                baseColor,
                highlightColor,
                baseColor,
              ],
              stops: const [0.0, 0.5, 1.0],
              transform: _SlideTransform(_animation.value),
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// 渐变平移 Transform（用于 Shimmer 扫光效果）
class _SlideTransform extends GradientTransform {
  const _SlideTransform(this.slidePercent);
  final double slidePercent;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(
      bounds.width * slidePercent,
      0,
      0,
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  骨架屏子组件
// ──────────────────────────────────────────────────────────────────

/// 通用骨架块（矩形占位）
class ShimmerBlock extends StatelessWidget {
  const ShimmerBlock({
    super.key,
    this.width,
    this.height = 16.0,
    this.borderRadius,
    this.color,
  });

  final double? width;
  final double height;
  final double? borderRadius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color ?? AppTokens.colorBgElevated,
        borderRadius: BorderRadius.circular(
          borderRadius ?? AppTokens.radiusSM,
        ),
      ),
    );
  }
}

/// 骨架屏：卡片样式（适用于地点/队伍列表项）
class ShimmerCard extends StatelessWidget {
  const ShimmerCard({super.key, this.showImage = true});

  final bool showImage;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTokens.colorBgSurface,
        borderRadius: BorderRadius.circular(AppTokens.radiusLG),
        border: Border.all(color: AppTokens.colorBorder, width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showImage)
            const ShimmerBlock(
              width: double.infinity,
              height: 160,
              borderRadius: 0,
            ),
          Padding(
            padding: const EdgeInsets.all(AppTokens.space16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerBlock(
                  width: double.infinity,
                  height: 18,
                ),
                const SizedBox(height: AppTokens.space8),
                const ShimmerBlock(
                  width: 200,
                  height: 14,
                ),
                const SizedBox(height: AppTokens.space12),
                Row(
                  children: const [
                    ShimmerBlock(width: 60, height: 24, borderRadius: 12),
                    SizedBox(width: AppTokens.space8),
                    ShimmerBlock(width: 60, height: 24, borderRadius: 12),
                    Spacer(),
                    ShimmerBlock(width: 80, height: 14),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 骨架屏：列表行样式（适用于消息/简单列表）
class ShimmerListItem extends StatelessWidget {
  const ShimmerListItem({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space16,
        vertical: AppTokens.space10,
      ),
      child: Row(
        children: [
          // 头像
          const ShimmerBlock(
            width: 48,
            height: 48,
            borderRadius: AppTokens.radiusFull,
          ),
          const SizedBox(width: AppTokens.space12),
          // 文字
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                ShimmerBlock(width: double.infinity, height: 14),
                SizedBox(height: AppTokens.space6),
                ShimmerBlock(width: 160, height: 12),
              ],
            ),
          ),
          const SizedBox(width: AppTokens.space12),
          const ShimmerBlock(width: 50, height: 12),
        ],
      ),
    );
  }
}
