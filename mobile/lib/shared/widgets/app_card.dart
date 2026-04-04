import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

// ============================================================
// AppCard — 标准卡片组件
// 支持：默认（白底+边框）、图片封面、渐变背景
// ============================================================

/// 标准内容卡片（白底 + 细边框 + 圆角 12）
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final double? borderRadius;
  final Color? backgroundColor;
  final List<BoxShadow>? shadows;
  final Border? border;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.borderRadius,
    this.backgroundColor,
    this.shadows,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final r = borderRadius ?? AppTokens.radiusM;

    Widget content = Container(
      padding: padding ?? const EdgeInsets.all(AppTokens.paddingCard),
      decoration: BoxDecoration(
        color: backgroundColor ?? AppTokens.bgSurface,
        borderRadius: BorderRadius.circular(r),
        border: border ??
            Border.all(
              color: AppTokens.borderDefault,
              width: 1,
            ),
        boxShadow: shadows ?? AppTokens.shadowNone,
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: content,
      );
    }
    return content;
  }
}

/// 带封面图卡片（底部渐变遮罩 + 文字）
class AppImageCard extends StatelessWidget {
  final String imageUrl;
  final Widget bottomContent;
  final double? width;
  final double? height;
  final VoidCallback? onTap;
  final double? borderRadius;
  final Widget? topBadge;

  const AppImageCard({
    super.key,
    required this.imageUrl,
    required this.bottomContent,
    this.width,
    this.height,
    this.onTap,
    this.borderRadius,
    this.topBadge,
  });

  @override
  Widget build(BuildContext context) {
    final r = borderRadius ?? AppTokens.radiusL;

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(r),
        child: Container(
          width: width,
          height: height ?? AppTokens.cardImageH,
          color: AppTokens.bgSurfaceElevated,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 封面图
              CachedNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: AppTokens.bgSurfaceElevated,
                  child: const Center(
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppTokens.brandPrimary,
                    ),
                  ),
                ),
                errorWidget: (context, url, error) => Container(
                  color: AppTokens.bgSurfaceElevated,
                  child: const Icon(
                    Icons.landscape_outlined,
                    color: AppTokens.textTertiary,
                    size: AppTokens.iconXL,
                  ),
                ),
              ),
              // 底部渐变遮罩
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppTokens.gradientImageOverlay,
                ),
              ),
              // 底部内容
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Padding(
                  padding: const EdgeInsets.all(AppTokens.space3),
                  child: bottomContent,
                ),
              ),
              // 可选顶部徽章
              if (topBadge != null)
                Positioned(
                  top: AppTokens.space2,
                  right: AppTokens.space2,
                  child: topBadge!,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 渐变背景卡片（品牌色渐变，用于 Banner / 高亮卡片）
class AppGradientCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Gradient? gradient;
  final double? borderRadius;
  final VoidCallback? onTap;

  const AppGradientCard({
    super.key,
    required this.child,
    this.padding,
    this.gradient,
    this.borderRadius,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final r = borderRadius ?? AppTokens.radiusL;

    Widget content = Container(
      padding: padding ?? const EdgeInsets.all(AppTokens.paddingCard),
      decoration: BoxDecoration(
        gradient: gradient ?? AppTokens.gradientBrand,
        borderRadius: BorderRadius.circular(r),
        boxShadow: const [
          BoxShadow(
            color: Color(0x40D97706),
            blurRadius: 16,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: content);
    }
    return content;
  }
}
