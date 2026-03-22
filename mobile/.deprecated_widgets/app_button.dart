import 'package:flutter/material.dart';
import '../core/theme/app_tokens.dart';

/// 按钮变体类型
enum AppButtonVariant {
  /// 主要（蓝绿填充）
  primary,

  /// 次要（描边）
  secondary,

  /// 幽灵（透明，仅文字）
  ghost,

  /// 危险（红色）
  danger,

  /// 渐变（品牌渐变）
  gradient,
}

/// 按钮尺寸
enum AppButtonSize {
  small,
  medium,
  large,
}

/// GoMate 统一按钮组件
///
/// 特性：
/// - 支持 primary / secondary / ghost / danger / gradient 5种变体
/// - 按下时 scale(0.95) + 明度变化动画（100ms）
/// - loading 状态（CircularProgressIndicator）
/// - 禁用状态（自动降低透明度）
/// - 支持前缀图标
/// - const 构造函数优化
class AppButton extends StatefulWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.medium,
    this.icon,
    this.isLoading = false,
    this.isDisabled = false,
    this.fullWidth = false,
    this.borderRadius,
  });

  /// 按钮文字
  final String label;

  /// 点击回调（null 时自动禁用）
  final VoidCallback? onPressed;

  /// 变体类型
  final AppButtonVariant variant;

  /// 尺寸
  final AppButtonSize size;

  /// 前缀图标
  final IconData? icon;

  /// 加载状态
  final bool isLoading;

  /// 强制禁用
  final bool isDisabled;

  /// 是否撑满宽度
  final bool fullWidth;

  /// 自定义圆角（覆盖默认值）
  final double? borderRadius;

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton>
    with SingleTickerProviderStateMixin {
  bool _isPressed = false;

  bool get _effectivelyDisabled =>
      widget.isDisabled || widget.isLoading || widget.onPressed == null;

  // ── 根据变体计算样式 ────────────────────────────────

  Color get _backgroundColor {
    switch (widget.variant) {
      case AppButtonVariant.primary:
        return _isPressed
            ? AppTokens.colorPrimaryDark
            : AppTokens.colorPrimary;
      case AppButtonVariant.secondary:
      case AppButtonVariant.ghost:
        return _isPressed
            ? AppTokens.colorPrimaryContainer
            : Colors.transparent;
      case AppButtonVariant.danger:
        return _isPressed
            ? const Color(0xFFDC2626)
            : AppTokens.colorError;
      case AppButtonVariant.gradient:
        return Colors.transparent; // 渐变通过 decoration 绘制
    }
  }

  Color get _foregroundColor {
    switch (widget.variant) {
      case AppButtonVariant.primary:
      case AppButtonVariant.gradient:
      case AppButtonVariant.danger:
        return Colors.white;
      case AppButtonVariant.secondary:
        return AppTokens.colorPrimary;
      case AppButtonVariant.ghost:
        return _isPressed
            ? AppTokens.colorPrimaryDark
            : AppTokens.colorTextSecondary;
    }
  }

  BorderSide get _borderSide {
    switch (widget.variant) {
      case AppButtonVariant.secondary:
        return const BorderSide(
          color: AppTokens.colorPrimary,
          width: 1.5,
        );
      case AppButtonVariant.ghost:
        return BorderSide.none;
      case AppButtonVariant.primary:
      case AppButtonVariant.gradient:
      case AppButtonVariant.danger:
        return BorderSide.none;
    }
  }

  // ── 尺寸映射 ────────────────────────────────────────

  double get _height {
    switch (widget.size) {
      case AppButtonSize.small:
        return AppTokens.buttonHeightSM;
      case AppButtonSize.medium:
        return AppTokens.buttonHeight;
      case AppButtonSize.large:
        return 60.0;
    }
  }

  double get _fontSize {
    switch (widget.size) {
      case AppButtonSize.small:
        return AppTokens.fontSizeXS;
      case AppButtonSize.medium:
        return AppTokens.fontSizeMD;
      case AppButtonSize.large:
        return AppTokens.fontSizeLG;
    }
  }

  double get _iconSize {
    switch (widget.size) {
      case AppButtonSize.small:
        return AppTokens.iconSM;
      case AppButtonSize.medium:
        return AppTokens.iconMD;
      case AppButtonSize.large:
        return AppTokens.iconLG;
    }
  }

  double get _radius =>
      widget.borderRadius ?? AppTokens.radiusMD;

  // ── 事件处理 ────────────────────────────────────────

  void _handleTapDown(TapDownDetails _) {
    if (!_effectivelyDisabled) {
      setState(() => _isPressed = true);
    }
  }

  void _handleTapUp(TapUpDetails _) {
    setState(() => _isPressed = false);
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    final content = _buildContent();

    Widget button = GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      onTap: _effectivelyDisabled ? null : widget.onPressed,
      child: AnimatedScale(
        scale: _isPressed && !_effectivelyDisabled ? 0.95 : 1.0,
        duration: AppTokens.durationFast,
        curve: AppTokens.curveEnter,
        child: AnimatedOpacity(
          opacity: _effectivelyDisabled ? 0.5 : 1.0,
          duration: AppTokens.durationNormal,
          child: _buildButtonContainer(content),
        ),
      ),
    );

    if (widget.fullWidth) {
      button = SizedBox(width: double.infinity, child: button);
    }

    return button;
  }

  Widget _buildButtonContainer(Widget content) {
    // 渐变变体需要用 DecoratedBox 包裹
    if (widget.variant == AppButtonVariant.gradient) {
      return DecoratedBox(
        decoration: BoxDecoration(
          gradient: _isPressed
              ? const LinearGradient(
                  colors: [AppTokens.colorPrimaryDark, Color(0xFF6366F1)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                )
              : AppTokens.gradientBrand,
          borderRadius: BorderRadius.circular(_radius),
        ),
        child: Container(
          height: _height,
          padding: EdgeInsets.symmetric(
            horizontal: widget.size == AppButtonSize.small ? 16 : 24,
          ),
          alignment: Alignment.center,
          child: content,
        ),
      );
    }

    return AnimatedContainer(
      duration: AppTokens.durationFast,
      height: _height,
      padding: EdgeInsets.symmetric(
        horizontal: widget.size == AppButtonSize.small ? 16 : 24,
      ),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(_radius),
        border: _borderSide != BorderSide.none
            ? Border.fromBorderSide(_borderSide)
            : null,
      ),
      child: content,
    );
  }

  Widget _buildContent() {
    if (widget.isLoading) {
      return SizedBox(
        width: _iconSize,
        height: _iconSize,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(_foregroundColor),
        ),
      );
    }

    final textWidget = Text(
      widget.label,
      style: TextStyle(
        color: _foregroundColor,
        fontSize: _fontSize,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.1,
      ),
    );

    if (widget.icon == null) {
      return textWidget;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(widget.icon, color: _foregroundColor, size: _iconSize),
        const SizedBox(width: AppTokens.space8),
        textWidget,
      ],
    );
  }
}
