import 'package:flutter/material.dart';

// ============================================================
// GoMate Design Tokens
// 视觉语言：「有温度的随身户外助手」
// 参考方向：柔和蓝绿调 + 自然质感（参考 slock.ai）
// 适配 Material 3 + Flutter 渲染特性
// ============================================================

/// 全量 Design Tokens —— 颜色、字体、间距、圆角、阴影
abstract class AppTokens {
  AppTokens._();

  // ----------------------------------------------------------
  // COLORS · 品牌主色（柔和蓝绿 · Teal Family）
  // ----------------------------------------------------------

  /// 主品牌色：清新蓝绿
  static const Color brandPrimary = Color(0xFF2EC4B6);

  /// 主品牌深色（按压态 / 文字用）
  static const Color brandPrimaryDark = Color(0xFF1A9E92);

  /// 主品牌浅色（容器背景 / Chip 背景）
  static const Color brandPrimaryLight = Color(0xFFD6F5F2);

  /// 辅助强调色：温暖珊瑚（点缀用）
  static const Color brandAccent = Color(0xFFFF6B6B);

  /// 辅助强调色浅版（Tag 背景等）
  static const Color brandAccentLight = Color(0xFFFFEEEE);

  /// 第三品牌色：自然苔绿（难度标签等）
  static const Color brandNature = Color(0xFF52C41A);

  /// 第三品牌色浅版
  static const Color brandNatureLight = Color(0xFFEAF7E0);

  // ----------------------------------------------------------
  // COLORS · 背景层级
  // ----------------------------------------------------------

  /// 应用主背景（极浅灰白，干净不刺眼）
  static const Color bgBase = Color(0xFFF7F9FC);

  /// 卡片 / Surface 背景
  static const Color bgSurface = Color(0xFFFFFFFF);

  /// 稍深 Surface（输入框填充 / 列表项 hover）
  static const Color bgSurfaceElevated = Color(0xFFF0F4F8);

  /// 分隔线 / 细边框底色
  static const Color bgDivider = Color(0xFFE8EDF3);

  // ----------------------------------------------------------
  // COLORS · 文字层级
  // ----------------------------------------------------------

  /// 主文字（标题 / 重要内容）
  static const Color textPrimary = Color(0xFF1A2332);

  /// 次要文字（说明 / 副标题）
  static const Color textSecondary = Color(0xFF5A6A7A);

  /// 弱文字（占位符 / 时间戳 / 元数据）
  static const Color textTertiary = Color(0xFF9AAAB8);

  /// 禁用文字
  static const Color textDisabled = Color(0xFFC5D0DA);

  /// 反色文字（用于深色背景上）
  static const Color textInverse = Color(0xFFFFFFFF);

  // ----------------------------------------------------------
  // COLORS · 边框
  // ----------------------------------------------------------

  /// 默认边框（卡片 / 输入框）
  static const Color borderDefault = Color(0xFFE2EAF0);

  /// 强边框（focus 态 / 分割线）
  static const Color borderStrong = Color(0xFFBDCCDA);

  /// 品牌边框（选中态）
  static const Color borderBrand = Color(0xFF2EC4B6);

  // ----------------------------------------------------------
  // COLORS · 语义色
  // ----------------------------------------------------------

  /// 成功
  static const Color semanticSuccess = Color(0xFF52C41A);

  /// 警告
  static const Color semanticWarning = Color(0xFFFAAD14);

  /// 错误
  static const Color semanticError = Color(0xFFFF4D4F);

  /// 信息
  static const Color semanticInfo = Color(0xFF1677FF);

  // ----------------------------------------------------------
  // COLORS · 状态色（队伍状态对应）
  // ----------------------------------------------------------

  /// 招募中（蓝绿）
  static const Color statusRecruiting = Color(0xFF2EC4B6);
  static const Color statusRecruitingBg = Color(0xFFD6F5F2);

  /// 已满（橙色）
  static const Color statusFull = Color(0xFFFA8C16);
  static const Color statusFullBg = Color(0xFFFFF3E0);

  /// 已组建（蓝色）
  static const Color statusFormed = Color(0xFF1677FF);
  static const Color statusFormedBg = Color(0xFFE6F0FF);

  /// 已完成（灰色）
  static const Color statusCompleted = Color(0xFF8C9BAB);
  static const Color statusCompletedBg = Color(0xFFF0F4F8);

  /// 已取消（红色）
  static const Color statusCancelled = Color(0xFFFF4D4F);
  static const Color statusCancelledBg = Color(0xFFFFEEEE);

  // ----------------------------------------------------------
  // COLORS · 难度色（路线 / 地点难度）
  // ----------------------------------------------------------

  /// 简单
  static const Color difficultyEasy = Color(0xFF52C41A);
  static const Color difficultyEasyBg = Color(0xFFEAF7E0);

  /// 普通
  static const Color difficultyModerate = Color(0xFF1677FF);
  static const Color difficultyModerateBg = Color(0xFFE6F0FF);

  /// 困难
  static const Color difficultyHard = Color(0xFFFA8C16);
  static const Color difficultyHardBg = Color(0xFFFFF3E0);

  /// 专家
  static const Color difficultyExpert = Color(0xFFFF4D4F);
  static const Color difficultyExpertBg = Color(0xFFFFEEEE);

  // ----------------------------------------------------------
  // TYPOGRAPHY · 字体大小
  // ----------------------------------------------------------

  /// 超小（角标 / 角注）
  static const double fontSizeXS = 10.0;

  /// 小（标签 / 辅助文字）
  static const double fontSizeS = 12.0;

  /// 基础（正文）
  static const double fontSizeBase = 14.0;

  /// 中（副标题 / 强调正文）
  static const double fontSizeM = 15.0;

  /// 大（小标题）
  static const double fontSizeL = 16.0;

  /// 加大（章节标题）
  static const double fontSizeXL = 18.0;

  /// 超大（页面主标题）
  static const double fontSizeXXL = 22.0;

  /// 展示级（Banner / Hero）
  static const double fontSizeDisplay = 28.0;

  // ----------------------------------------------------------
  // TYPOGRAPHY · 字重
  // ----------------------------------------------------------

  static const FontWeight weightRegular = FontWeight.w400;
  static const FontWeight weightMedium = FontWeight.w500;
  static const FontWeight weightSemiBold = FontWeight.w600;
  static const FontWeight weightBold = FontWeight.w700;

  // ----------------------------------------------------------
  // TYPOGRAPHY · 行高（乘数）
  // ----------------------------------------------------------

  static const double lineHeightTight = 1.2;
  static const double lineHeightNormal = 1.5;
  static const double lineHeightRelaxed = 1.75;

  // ----------------------------------------------------------
  // SPACING · 间距系统（4pt 基准）
  // ----------------------------------------------------------

  static const double space1 = 4.0;
  static const double space2 = 8.0;
  static const double space3 = 12.0;
  static const double space4 = 16.0;
  static const double space5 = 20.0;
  static const double space6 = 24.0;
  static const double space8 = 32.0;
  static const double space10 = 40.0;
  static const double space12 = 48.0;
  static const double space16 = 64.0;

  // 语义化别名
  static const double paddingPageH = space4; // 页面水平内边距 16
  static const double paddingPageV = space4; // 页面垂直内边距 16
  static const double paddingCard = space4; // 卡片内边距 16
  static const double gapSection = space6; // 章节间距 24
  static const double gapCard = space3; // 卡片列表间距 12
  static const double gapItem = space2; // 列表项内部间距 8

  // ----------------------------------------------------------
  // BORDER RADIUS · 圆角系统
  // ----------------------------------------------------------

  /// 极小（Tag / Badge）
  static const double radiusXS = 4.0;

  /// 小（输入框 / 按钮）
  static const double radiusS = 8.0;

  /// 中（卡片标准）
  static const double radiusM = 12.0;

  /// 大（底部 Sheet / 对话框）
  static const double radiusL = 16.0;

  /// 超大（大卡片 / 图片容器）
  static const double radiusXL = 20.0;

  /// 胶囊（Chip / 全圆按钮）
  static const double radiusFull = 100.0;

  // ----------------------------------------------------------
  // ELEVATION · 阴影系统
  // ----------------------------------------------------------

  /// 无阴影（扁平风格默认）
  static const List<BoxShadow> shadowNone = [];

  /// 微弱阴影（卡片悬浮态）
  static const List<BoxShadow> shadowXS = [
    BoxShadow(
      color: Color(0x0A1A2332),
      blurRadius: 4,
      offset: Offset(0, 1),
    ),
  ];

  /// 小阴影（标准卡片）
  static const List<BoxShadow> shadowS = [
    BoxShadow(
      color: Color(0x121A2332),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  /// 中阴影（浮动按钮 / Dropdown）
  static const List<BoxShadow> shadowM = [
    BoxShadow(
      color: Color(0x1A1A2332),
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  /// 大阴影（底部 Sheet / Modal）
  static const List<BoxShadow> shadowL = [
    BoxShadow(
      color: Color(0x221A2332),
      blurRadius: 32,
      offset: Offset(0, 8),
    ),
  ];

  // ----------------------------------------------------------
  // GRADIENTS · 渐变系统
  // ----------------------------------------------------------

  /// 品牌主渐变（蓝绿 → 深蓝绿）
  static const LinearGradient gradientBrand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF2EC4B6), Color(0xFF1A8E8A)],
  );

  /// 品牌强调渐变（蓝绿 → 珊瑚）
  static const LinearGradient gradientBrandAccent = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF2EC4B6), Color(0xFFFF6B6B)],
  );

  /// 卡片背景渐变（白 → 极浅蓝绿）
  static const LinearGradient gradientCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFFFFF), Color(0xFFF0F9F8)],
  );

  /// 图片遮罩渐变（透明 → 深黑，用于图片卡片底部文字）
  static const LinearGradient gradientImageOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x00000000), Color(0xB3000000)],
  );

  /// 首页 Hero 区背景渐变（浅蓝绿 → 白）
  static const LinearGradient gradientHero = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFE8F9F8), Color(0xFFF7F9FC)],
  );

  // ----------------------------------------------------------
  // ANIMATION · 动画时长
  // ----------------------------------------------------------

  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 250);
  static const Duration durationMedium = Duration(milliseconds: 300);
  static const Duration durationSlow = Duration(milliseconds: 400);

  // ----------------------------------------------------------
  // ANIMATION · 缓动曲线
  // ----------------------------------------------------------

  /// 进入动效曲线（加速后减速，有弹性感）
  static const Curve curveEnter = Curves.easeOutCubic;

  /// 退出动效曲线（快速消失）
  static const Curve curveExit = Curves.easeInCubic;

  /// 弹性进入曲线（底部弹出类页面）
  static const Curve curveSpring = Curves.easeOutQuint;

  // ----------------------------------------------------------
  // SIZE · 固定尺寸常量
  // ----------------------------------------------------------

  /// BottomNavigationBar 高度
  static const double navBarHeight = 64.0;

  /// AppBar 高度
  static const double appBarHeight = 56.0;

  /// 头像尺寸
  static const double avatarXS = 24.0;
  static const double avatarS = 32.0;
  static const double avatarM = 44.0;
  static const double avatarL = 64.0;
  static const double avatarXL = 96.0;

  /// 图标尺寸
  static const double iconXS = 14.0;
  static const double iconS = 16.0;
  static const double iconM = 20.0;
  static const double iconL = 24.0;
  static const double iconXL = 32.0;

  /// 按钮高度
  static const double btnHeightS = 36.0;
  static const double btnHeightM = 44.0;
  static const double btnHeightL = 52.0;

  /// 卡片图片区域高度
  static const double cardImageH = 180.0;
  static const double cardImageHSmall = 120.0;

  /// 首页横向卡片宽度
  static const double cardWidthHorizontal = 160.0;
}
