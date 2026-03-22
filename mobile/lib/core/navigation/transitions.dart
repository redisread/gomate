import 'package:flutter/material.dart';
import '../../shared/theme/app_tokens.dart';

/// GoMate 自定义页面转场动画集合
///
/// 提供以下转场效果：
/// - [slideFromRight]：标准右滑进入（iOS/Android 通用）
/// - [slideFromBottom]：底部弹出（创建类页面）
/// - [fadeScale]：淡入 + 轻微放大（详情页/模态页）
/// - [heroFade]：配合 Hero 动效的淡入转场
abstract class AppTransitions {
  AppTransitions._();

  // ─────────────────────────────────────────────────
  //  右滑进入（标准导航）
  // ─────────────────────────────────────────────────

  /// 构建标准右滑进入转场的 TransitionBuilder
  static Widget slideFromRight(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // 主页面：右→中
    final slideTween = Tween<Offset>(
      begin: const Offset(1.0, 0.0),
      end: Offset.zero,
    ).chain(CurveTween(curve: AppTokens.curveEnter));

    // 上一页：中→左轻微位移（视差效果）
    final secondarySlideTween = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(-0.25, 0.0),
    ).chain(CurveTween(curve: AppTokens.curveExit));

    return SlideTransition(
      position: secondaryAnimation.drive(secondarySlideTween),
      child: SlideTransition(
        position: animation.drive(slideTween),
        child: child,
      ),
    );
  }

  // ─────────────────────────────────────────────────
  //  底部弹出（创建页 / Sheet）
  // ─────────────────────────────────────────────────

  static Widget slideFromBottom(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final slideTween = Tween<Offset>(
      begin: const Offset(0.0, 1.0),
      end: Offset.zero,
    ).chain(CurveTween(curve: AppTokens.curveSpring));

    final fadeTween = Tween<double>(begin: 0.0, end: 1.0)
        .chain(CurveTween(curve: const Interval(0.0, 0.5)));

    return FadeTransition(
      opacity: animation.drive(fadeTween),
      child: SlideTransition(
        position: animation.drive(slideTween),
        child: child,
      ),
    );
  }

  // ─────────────────────────────────────────────────
  //  淡入 + 轻微放大（详情页）
  // ─────────────────────────────────────────────────

  static Widget fadeScale(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final fadeTween = Tween<double>(begin: 0.0, end: 1.0)
        .chain(CurveTween(curve: Curves.easeOut));

    final scaleTween = Tween<double>(begin: 0.94, end: 1.0)
        .chain(CurveTween(curve: AppTokens.curveEnter));

    return FadeTransition(
      opacity: animation.drive(fadeTween),
      child: ScaleTransition(
        scale: animation.drive(scaleTween),
        child: child,
      ),
    );
  }

  // ─────────────────────────────────────────────────
  //  纯淡入（配合 Hero 动效）
  // ─────────────────────────────────────────────────

  static Widget heroFade(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(
      opacity: animation.drive(
        Tween<double>(begin: 0.0, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
      ),
      child: child,
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  自定义 PageRoute（脱离 GoRouter 时使用）
// ──────────────────────────────────────────────────────────────────

/// 右滑进入 PageRoute
class SlideRightRoute<T> extends PageRouteBuilder<T> {
  SlideRightRoute({required Widget page, super.settings})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: AppTransitions.slideFromRight,
          transitionDuration: AppTokens.durationMedium,
          reverseTransitionDuration: AppTokens.durationNormal,
        );
}

/// 底部弹出 PageRoute
class SlideUpRoute<T> extends PageRouteBuilder<T> {
  SlideUpRoute({required Widget page, super.settings})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: AppTransitions.slideFromBottom,
          transitionDuration: AppTokens.durationSlow,
          reverseTransitionDuration: AppTokens.durationMedium,
        );
}

/// 淡入缩放 PageRoute
class FadeScaleRoute<T> extends PageRouteBuilder<T> {
  FadeScaleRoute({required Widget page, super.settings})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: AppTransitions.fadeScale,
          transitionDuration: AppTokens.durationMedium,
          reverseTransitionDuration: AppTokens.durationNormal,
        );
}
