import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

// ============================================================
// AppButton — 统一按钮组件
// 支持：primary（实心品牌色）、secondary（描边）、ghost（透明）
// 支持：图标前缀、渐变模式、加载态、全宽
// ============================================================

enum AppButtonVariant { primary, secondary, ghost, danger }

enum AppButtonSize { small, medium, large }

/// 统一按钮
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final bool isLoading;
  final bool isFullWidth;
  final bool useGradient;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.medium,
    this.prefixIcon,
    this.suffixIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.useGradient = false,
  });

  /// 小尺寸
  const AppButton.small({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.prefixIcon,
    this.suffixIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.useGradient = false,
  }) : size = AppButtonSize.small;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || isLoading;
    final height = _resolveHeight(size);
    final hPad = _resolveHPadding(size);
    final fontSize = _resolveFontSize(size);

    Widget labelWidget = isLoading
        ? SizedBox(
            width: fontSize + 2,
            height: fontSize + 2,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _resolveFgColor(variant, disabled),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (prefixIcon != null) ...[
                Icon(prefixIcon, size: fontSize + 2),
                const SizedBox(width: AppTokens.space2),
              ],
              Text(label),
              if (suffixIcon != null) ...[
                const SizedBox(width: AppTokens.space2),
                Icon(suffixIcon, size: fontSize + 2),
              ],
            ],
          );

    // 渐变主按钮
    if (variant == AppButtonVariant.primary && useGradient && !disabled) {
      return _GradientButton(
        onPressed: isLoading ? null : onPressed,
        height: height,
        hPad: hPad,
        fontSize: fontSize,
        isFullWidth: isFullWidth,
        child: labelWidget,
      );
    }

    final style = _resolveStyle(variant, size, disabled, height, hPad);

    Widget btn;
    switch (variant) {
      case AppButtonVariant.secondary:
        btn = OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: style,
          child: labelWidget,
        );
      case AppButtonVariant.ghost:
        btn = TextButton(
          onPressed: isLoading ? null : onPressed,
          style: style,
          child: labelWidget,
        );
      case AppButtonVariant.primary:
      case AppButtonVariant.danger:
        btn = ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: style,
          child: labelWidget,
        );
    }

    if (isFullWidth) {
      return SizedBox(width: double.infinity, child: btn);
    }
    return btn;
  }

  ButtonStyle _resolveStyle(
    AppButtonVariant v,
    AppButtonSize s,
    bool disabled,
    double height,
    double hPad,
  ) {
    final fgColor = _resolveFgColor(v, disabled);
    final bgColor = _resolveBgColor(v, disabled);

    return ButtonStyle(
      backgroundColor: WidgetStateProperty.all(bgColor),
      foregroundColor: WidgetStateProperty.all(fgColor),
      overlayColor: WidgetStateProperty.all(
        fgColor.withValues(alpha: 0.08),
      ),
      minimumSize: WidgetStateProperty.all(Size(0, height)),
      padding: WidgetStateProperty.all(
        EdgeInsets.symmetric(horizontal: hPad, vertical: 0),
      ),
      shape: WidgetStateProperty.all(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
          side: v == AppButtonVariant.secondary
              ? BorderSide(
                  color: disabled
                      ? AppTokens.borderDefault
                      : AppTokens.brandPrimary,
                  width: 1.5,
                )
              : BorderSide.none,
        ),
      ),
      elevation: WidgetStateProperty.all(0),
      textStyle: WidgetStateProperty.all(
        TextStyle(
          fontSize: _resolveFontSize(s),
          fontWeight: AppTokens.weightSemiBold,
        ),
      ),
    );
  }

  Color _resolveBgColor(AppButtonVariant v, bool disabled) {
    if (disabled) {
      if (v == AppButtonVariant.primary) return AppTokens.brandPrimaryLight;
      if (v == AppButtonVariant.danger) return AppTokens.semanticError.withValues(alpha: 0.1);
      return Colors.transparent;
    }
    switch (v) {
      case AppButtonVariant.primary:
        return AppTokens.brandPrimary;
      case AppButtonVariant.danger:
        return AppTokens.semanticError;
      case AppButtonVariant.secondary:
      case AppButtonVariant.ghost:
        return Colors.transparent;
    }
  }

  Color _resolveFgColor(AppButtonVariant v, bool disabled) {
    if (disabled) {
      if (v == AppButtonVariant.primary) return AppTokens.textTertiary;
      if (v == AppButtonVariant.danger) return AppTokens.semanticError;
      return AppTokens.textTertiary;
    }
    switch (v) {
      case AppButtonVariant.primary:
        return AppTokens.textInverse;
      case AppButtonVariant.danger:
        return AppTokens.textInverse;
      case AppButtonVariant.secondary:
        return AppTokens.brandPrimary;
      case AppButtonVariant.ghost:
        return AppTokens.textSecondary;
    }
  }

  double _resolveHeight(AppButtonSize s) {
    switch (s) {
      case AppButtonSize.small:
        return AppTokens.btnHeightS;
      case AppButtonSize.medium:
        return AppTokens.btnHeightM;
      case AppButtonSize.large:
        return AppTokens.btnHeightL;
    }
  }

  double _resolveHPadding(AppButtonSize s) {
    switch (s) {
      case AppButtonSize.small:
        return AppTokens.space3;
      case AppButtonSize.medium:
        return AppTokens.space6;
      case AppButtonSize.large:
        return AppTokens.space8;
    }
  }

  double _resolveFontSize(AppButtonSize s) {
    switch (s) {
      case AppButtonSize.small:
        return AppTokens.fontSizeS;
      case AppButtonSize.medium:
        return AppTokens.fontSizeM;
      case AppButtonSize.large:
        return AppTokens.fontSizeL;
    }
  }
}

/// 渐变按钮容器
class _GradientButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final double height;
  final double hPad;
  final double fontSize;
  final bool isFullWidth;
  final Widget child;

  const _GradientButton({
    required this.onPressed,
    required this.height,
    required this.hPad,
    required this.fontSize,
    required this.isFullWidth,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        height: height,
        width: isFullWidth ? double.infinity : null,
        padding: EdgeInsets.symmetric(horizontal: hPad),
        decoration: BoxDecoration(
          gradient: AppTokens.gradientBrand,
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
          boxShadow: const [
            BoxShadow(
              color: Color(0x402EC4B6),
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: DefaultTextStyle(
          style: TextStyle(
            color: AppTokens.textInverse,
            fontSize: fontSize,
            fontWeight: AppTokens.weightSemiBold,
          ),
          child: IconTheme(
            data: const IconThemeData(color: AppTokens.textInverse),
            child: Center(child: child),
          ),
        ),
      ),
    );
  }
}
