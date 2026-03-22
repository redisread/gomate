import 'package:flutter/material.dart';

// ============================================================================
// GoMate Flutter Design System v2.0
// 「有温度的随身徒步助手」设计规范
//
// 设计方向：从暖橙调升级为清新蓝绿调（参考 slock.ai 柔和蓝绿风格）
// 目标：保留户外自然感，强化触控体验，注入情感温度
// ============================================================================

// ============================================================================
// 1. 颜色系统（ColorScheme）
// ============================================================================

/// GoMate 语义化颜色 Token（Light Mode）
class AppColors {
  AppColors._();

  // ── 品牌主色：清新蓝绿（户外自然感）──
  static const Color primary = Color(0xFF2BA0A0); // 蓝绿主色
  static const Color primaryLight = Color(0xFF3DBDBD); // 高亮态
  static const Color primaryDark = Color(0xFF1E7A7A); // 深按压态
  static const Color primaryContainer = Color(0xFFD4F0EF); // 主色容器背景
  static const Color onPrimary = Colors.white;
  static const Color onPrimaryContainer = Color(0xFF003737); // 深绿文字

  // ── 次级色：柔和蓝（探索/信息）──
  static const Color secondary = Color(0xFF4A8FA8); // 柔和蓝
  static const Color secondaryLight = Color(0xFF5BAAC6);
  static const Color secondaryContainer = Color(0xFFD6EBF5); // 次级容器
  static const Color onSecondary = Colors.white;
  static const Color onSecondaryContainer = Color(0xFF00344A);

  // ── 第三色：暖绿（自然/成功感）──
  static const Color tertiary = Color(0xFF5A9E6B); // 暖绿
  static const Color tertiaryContainer = Color(0xFFD8F0DE);
  static const Color onTertiary = Colors.white;
  static const Color onTertiaryContainer = Color(0xFF003912);

  // ── 背景与表面（近白自然纸感）──
  static const Color background = Color(0xFFF5F9F9); // 极浅蓝绿白
  static const Color surface = Color(0xFFFFFFFF); // 卡片白
  static const Color surfaceVariant = Color(0xFFE8F5F5); // 次级面板
  static const Color surfaceElevated = Color(0xFFF0FAFA); // 稍高层面
  static const Color inverseSurface = Color(0xFF1A2B2B);

  // ── 内容色（基于蓝绿调性的中性文字）──
  static const Color onBackground = Color(0xFF1A2B2B); // 深墨绿主文字
  static const Color onSurface = Color(0xFF1A2B2B);
  static const Color onSurfaceVariant = Color(0xFF4A6565); // 次要文字
  static const Color outline = Color(0xFFB8CECE); // 边框
  static const Color outlineVariant = Color(0xFFD4E5E5); // 弱边框

  // ── 情感状态色 ──
  static const Color success = Color(0xFF22A06B); // 成功绿
  static const Color successContainer = Color(0xFFD3F8E3);
  static const Color onSuccess = Colors.white;

  static const Color warning = Color(0xFFF0A020); // 警告橙
  static const Color warningContainer = Color(0xFFFFF0D0);
  static const Color onWarning = Colors.white;

  static const Color error = Color(0xFFD93025); // 错误红
  static const Color errorContainer = Color(0xFFFFDAD6);
  static const Color onError = Colors.white;
  static const Color onErrorContainer = Color(0xFF410002);

  /// 温暖强调色（仅点缀用）
  static const Color warmth = Color(0xFFFF8C42); // 暖橙暗示远足激情
  static const Color warmthContainer = Color(0xFFFFEDD8);
}

/// GoMate 颜色系统（Dark Mode）
class AppColorsDark {
  AppColorsDark._();

  static const Color primary = Color(0xFF4DCFCF); // 蓝绿（深色背景上更亮）
  static const Color primaryLight = Color(0xFF66DADA);
  static const Color primaryDark = Color(0xFF2BA0A0);
  static const Color primaryContainer = Color(0xFF004F4F);
  static const Color onPrimary = Color(0xFF003737);
  static const Color onPrimaryContainer = Color(0xFF9FF2F2);

  static const Color secondary = Color(0xFF7EC4DA);
  static const Color secondaryContainer = Color(0xFF1E4A5E);
  static const Color onSecondary = Color(0xFF00344A);
  static const Color onSecondaryContainer = Color(0xFFC5E6F5);

  static const Color tertiary = Color(0xFF8FCC9F);
  static const Color tertiaryContainer = Color(0xFF1E4A2B);
  static const Color onTertiary = Color(0xFF003912);
  static const Color onTertiaryContainer = Color(0xFFCCEFD4);

  static const Color background = Color(0xFF0E1B1B); // 深墨绿黑
  static const Color surface = Color(0xFF162222); // 卡片深色
  static const Color surfaceVariant = Color(0xFF1E2E2E);
  static const Color surfaceElevated = Color(0xFF1F3333);

  static const Color onBackground = Color(0xFFE2EEEE);
  static const Color onSurface = Color(0xFFE2EEEE);
  static const Color onSurfaceVariant = Color(0xFF8AACAC);
  static const Color outline = Color(0xFF2A4040);
  static const Color outlineVariant = Color(0xFF1F3030);

  static const Color success = Color(0xFF52C48A);
  static const Color warning = Color(0xFFF5B83B);
  static const Color error = Color(0xFFFF897D);
  static const Color warmth = Color(0xFFFFAB70);
}

/// Flutter Material3 ColorScheme 工厂
class AppColorScheme {
  AppColorScheme._();

  /// 亮色 ColorScheme
  static const ColorScheme light = ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    primaryContainer: AppColors.primaryContainer,
    onPrimaryContainer: AppColors.onPrimaryContainer,
    secondary: AppColors.secondary,
    onSecondary: AppColors.onSecondary,
    secondaryContainer: AppColors.secondaryContainer,
    onSecondaryContainer: AppColors.onSecondaryContainer,
    tertiary: AppColors.tertiary,
    onTertiary: AppColors.onTertiary,
    tertiaryContainer: AppColors.tertiaryContainer,
    onTertiaryContainer: AppColors.onTertiaryContainer,
    error: AppColors.error,
    onError: AppColors.onError,
    errorContainer: AppColors.errorContainer,
    onErrorContainer: AppColors.onErrorContainer,
    surface: AppColors.surface,
    onSurface: AppColors.onSurface,
    surfaceContainerHighest: AppColors.surfaceVariant,
    onSurfaceVariant: AppColors.onSurfaceVariant,
    outline: AppColors.outline,
    outlineVariant: AppColors.outlineVariant,
    inverseSurface: AppColors.inverseSurface,
    inversePrimary: Color(0xFF9FF2F2),
    scrim: Color(0xFF000000),
    shadow: Color(0xFF000000),
  );

  /// 暗色 ColorScheme
  static const ColorScheme dark = ColorScheme.dark(
    primary: AppColorsDark.primary,
    onPrimary: AppColorsDark.onPrimary,
    primaryContainer: AppColorsDark.primaryContainer,
    onPrimaryContainer: AppColorsDark.onPrimaryContainer,
    secondary: AppColorsDark.secondary,
    onSecondary: AppColorsDark.onSecondary,
    secondaryContainer: AppColorsDark.secondaryContainer,
    onSecondaryContainer: AppColorsDark.onSecondaryContainer,
    tertiary: AppColorsDark.tertiary,
    onTertiary: AppColorsDark.onTertiary,
    tertiaryContainer: AppColorsDark.tertiaryContainer,
    onTertiaryContainer: AppColorsDark.onTertiaryContainer,
    error: AppColorsDark.error,
    onError: Color(0xFF690001),
    surface: AppColorsDark.surface,
    onSurface: AppColorsDark.onSurface,
    surfaceContainerHighest: AppColorsDark.surfaceVariant,
    onSurfaceVariant: AppColorsDark.onSurfaceVariant,
    outline: AppColorsDark.outline,
    outlineVariant: AppColorsDark.outlineVariant,
    inverseSurface: AppColors.surface,
    inversePrimary: AppColors.primary,
    scrim: Color(0xFF000000),
    shadow: Color(0xFF000000),
  );
}

// ============================================================================
// 2. 渐变系统
// ============================================================================

class AppGradients {
  AppGradients._();

  /// 品牌渐变：蓝绿 → 柔蓝（横向，用于品牌 Logo / Banner）
  static const LinearGradient brand = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [AppColors.primary, AppColors.secondary],
  );

  /// 自然渐变：蓝绿 → 暖绿（表达自然户外）
  static const LinearGradient nature = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primary, AppColors.tertiary],
  );

  /// 温暖渐变：暖橙 → 蓝绿（情感点缀，少量使用）
  static const LinearGradient warmToTeal = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.warmth, AppColors.primary],
  );

  /// 图片遮罩渐变（底部文字遮罩）
  static const LinearGradient imageMask = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0xCC000000)],
    stops: [0.4, 1.0],
  );

  /// 卡片微渐变（增加层次感，与纯白区分）
  static const LinearGradient cardSurface = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFFFFF), Color(0xFFF5FAFA)],
  );
}

// ============================================================================
// 3. 间距系统（8pt Grid）
// ============================================================================

/// 8pt 网格间距常量
/// 所有间距必须来自此类，禁止硬编码任意数值
class AppSpacing {
  AppSpacing._();

  /// 4pt — 超紧凑间距（图标与文字、Badge 内边距）
  static const double xs = 4.0;

  /// 8pt — 基础单元（紧凑布局、列表项内边距）
  static const double sm = 8.0;

  /// 12pt — 中小间距（卡片内元素间距）
  static const double md12 = 12.0;

  /// 16pt — 标准间距（页面水平内边距、段落间距）
  static const double md = 16.0;

  /// 20pt — 中大间距（区块间距）
  static const double lg20 = 20.0;

  /// 24pt — 大间距（Section 间距、卡片内边距）
  static const double lg = 24.0;

  /// 32pt — 超大间距（主要区域分隔）
  static const double xl = 32.0;

  /// 48pt — 极大间距（顶部 Hero 区域留白）
  static const double xxl = 48.0;

  /// 64pt — 特殊用途（空状态图标间距）
  static const double xxxl = 64.0;

  // ── 常用 EdgeInsets 快捷方式 ──

  /// 页面标准水平内边距
  static const EdgeInsets pageHorizontal =
      EdgeInsets.symmetric(horizontal: md);

  /// 页面标准全边距
  static const EdgeInsets pagePadding = EdgeInsets.all(md);

  /// 卡片内边距（舒适）
  static const EdgeInsets cardPadding = EdgeInsets.all(lg);

  /// 卡片内边距（紧凑）
  static const EdgeInsets cardPaddingCompact =
      EdgeInsets.symmetric(horizontal: md, vertical: md12);

  /// 列表项内边距
  static const EdgeInsets listItemPadding =
      EdgeInsets.symmetric(horizontal: md, vertical: md12);

  /// 按钮内边距（标准）
  static const EdgeInsets buttonPadding =
      EdgeInsets.symmetric(horizontal: xl, vertical: md);

  /// 按钮内边距（紧凑）
  static const EdgeInsets buttonPaddingCompact =
      EdgeInsets.symmetric(horizontal: lg, vertical: md12);

  /// 输入框内边距
  static const EdgeInsets inputPadding =
      EdgeInsets.symmetric(horizontal: md, vertical: md);

  /// Chip 内边距
  static const EdgeInsets chipPadding =
      EdgeInsets.symmetric(horizontal: md12, vertical: xs + 2);

  /// 底部安全区额外内边距
  static const EdgeInsets bottomBarPadding =
      EdgeInsets.fromLTRB(md, md12, md, md);
}

// ============================================================================
// 4. 圆角系统
// ============================================================================

/// 圆角常量
/// 与触控目标大小、层次深度对应
class AppRadius {
  AppRadius._();

  /// 2pt — 极小（Tag 角标）
  static const double xxs = 2.0;

  /// 4pt — 超小（Badge、状态指示点）
  static const double xs = 4.0;

  /// 8pt — 小（输入框、小按钮、Chip）
  static const double sm = 8.0;

  /// 12pt — 中（卡片、列表项、普通按钮）
  static const double md = 12.0;

  /// 16pt — 大（主要卡片、标准弹窗）
  static const double lg = 16.0;

  /// 20pt — 超大（封面卡片、Hero 图片容器）
  static const double xl = 20.0;

  /// 24pt — 极大（底部弹窗顶角、大圆角卡片）
  static const double xxl = 24.0;

  /// 全圆（Pill 按钮、头像、小圆形 FAB）
  static const double full = 999.0;

  // ── 预定义 BorderRadius ──

  /// 输入框圆角
  static final BorderRadius input = BorderRadius.circular(sm);

  /// 普通按钮圆角
  static final BorderRadius button = BorderRadius.circular(md);

  /// Pill 形按钮（胶囊形）
  static final BorderRadius pill = BorderRadius.circular(full);

  /// 卡片圆角（标准）
  static final BorderRadius card = BorderRadius.circular(lg);

  /// 大卡片圆角（封面图）
  static final BorderRadius cardLarge = BorderRadius.circular(xl);

  /// 底部弹窗顶角
  static const BorderRadius bottomSheet = BorderRadius.vertical(
    top: Radius.circular(xxl),
  );

  /// 对话框圆角
  static final BorderRadius dialog = BorderRadius.circular(xxl);

  /// 头像/圆形容器
  static const BorderRadius circle = BorderRadius.all(Radius.circular(full));

  /// Chip 圆角
  static final BorderRadius chip = BorderRadius.circular(sm);
}

// ============================================================================
// 5. 阴影与高度系统
// ============================================================================

/// 阴影与高度常量
/// 避免 Material elevation 的灰色表面渲染，改用自定义阴影
class AppShadow {
  AppShadow._();

  /// 无阴影（扁平化层）
  static const List<BoxShadow> none = [];

  /// 极细阴影（卡片分层，light mode 专用）
  static const List<BoxShadow> subtle = [
    BoxShadow(
      color: Color(0x0A2BA0A0), // 主色调阴影
      blurRadius: 8,
      spreadRadius: 0,
      offset: Offset(0, 2),
    ),
  ];

  /// 标准卡片阴影
  static const List<BoxShadow> card = [
    BoxShadow(
      color: Color(0x142BA0A0),
      blurRadius: 16,
      spreadRadius: 0,
      offset: Offset(0, 4),
    ),
  ];

  /// 浮层阴影（底部弹窗、Dropdown）
  static const List<BoxShadow> float = [
    BoxShadow(
      color: Color(0x20000000),
      blurRadius: 24,
      spreadRadius: 0,
      offset: Offset(0, 8),
    ),
    BoxShadow(
      color: Color(0x0A2BA0A0),
      blurRadius: 8,
      spreadRadius: 0,
      offset: Offset(0, 2),
    ),
  ];

  /// FAB 阴影（悬浮操作按钮）
  static const List<BoxShadow> fab = [
    BoxShadow(
      color: Color(0x3D2BA0A0), // 主色半透明阴影
      blurRadius: 20,
      spreadRadius: 0,
      offset: Offset(0, 6),
    ),
  ];

  /// 强调阴影（主 CTA 按钮按压态）
  static const List<BoxShadow> cta = [
    BoxShadow(
      color: Color(0x4D2BA0A0),
      blurRadius: 24,
      spreadRadius: 0,
      offset: Offset(0, 8),
    ),
  ];

  /// 图片遮罩阴影（头像描边感）
  static const List<BoxShadow> avatar = [
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 8,
      spreadRadius: 2,
      offset: Offset(0, 2),
    ),
  ];
}

// ============================================================================
// 6. 动效系统
// ============================================================================

/// 动画时长与曲线规范
/// 原则：出现慢、消失快、交互即时
class AppMotion {
  AppMotion._();

  // ── 时长 ──

  /// 即时反馈（按钮按压、Tab 切换）：100ms
  static const Duration instant = Duration(milliseconds: 100);

  /// 快速过渡（图标变换、状态色切换）：200ms
  static const Duration fast = Duration(milliseconds: 200);

  /// 标准动画（卡片展开、模态弹出）：300ms
  static const Duration normal = Duration(milliseconds: 300);

  /// 缓慢过渡（页面进入、复杂 Hero 动画）：400ms
  static const Duration slow = Duration(milliseconds: 400);

  /// 渐变消失（Toast 消失、骨架屏过渡）：500ms
  static const Duration fade = Duration(milliseconds: 500);

  // ── 曲线 ──

  /// 标准曲线（大多数 UI 动画，Material 默认）
  static const Curve standard = Curves.easeInOut;

  /// 强调曲线（弹簧感进入，给人"落地"的扎实感）
  static const Curve emphasized = Curves.easeOutCubic;

  /// 减速曲线（元素进入屏幕：从快到慢）
  static const Curve decelerate = Curves.easeOutQuart;

  /// 加速曲线（元素离开屏幕：从慢到快）
  static const Curve accelerate = Curves.easeInCubic;

  /// 弹性曲线（FAB、底部弹窗弹入，增加活泼感）
  static const Curve spring = Curves.elasticOut;

  /// 线性（骨架屏 shimmer 专用）
  static const Curve linear = Curves.linear;

  // ── 使用场景说明 ──
  // instant + standard   → 按钮按压涟漪、Tab 指示器滑动
  // fast + emphasized    → 图标 switch（收藏/取消）、Chip 选中态
  // normal + decelerate  → 页面路由进入、模态底部弹窗滑入
  // normal + accelerate  → 模态关闭、页面退出
  // slow + decelerate    → Hero 图片展开、详情页进入
  // fade + linear        → 骨架屏 shimmer 循环动画

  // ── 页面路由过渡配置 ──

  /// iOS 风格（右滑返回，原生感）
  /// 在 app.dart 的 PageTransitionsTheme 中配置：
  /// TargetPlatform.iOS: CupertinoPageTransitionsBuilder()

  /// Android 风格（Material 3 放缩过渡）
  /// TargetPlatform.android: ZoomPageTransitionsBuilder()
}

// ============================================================================
// 7. Typography（基于 Flutter TextTheme）
// ============================================================================

/// 字体规范
/// 字体推荐：
///   中文标题 → Noto Sans SC（Google Fonts）
///   中文正文 → Noto Sans SC Regular
///   数字/时间 → 系统字体（tabular digits 对齐）
///
/// 字体大小基准：14pt（正文），行高系数 1.5
class AppTypography {
  AppTypography._();

  // ── 字重常量 ──
  static const FontWeight thin = FontWeight.w100;
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
  static const FontWeight extraBold = FontWeight.w800;

  // ── Display（大屏展示型文字，空状态/欢迎页） ──
  static const TextStyle displayLarge = TextStyle(
    fontSize: 57,
    fontWeight: bold,
    letterSpacing: -0.25,
    height: 1.12,
    color: AppColors.onBackground,
  );
  static const TextStyle displayMedium = TextStyle(
    fontSize: 45,
    fontWeight: bold,
    letterSpacing: 0,
    height: 1.16,
    color: AppColors.onBackground,
  );
  static const TextStyle displaySmall = TextStyle(
    fontSize: 36,
    fontWeight: semiBold,
    letterSpacing: 0,
    height: 1.22,
    color: AppColors.onBackground,
  );

  // ── Headline（页面标题、卡片标题） ──
  static const TextStyle headlineLarge = TextStyle(
    fontSize: 32,
    fontWeight: bold,
    letterSpacing: -0.5,
    height: 1.25,
    color: AppColors.onBackground,
  );
  static const TextStyle headlineMedium = TextStyle(
    fontSize: 28,
    fontWeight: semiBold,
    letterSpacing: -0.25,
    height: 1.29,
    color: AppColors.onBackground,
  );
  static const TextStyle headlineSmall = TextStyle(
    fontSize: 24,
    fontWeight: semiBold,
    letterSpacing: 0,
    height: 1.33,
    color: AppColors.onBackground,
  );

  // ── Title（区块标题、导航标题、列表标题） ──
  static const TextStyle titleLarge = TextStyle(
    fontSize: 22,
    fontWeight: semiBold,
    letterSpacing: 0,
    height: 1.27,
    color: AppColors.onBackground,
  );
  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: medium,
    letterSpacing: 0.15,
    height: 1.50,
    color: AppColors.onBackground,
  );
  static const TextStyle titleSmall = TextStyle(
    fontSize: 14,
    fontWeight: medium,
    letterSpacing: 0.1,
    height: 1.43,
    color: AppColors.onSurfaceVariant,
  );

  // ── Body（正文内容） ──
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: regular,
    letterSpacing: 0.5,
    height: 1.75, // 宽松行高，提升户外场景可读性
    color: AppColors.onBackground,
  );
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: regular,
    letterSpacing: 0.25,
    height: 1.60,
    color: AppColors.onSurfaceVariant,
  );
  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: regular,
    letterSpacing: 0.4,
    height: 1.33,
    color: AppColors.onSurfaceVariant,
  );

  // ── Label（按钮标签、Chip、辅助说明） ──
  static const TextStyle labelLarge = TextStyle(
    fontSize: 14,
    fontWeight: medium,
    letterSpacing: 0.1,
    height: 1.43,
    color: AppColors.onBackground,
  );
  static const TextStyle labelMedium = TextStyle(
    fontSize: 12,
    fontWeight: medium,
    letterSpacing: 0.5,
    height: 1.33,
    color: AppColors.onSurfaceVariant,
  );
  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: medium,
    letterSpacing: 0.5,
    height: 1.45,
    color: AppColors.onSurfaceVariant,
  );

  // ── 特殊样式（GoMate 专用） ──

  /// AppBar 标题
  static const TextStyle appBarTitle = TextStyle(
    fontSize: 17,
    fontWeight: semiBold,
    letterSpacing: 0,
    height: 1.0,
    color: AppColors.onBackground,
  );

  /// 数字/统计数据（等宽，对齐感）
  static const TextStyle numericLarge = TextStyle(
    fontSize: 32,
    fontWeight: bold,
    letterSpacing: -1.0,
    height: 1.0,
    fontFeatures: [FontFeature.tabularFigures()],
    color: AppColors.primary,
  );
  static const TextStyle numericMedium = TextStyle(
    fontSize: 20,
    fontWeight: semiBold,
    letterSpacing: -0.5,
    height: 1.0,
    fontFeatures: [FontFeature.tabularFigures()],
    color: AppColors.onBackground,
  );

  /// 状态标签文字（Chip/Badge 内文字）
  static const TextStyle statusLabel = TextStyle(
    fontSize: 11,
    fontWeight: semiBold,
    letterSpacing: 0.3,
    height: 1.0,
  );

  /// 品牌 Logo 文字
  static const TextStyle brandLogo = TextStyle(
    fontSize: 22,
    fontWeight: bold,
    letterSpacing: -0.5,
    height: 1.0,
  );

  // ── Flutter TextTheme 完整映射 ──
  static const TextTheme textTheme = TextTheme(
    displayLarge: displayLarge,
    displayMedium: displayMedium,
    displaySmall: displaySmall,
    headlineLarge: headlineLarge,
    headlineMedium: headlineMedium,
    headlineSmall: headlineSmall,
    titleLarge: titleLarge,
    titleMedium: titleMedium,
    titleSmall: titleSmall,
    bodyLarge: bodyLarge,
    bodyMedium: bodyMedium,
    bodySmall: bodySmall,
    labelLarge: labelLarge,
    labelMedium: labelMedium,
    labelSmall: labelSmall,
  );
}

// ============================================================================
// 8. 触控目标规范
// ============================================================================

/// 触控目标最小尺寸（遵循 WCAG 2.5.5 & Apple HIG 44pt 规范）
class AppTouchTarget {
  AppTouchTarget._();

  /// 最小触控目标高度（按钮、列表项）
  static const double minHeight = 44.0;

  /// 标准按钮高度
  static const double buttonHeight = 52.0;

  /// 紧凑按钮高度（次级操作）
  static const double buttonHeightCompact = 44.0;

  /// 大按钮高度（主要 CTA）
  static const double buttonHeightLarge = 56.0;

  /// 输入框高度
  static const double inputHeight = 52.0;

  /// 图标按钮最小区域
  static const double iconButtonSize = 44.0;

  /// BottomNavigationBar 高度
  static const double bottomNavHeight = 60.0;

  /// TabBar 高度
  static const double tabBarHeight = 48.0;
}

// ============================================================================
// 9. 组件配置（Design Token → Widget 映射）
// ============================================================================

/// 卡片统一配置
class AppCardConfig {
  AppCardConfig._();

  static const double borderWidth = 1.0;
  static const Color borderColor = AppColors.outlineVariant;
  static const double elevation = 0.0; // 扁平化，用 AppShadow 替代
}

/// 按钮分级配置
class AppButtonConfig {
  AppButtonConfig._();

  // ── 主按钮（Filled）：主要操作、底部 CTA ──
  static final ButtonStyle filled = ElevatedButton.styleFrom(
    backgroundColor: AppColors.primary,
    foregroundColor: AppColors.onPrimary,
    disabledBackgroundColor: AppColors.primaryContainer,
    disabledForegroundColor: AppColors.onSurfaceVariant,
    elevation: 0,
    shadowColor: Colors.transparent,
    minimumSize: const Size(double.infinity, AppTouchTarget.buttonHeight),
    padding: AppSpacing.buttonPadding,
    shape: RoundedRectangleBorder(borderRadius: AppRadius.button),
    textStyle: AppTypography.labelLarge.copyWith(fontWeight: FontWeight.w600),
  );

  // ── 次级按钮（Outlined）：次要操作 ──
  static final ButtonStyle outlined = OutlinedButton.styleFrom(
    foregroundColor: AppColors.primary,
    side: const BorderSide(color: AppColors.primary, width: 1.5),
    minimumSize: const Size(double.infinity, AppTouchTarget.buttonHeight),
    padding: AppSpacing.buttonPadding,
    shape: RoundedRectangleBorder(borderRadius: AppRadius.button),
    textStyle: AppTypography.labelLarge.copyWith(fontWeight: FontWeight.w600),
  );

  // ── 幽灵按钮（Text）：辅助操作 ──
  static final ButtonStyle ghost = TextButton.styleFrom(
    foregroundColor: AppColors.primary,
    minimumSize: const Size(0, AppTouchTarget.buttonHeightCompact),
    padding: AppSpacing.buttonPaddingCompact,
    shape: RoundedRectangleBorder(borderRadius: AppRadius.button),
    textStyle: AppTypography.labelLarge,
  );

  // ── 危险按钮（破坏性操作）──
  static final ButtonStyle danger = ElevatedButton.styleFrom(
    backgroundColor: AppColors.error,
    foregroundColor: AppColors.onError,
    elevation: 0,
    minimumSize: const Size(double.infinity, AppTouchTarget.buttonHeight),
    padding: AppSpacing.buttonPadding,
    shape: RoundedRectangleBorder(borderRadius: AppRadius.button),
    textStyle: AppTypography.labelLarge.copyWith(fontWeight: FontWeight.w600),
  );
}

// ============================================================================
// 10. 主题组装（完整 ThemeData）
// ============================================================================

class AppThemeV2 {
  AppThemeV2._();

  /// 圆角常量（向后兼容）
  static const double radiusSmall = AppRadius.sm;
  static const double radiusMedium = AppRadius.md;
  static const double radiusLarge = AppRadius.lg;
  static const double radiusXLarge = AppRadius.xl;

  /// 亮色主题（完整配置）
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: AppColorScheme.light,
        textTheme: AppTypography.textTheme,
        scaffoldBackgroundColor: AppColors.background,
        cardColor: AppColors.surface,
        dividerColor: AppColors.outlineVariant,

        // ── AppBar ──
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.background,
          foregroundColor: AppColors.onBackground,
          elevation: 0,
          centerTitle: true,
          surfaceTintColor: Colors.transparent,
          shadowColor: Colors.transparent,
          titleTextStyle: AppTypography.appBarTitle,
          iconTheme: const IconThemeData(
            color: AppColors.onSurfaceVariant,
            size: 24,
          ),
          actionsIconTheme: const IconThemeData(
            color: AppColors.onSurfaceVariant,
            size: 24,
          ),
        ),

        // ── 卡片（扁平化 + 自定义阴影） ──
        cardTheme: CardThemeData(
          color: AppColors.surface,
          elevation: 0,
          shadowColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.card,
            side: const BorderSide(
              color: AppColors.outlineVariant,
              width: AppCardConfig.borderWidth,
            ),
          ),
          margin: EdgeInsets.zero,
        ),

        // ── ElevatedButton → 主按钮 ──
        elevatedButtonTheme:
            ElevatedButtonThemeData(style: AppButtonConfig.filled),

        // ── OutlinedButton → 次级按钮 ──
        outlinedButtonTheme:
            OutlinedButtonThemeData(style: AppButtonConfig.outlined),

        // ── TextButton → 幽灵按钮 ──
        textButtonTheme: TextButtonThemeData(style: AppButtonConfig.ghost),

        // ── 输入框 ──
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface,
          hintStyle: AppTypography.bodyMedium.copyWith(
            color: AppColors.onSurfaceVariant.withValues(alpha: 0.6),
          ),
          labelStyle: AppTypography.labelMedium.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
          floatingLabelStyle: AppTypography.labelMedium.copyWith(
            color: AppColors.primary,
          ),
          border: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: const BorderSide(
              color: AppColors.outline,
              width: 1,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: const BorderSide(
              color: AppColors.outline,
              width: 1,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: const BorderSide(
              color: AppColors.primary,
              width: 2.0,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: const BorderSide(
              color: AppColors.error,
              width: 1,
            ),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: const BorderSide(
              color: AppColors.error,
              width: 2.0,
            ),
          ),
          contentPadding: AppSpacing.inputPadding,
          isDense: false,
          constraints: const BoxConstraints(minHeight: AppTouchTarget.inputHeight),
        ),

        // ── 底部导航栏 ──
        bottomNavigationBarTheme: BottomNavigationBarThemeData(
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.onSurfaceVariant,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: AppTypography.labelSmall.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: AppTypography.labelSmall.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
          showSelectedLabels: true,
          showUnselectedLabels: true,
        ),

        // ── Chip ──
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.surfaceVariant,
          selectedColor: AppColors.primaryContainer,
          labelStyle: AppTypography.labelMedium,
          side: const BorderSide(color: AppColors.outlineVariant, width: 1),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.chip),
          padding: AppSpacing.chipPadding,
          iconTheme: const IconThemeData(
            color: AppColors.onSurfaceVariant,
            size: 16,
          ),
        ),

        // ── Divider ──
        dividerTheme: const DividerThemeData(
          color: AppColors.outlineVariant,
          thickness: 1,
          space: 1,
        ),

        // ── Icon ──
        iconTheme: const IconThemeData(
          color: AppColors.onSurfaceVariant,
          size: 24,
        ),

        // ── ProgressIndicator ──
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppColors.primary,
          linearTrackColor: AppColors.primaryContainer,
          circularTrackColor: AppColors.primaryContainer,
        ),

        // ── SnackBar ──
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.inverseSurface,
          contentTextStyle: AppTypography.bodyMedium.copyWith(
            color: AppColors.surface,
          ),
          actionTextColor: AppColors.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          behavior: SnackBarBehavior.floating,
          elevation: 4,
          insetPadding: const EdgeInsets.all(AppSpacing.md),
        ),

        // ── BottomSheet ──
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: AppColors.surface,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.bottomSheet),
          showDragHandle: true,
          dragHandleColor: AppColors.outline,
          dragHandleSize: Size(36, 4),
          elevation: 0,
          modalElevation: 0,
        ),

        // ── Dialog ──
        dialogTheme: DialogThemeData(
          backgroundColor: AppColors.surface,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.dialog),
          elevation: 0,
          titleTextStyle: AppTypography.titleLarge,
          contentTextStyle: AppTypography.bodyMedium,
        ),

        // ── TabBar ──
        tabBarTheme: TabBarThemeData(
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.onSurfaceVariant,
          indicatorColor: AppColors.primary,
          indicatorSize: TabBarIndicatorSize.label,
          dividerColor: AppColors.outlineVariant,
          labelStyle: AppTypography.titleSmall.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: AppTypography.titleSmall,
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.hovered)) {
              return AppColors.primaryContainer.withValues(alpha: 0.5);
            }
            return Colors.transparent;
          }),
        ),

        // ── ListTile ──
        listTileTheme: const ListTileThemeData(
          textColor: AppColors.onBackground,
          iconColor: AppColors.onSurfaceVariant,
          tileColor: Colors.transparent,
          contentPadding:
              EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 0),
          minVerticalPadding: AppSpacing.md12,
          style: ListTileStyle.list,
        ),

        // ── Switch ──
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.surface;
            }
            return AppColors.onSurfaceVariant;
          }),
          trackColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.primary;
            }
            return AppColors.surfaceVariant;
          }),
          trackOutlineColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return Colors.transparent;
            }
            return AppColors.outline;
          }),
        ),

        // ── FloatingActionButton ──
        floatingActionButtonTheme: FloatingActionButtonThemeData(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.onPrimary,
          elevation: 0,
          focusElevation: 0,
          hoverElevation: 0,
          highlightElevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
        ),

        // ── 页面过渡动画 ──
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
            TargetPlatform.android: ZoomPageTransitionsBuilder(),
          },
        ),
      );

  /// 暗色主题
  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: AppColorScheme.dark,
        textTheme: AppTypography.textTheme.apply(
          bodyColor: AppColorsDark.onBackground,
          displayColor: AppColorsDark.onBackground,
        ),
        scaffoldBackgroundColor: AppColorsDark.background,
        cardColor: AppColorsDark.surface,
        dividerColor: AppColorsDark.outlineVariant,
        appBarTheme: AppBarTheme(
          backgroundColor: AppColorsDark.background,
          foregroundColor: AppColorsDark.onBackground,
          elevation: 0,
          centerTitle: true,
          surfaceTintColor: Colors.transparent,
          shadowColor: Colors.transparent,
          titleTextStyle: AppTypography.appBarTitle.copyWith(
            color: AppColorsDark.onBackground,
          ),
          iconTheme: IconThemeData(
            color: AppColorsDark.onSurfaceVariant,
            size: 24,
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColorsDark.surface,
          elevation: 0,
          shadowColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.card,
            side: BorderSide(
              color: AppColorsDark.outlineVariant,
              width: 1,
            ),
          ),
          margin: EdgeInsets.zero,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: AppButtonConfig.filled,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColorsDark.surfaceVariant,
          hintStyle: AppTypography.bodyMedium.copyWith(
            color: AppColorsDark.onSurfaceVariant.withValues(alpha: 0.6),
          ),
          border: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: BorderSide(color: AppColorsDark.outline, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: BorderSide(color: AppColorsDark.outline, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: AppRadius.input,
            borderSide: BorderSide(color: AppColorsDark.primary, width: 2.0),
          ),
          contentPadding: AppSpacing.inputPadding,
          constraints:
              const BoxConstraints(minHeight: AppTouchTarget.inputHeight),
        ),
        bottomNavigationBarTheme: BottomNavigationBarThemeData(
          backgroundColor: AppColorsDark.surface,
          selectedItemColor: AppColorsDark.primary,
          unselectedItemColor: AppColorsDark.onSurfaceVariant,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
        ),
        progressIndicatorTheme: ProgressIndicatorThemeData(
          color: AppColorsDark.primary,
        ),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
            TargetPlatform.android: ZoomPageTransitionsBuilder(),
          },
        ),
      );
}

// ============================================================================
// 11. 设计原则宣言（5条核心原则）
// ============================================================================

/// GoMate 设计原则
///
/// 1. 「自然优先」 Natural First
///    色彩取材于深圳山野：蓝绿（海湾水色）、暖绿（山林）、暖橙（日落余晖）。
///    每一个颜色都应能唤起一次徒步的记忆。
///    Flutter 实现：使用 AppColors 中经过户外场景校准的色值，
///    避免使用纯蓝/纯绿等工业感强的颜色。
///
/// 2. 「触控即信任」 Touch is Trust
///    每一个可点击区域最小 44pt × 44pt，让带着手套的徒步者也能轻松操作。
///    按钮按下必须有即时视觉反馈（涟漪 + 轻微缩放）。
///    Flutter 实现：所有按钮高度 ≥ AppTouchTarget.minHeight (44pt)，
///    使用 InkWell/InkResponse 确保涟漪效果，主按钮加 AnimatedScale。
///
/// 3. 「信息呼吸」 Breathing Layout
///    信息之间保持足够的间距，让用户在户外强光环境下也能快速扫读。
///    卡片不堆砌，内容有层次，重要信息用留白突出。
///    Flutter 实现：严格使用 AppSpacing 8pt Grid，
///    bodyLarge 行高 1.75，段落间距不少于 AppSpacing.lg。
///
/// 4. 「即时情绪反馈」 Instant Emotional Echo
///    用户的每个操作都要得到情感回应：收藏时心跳、组队成功时庆祝动效、
///    招募中状态用暖色激励、已满员用温和的灰降调。
///    Flutter 实现：使用 AppMotion 配置动画时长与曲线，
///    状态变化用 AnimatedContainer + AnimatedSwitcher 而非 setState 直接切换。
///
/// 5. 「单手操控」 One-Hand Reachability
///    核心操作（加入队伍、收藏、创建）永远在拇指可达区域（屏幕下半部分）。
///    频繁操作放底部，信息展示在上。
///    Flutter 实现：主 CTA 按钮固定在 bottomNavigationBar 区域，
///    使用 SafeArea 避免刘海/Home Indicator 遮挡，
///    列表滑动触发的 FAB 始终悬浮在右下角 Offset(0, -16)。
