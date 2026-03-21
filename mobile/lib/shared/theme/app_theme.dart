import 'package:flutter/material.dart';

/// 应用颜色常量（暖色调系统）
class AppColors {
  AppColors._();

  // 背景色
  static const Color background = Color(0xFFFFF8E7); // 奶油白主背景
  static const Color surface = Color(0xFFFFFDF5); // 次级背景（输入框填充等）
  static const Color cardBackground = Color(0xFFFFF3DC); // 卡片背景
  static const Color surfaceElevated = Color(0xFFFFECC8); // 更深一层的暖色

  // 边框色
  static const Color border = Color(0xFFF0E6D3); // 主边框
  static const Color borderStrong = Color(0xFFE8D5BE); // 强边框

  // 文字色
  static const Color textPrimary = Color(0xFF1A1008); // 深棕主文字
  static const Color textSecondary = Color(0xFF7C6040); // 次要文字
  static const Color textPlaceholder = Color(0xFFB8956A); // 占位符/弱文字

  // 品牌色
  static const Color brand = Color(0xFFFF9F43); // 暖橙主色
  static const Color brandAccent = Color(0xFFFF6B9D); // 玫瑰粉强调色
  static const Color brandMuted = Color(0xFFFFE8CC); // 浅橙容器背景

  // 状态色
  static const Color success = Color(0xFF22C55E);
  static const Color error = Color(0xFFEF4444);
  static const Color accent = Color(0xFFA6FF00); // 荧光黄绿（仅小面积点缀）
}

/// 应用渐变常量
class AppGradients {
  AppGradients._();

  /// 品牌渐变：暖橙 → 玫瑰粉（横向）
  static const LinearGradient brand = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFFFF9F43), Color(0xFFFF6B9D)],
  );

  /// 品牌渐变（竖向）
  static const LinearGradient brandVertical = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFF9F43), Color(0xFFFF6B9D)],
  );

  /// 卡片渐变（暖色卡片光泽）
  static const LinearGradient card = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFF3DC), Color(0xFFFFF8E7)],
  );
}

/// GoMate 应用主题配置（暖色调系统）
class AppTheme {
  AppTheme._();

  // 圆角常量
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusXLarge = 24.0;

  /// 品牌渐变（便捷访问）
  static LinearGradient get brandGradient => AppGradients.brand;

  /// 亮色主题（暖色调，默认主题）
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: const ColorScheme.light(
          primary: AppColors.brand,
          secondary: AppColors.brandAccent,
          surface: AppColors.surface,
          error: AppColors.error,
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: AppColors.textPrimary,
          onError: Colors.white,
          outline: AppColors.border,
        ),
        scaffoldBackgroundColor: AppColors.background,
        cardColor: AppColors.cardBackground,
        dividerColor: AppColors.border,
        // AppBar
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.background,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          centerTitle: true,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
          iconTheme: IconThemeData(color: AppColors.textSecondary),
        ),
        // 卡片
        cardTheme: CardThemeData(
          color: AppColors.cardBackground,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: AppColors.border, width: 1),
          ),
          margin: EdgeInsets.zero,
        ),
        // ElevatedButton
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.brand,
            foregroundColor: Colors.white,
            disabledBackgroundColor: AppColors.brandMuted,
            disabledForegroundColor: AppColors.textPlaceholder,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        // OutlinedButton
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.textPrimary,
            side: const BorderSide(color: AppColors.border, width: 1),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        // TextButton
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.brand,
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        // 输入框
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface,
          hintStyle: const TextStyle(color: AppColors.textPlaceholder),
          labelStyle: const TextStyle(color: AppColors.textSecondary),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: AppColors.border, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: AppColors.border, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: AppColors.brand, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: AppColors.error, width: 1),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: AppColors.error, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
        // 底部导航栏
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppColors.cardBackground,
          selectedItemColor: AppColors.brand,
          unselectedItemColor: AppColors.textPlaceholder,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
        ),
        // 文字主题
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
          displayMedium: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
          displaySmall: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
          headlineLarge: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
          headlineMedium: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
          headlineSmall: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
          titleLarge: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
          titleMedium: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w500,
          ),
          titleSmall: TextStyle(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
          bodyLarge: TextStyle(color: AppColors.textPrimary),
          bodyMedium: TextStyle(color: AppColors.textSecondary),
          bodySmall: TextStyle(color: AppColors.textPlaceholder),
          labelLarge: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w500,
          ),
          labelMedium: TextStyle(color: AppColors.textSecondary),
          labelSmall: TextStyle(color: AppColors.textPlaceholder),
        ),
        // Chip
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.cardBackground,
          labelStyle: const TextStyle(color: AppColors.textSecondary),
          side: const BorderSide(color: AppColors.border, width: 1),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        ),
        // Divider
        dividerTheme: const DividerThemeData(
          color: AppColors.border,
          thickness: 1,
          space: 1,
        ),
        // Icon
        iconTheme: const IconThemeData(color: AppColors.textSecondary),
        // ProgressIndicator
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppColors.brand,
        ),
        // SnackBar
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.cardBackground,
          contentTextStyle: const TextStyle(color: AppColors.textPrimary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            side: const BorderSide(color: AppColors.border, width: 1),
          ),
          behavior: SnackBarBehavior.floating,
        ),
        // BottomSheet
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: AppColors.background,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(20),
            ),
          ),
        ),
        // Dialog
        dialogTheme: DialogThemeData(
          backgroundColor: AppColors.cardBackground,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.border, width: 1),
          ),
          titleTextStyle: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
          contentTextStyle: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
          ),
        ),
        // TabBar
        tabBarTheme: const TabBarThemeData(
          labelColor: AppColors.textPrimary,
          unselectedLabelColor: AppColors.textPlaceholder,
          indicatorColor: AppColors.brand,
          dividerColor: AppColors.border,
        ),
        // ListTile
        listTileTheme: const ListTileThemeData(
          textColor: AppColors.textPrimary,
          iconColor: AppColors.textSecondary,
          tileColor: Colors.transparent,
        ),
        // Switch
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.background;
            }
            return AppColors.textPlaceholder;
          }),
          trackColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.brand;
            }
            return AppColors.surfaceElevated;
          }),
        ),
      );

  /// 暗色主题（保留，使用暗色系）
  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.brand,
          secondary: AppColors.brandAccent,
          surface: Color(0xFF111113),
          error: AppColors.error,
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: Colors.white,
          onError: Colors.white,
          outline: Color(0xFF1F1F23),
        ),
        scaffoldBackgroundColor: const Color(0xFF0A0A0B),
        cardColor: const Color(0xFF111113),
        dividerColor: const Color(0xFF1F1F23),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0A0A0B),
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
          iconTheme: IconThemeData(color: Color(0xFFA1A1AA)),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF111113),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
            side: const BorderSide(color: Color(0xFF1F1F23), width: 1),
          ),
          margin: EdgeInsets.zero,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.brand,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusSmall),
            ),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1A1A1E),
          hintStyle: const TextStyle(color: Color(0xFF71717A)),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: Color(0xFF1F1F23), width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: Color(0xFF1F1F23), width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusSmall),
            borderSide: const BorderSide(color: AppColors.brand, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFF111113),
          selectedItemColor: AppColors.brand,
          unselectedItemColor: Color(0xFF71717A),
          elevation: 0,
          type: BottomNavigationBarType.fixed,
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppColors.brand,
        ),
      );
}
