import 'package:flutter/material.dart';

/// 设计 Token 系统 —— 蓝绿调（温暖感）
/// 参考：slock.ai 柔和蓝绿调色板
/// 所有常量均为 const，可在 const Widget 中直接引用
abstract class AppTokens {
  AppTokens._();

  // ─────────────────────────────────────────────
  // 颜色 Tokens
  // ─────────────────────────────────────────────

  /// 品牌主色：柔和蓝绿（Teal）
  static const Color colorPrimary = Color(0xFF2DD4BF);

  /// 品牌主色深色变体（按钮激活态）
  static const Color colorPrimaryDark = Color(0xFF0D9488);

  /// 品牌主色浅色容器背景
  static const Color colorPrimaryContainer = Color(0xFFCCFBF1);

  /// 品牌强调色：柔和蓝紫
  static const Color colorSecondary = Color(0xFF818CF8);

  /// 次要强调浅色容器
  static const Color colorSecondaryContainer = Color(0xFFE0E7FF);

  /// 成功色
  static const Color colorSuccess = Color(0xFF34D399);

  /// 警告色
  static const Color colorWarning = Color(0xFFFBBF24);

  /// 错误色
  static const Color colorError = Color(0xFFF87171);

  /// 信息色
  static const Color colorInfo = Color(0xFF60A5FA);

  // 亮色模式背景层次
  static const Color colorBgBase = Color(0xFFF0FDFA);        // 主背景（极浅蓝绿）
  static const Color colorBgSurface = Color(0xFFFFFFFF);     // 卡片 / 输入框
  static const Color colorBgElevated = Color(0xFFE6FFFA);    // 悬浮面板
  static const Color colorBgOverlay = Color(0xFFF8FFFE);     // 弱区域背景

  // 边框
  static const Color colorBorder = Color(0xFFB2F5EA);        // 主边框
  static const Color colorBorderStrong = Color(0xFF81E6D9);  // 强边框

  // 亮色文字
  static const Color colorTextPrimary = Color(0xFF134E4A);   // 深蓝绿主文字
  static const Color colorTextSecondary = Color(0xFF2F736E); // 次要文字
  static const Color colorTextTertiary = Color(0xFF5EADA7);  // 弱文字 / 占位符

  // 暗色模式背景层次
  static const Color colorDarkBgBase = Color(0xFF042F2E);
  static const Color colorDarkBgSurface = Color(0xFF0D4740);
  static const Color colorDarkBgElevated = Color(0xFF134E4A);
  static const Color colorDarkBorder = Color(0xFF1A5E58);
  static const Color colorDarkTextPrimary = Color(0xFFCCFBF1);
  static const Color colorDarkTextSecondary = Color(0xFF99F6E4);
  static const Color colorDarkTextTertiary = Color(0xFF5EADA7);

  // ─────────────────────────────────────────────
  // 渐变 Tokens
  // ─────────────────────────────────────────────

  /// 品牌渐变：蓝绿 → 蓝紫（左→右）
  static const LinearGradient gradientBrand = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF2DD4BF), Color(0xFF818CF8)],
  );

  /// 品牌渐变（上→下）
  static const LinearGradient gradientBrandVertical = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF2DD4BF), Color(0xFF818CF8)],
  );

  /// 暖感卡片渐变（白→极浅蓝绿）
  static const LinearGradient gradientCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFFFFF), Color(0xFFE6FFFA)],
  );

  /// 英雄区渐变（蓝绿→透明，用于覆盖图片）
  static const LinearGradient gradientHero = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0xCC134E4A)],
  );

  // ─────────────────────────────────────────────
  // 间距 Tokens
  // ─────────────────────────────────────────────

  static const double space2 = 2.0;
  static const double space4 = 4.0;
  static const double space6 = 6.0;
  static const double space8 = 8.0;
  static const double space10 = 10.0;
  static const double space12 = 12.0;
  static const double space16 = 16.0;
  static const double space20 = 20.0;
  static const double space24 = 24.0;
  static const double space32 = 32.0;
  static const double space40 = 40.0;
  static const double space48 = 48.0;
  static const double space56 = 56.0;
  static const double space64 = 64.0;

  // ─────────────────────────────────────────────
  // 圆角 Tokens
  // ─────────────────────────────────────────────

  static const double radiusXS = 4.0;
  static const double radiusSM = 8.0;
  static const double radiusMD = 12.0;
  static const double radiusLG = 16.0;
  static const double radiusXL = 20.0;
  static const double radius2XL = 24.0;
  static const double radiusFull = 999.0;

  // ─────────────────────────────────────────────
  // 阴影 Tokens
  // ─────────────────────────────────────────────

  /// 极细微阴影（卡片默认）
  static const List<BoxShadow> shadowXS = [
    BoxShadow(
      color: Color(0x0A2DD4BF),
      blurRadius: 4,
      offset: Offset(0, 1),
    ),
  ];

  /// 小阴影（悬浮卡片）
  static const List<BoxShadow> shadowSM = [
    BoxShadow(
      color: Color(0x142DD4BF),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  /// 中等阴影（Modal / BottomSheet）
  static const List<BoxShadow> shadowMD = [
    BoxShadow(
      color: Color(0x1E2DD4BF),
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  /// 大阴影（FAB / 重点元素）
  static const List<BoxShadow> shadowLG = [
    BoxShadow(
      color: Color(0x282DD4BF),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  // ─────────────────────────────────────────────
  // 动效 Tokens
  // ─────────────────────────────────────────────

  /// 极快 —— 图标切换、微交互
  static const Duration durationFast = Duration(milliseconds: 100);

  /// 快速 —— 按钮反馈、状态切换
  static const Duration durationNormal = Duration(milliseconds: 200);

  /// 中等 —— 卡片展开、列表项进入
  static const Duration durationMedium = Duration(milliseconds: 300);

  /// 慢 —— 页面转场、底部弹出
  static const Duration durationSlow = Duration(milliseconds: 400);

  /// 标准弹性曲线
  static const Curve curveSpring = Curves.easeOutBack;

  /// 标准进入曲线
  static const Curve curveEnter = Curves.easeOutCubic;

  /// 标准退出曲线
  static const Curve curveExit = Curves.easeInCubic;

  // ─────────────────────────────────────────────
  // 字体尺寸 Tokens
  // ─────────────────────────────────────────────

  static const double fontSizeXS = 11.0;
  static const double fontSizeSM = 13.0;
  static const double fontSizeMD = 15.0;
  static const double fontSizeLG = 17.0;
  static const double fontSizeXL = 20.0;
  static const double fontSize2XL = 24.0;
  static const double fontSize3XL = 30.0;
  static const double fontSize4XL = 36.0;

  // ─────────────────────────────────────────────
  // 图标尺寸
  // ─────────────────────────────────────────────

  static const double iconSM = 16.0;
  static const double iconMD = 20.0;
  static const double iconLG = 24.0;
  static const double iconXL = 32.0;

  // ─────────────────────────────────────────────
  // 高度常量
  // ─────────────────────────────────────────────

  /// 底部导航栏高度
  static const double bottomNavHeight = 64.0;

  /// FAB 突出高度
  static const double fabRaise = 12.0;

  /// AppBar 高度
  static const double appBarHeight = 56.0;

  /// 标准按钮高度
  static const double buttonHeight = 52.0;

  /// 紧凑按钮高度
  static const double buttonHeightSM = 40.0;
}
