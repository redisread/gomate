import 'package:flutter/material.dart';
import '../core/theme/app_tokens.dart';

/// GoMate 统一卡片组件
///
/// 特性：
/// - 按下时 scale(0.98) + elevation 降低动画
/// - 圆角 16px（可覆盖）
/// - 可选渐变背景
/// - Hero 动画支持（heroTag 参数）
/// - 内容 slot（child）
/// - const 优化（部分字段支持）
class AppCard extends StatefulWidget {
  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.padding,
    this.borderRadius,
    this.backgroundColor,
    this.gradient,
    this.border,
    this.shadows,
    this.heroTag,
    this.useGradient = false,
    this.pressable = true,
    this.width,
    this.height,
    this.margin,
  });

  /// 卡片内容
  final Widget child;

  /// 点击回调（null 时不显示点击反馈）
  final VoidCallback? onTap;

  /// 长按回调
  final VoidCallback? onLongPress;

  /// 内边距（默认 16）
  final EdgeInsetsGeometry? padding;

  /// 圆角（默认 16px）
  final double? borderRadius;

  /// 自定义背景色（优先级低于 gradient）
  final Color? backgroundColor;

  /// 渐变背景（不为 null 则覆盖 backgroundColor）
  final Gradient? gradient;

  /// 自定义边框
  final BoxBorder? border;

  /// 自定义阴影
  final List<BoxShadow>? shadows;

  /// Hero 动效标识（不为 null 则包裹 Hero widget）
  final Object? heroTag;

  /// 是否使用默认品牌渐变背景
  final bool useGradient;

  /// 是否显示按压动效（false 时纯静态卡片）
  final bool pressable;

  final double? width;
  final double? height;
  final EdgeInsetsGeometry? margin;

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _isPressed = false;

  void _handleTapDown(TapDownDetails _) {
    if (widget.pressable && widget.onTap != null) {
      setState(() => _isPressed = true);
    }
  }

  void _handleTapUp(TapUpDetails _) {
    setState(() => _isPressed = false);
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
  }

  double get _radius => widget.borderRadius ?? AppTokens.radiusLG;

  Gradient? get _effectiveGradient {
    if (widget.gradient != null) return widget.gradient;
    if (widget.useGradient) return AppTokens.gradientCard;
    return null;
  }

  Color get _effectiveBackground {
    if (_effectiveGradient != null) return Colors.transparent;
    return widget.backgroundColor ?? AppTokens.colorBgSurface;
  }

  List<BoxShadow> get _effectiveShadows {
    if (widget.shadows != null) return widget.shadows!;
    if (_isPressed) return AppTokens.shadowXS;
    return AppTokens.shadowSM;
  }

  @override
  Widget build(BuildContext context) {
    Widget card = GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      onTap: widget.onTap,
      onLongPress: widget.onLongPress,
      child: AnimatedScale(
        scale: _isPressed ? 0.98 : 1.0,
        duration: AppTokens.durationNormal,
        curve: AppTokens.curveEnter,
        child: _buildCardBody(),
      ),
    );

    // 包裹 Hero 动效
    if (widget.heroTag != null) {
      card = Hero(
        tag: widget.heroTag!,
        child: card,
      );
    }

    if (widget.margin != null) {
      card = Padding(padding: widget.margin!, child: card);
    }

    return card;
  }

  Widget _buildCardBody() {
    return AnimatedContainer(
      duration: AppTokens.durationNormal,
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: _effectiveBackground,
        gradient: _effectiveGradient,
        borderRadius: BorderRadius.circular(_radius),
        border: widget.border ??
            Border.all(
              color: _isPressed
                  ? AppTokens.colorBorderStrong
                  : AppTokens.colorBorder,
              width: 1,
            ),
        boxShadow: _effectiveShadows,
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: widget.padding ??
            const EdgeInsets.all(AppTokens.space16),
        child: widget.child,
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  变体：图片卡片（顶部图片 + 底部内容区）
// ──────────────────────────────────────────────────────────────────

/// 带封面图的卡片（适用于地点卡片、队伍卡片）
class AppImageCard extends StatefulWidget {
  const AppImageCard({
    super.key,
    required this.imageWidget,
    required this.child,
    this.onTap,
    this.heroTag,
    this.imageHeight = 160.0,
    this.borderRadius,
    this.margin,
    this.contentPadding,
  });

  final Widget imageWidget;
  final Widget child;
  final VoidCallback? onTap;
  final Object? heroTag;
  final double imageHeight;
  final double? borderRadius;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? contentPadding;

  @override
  State<AppImageCard> createState() => _AppImageCardState();
}

class _AppImageCardState extends State<AppImageCard> {
  bool _isPressed = false;

  double get _radius => widget.borderRadius ?? AppTokens.radiusLG;

  @override
  Widget build(BuildContext context) {
    Widget card = GestureDetector(
      onTapDown: (_) {
        if (widget.onTap != null) setState(() => _isPressed = true);
      },
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _isPressed ? 0.97 : 1.0,
        duration: AppTokens.durationNormal,
        curve: AppTokens.curveEnter,
        child: _buildBody(),
      ),
    );

    if (widget.heroTag != null) {
      card = Hero(tag: widget.heroTag!, child: card);
    }

    if (widget.margin != null) {
      card = Padding(padding: widget.margin!, child: card);
    }

    return card;
  }

  Widget _buildBody() {
    return AnimatedContainer(
      duration: AppTokens.durationNormal,
      decoration: BoxDecoration(
        color: AppTokens.colorBgSurface,
        borderRadius: BorderRadius.circular(_radius),
        border: Border.all(
          color: _isPressed ? AppTokens.colorBorderStrong : AppTokens.colorBorder,
          width: 1,
        ),
        boxShadow: _isPressed ? AppTokens.shadowXS : AppTokens.shadowSM,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // 封面图区域
          SizedBox(
            height: widget.imageHeight,
            child: widget.imageWidget,
          ),
          // 内容区域
          Padding(
            padding: widget.contentPadding ??
                const EdgeInsets.all(AppTokens.space16),
            child: widget.child,
          ),
        ],
      ),
    );
  }
}
