import 'package:flutter/material.dart';
import 'app_tokens.dart';

/// GoMate 应用主题系统（蓝绿调 · 温暖感）
/// 参考风格：slock.ai — 柔和蓝绿 + 白色 + 少量蓝紫点缀
/// 完全基于 Material 3，支持 light / dark 双主题
class AppTheme {
  AppTheme._();

  // ── 便捷颜色访问（向后兼容旧引用）──────────────────
  static const Color primary = AppTokens.colorPrimary;
  static const Color secondary = AppTokens.colorSecondary;
  static const Color background = AppTokens.colorBgBase;
  static const Color surface = AppTokens.colorBgSurface;
  static const Color border = AppTokens.colorBorder;
  static const Color textPrimary = AppTokens.colorTextPrimary;
  static const Color textSecondary = AppTokens.colorTextSecondary;
  static const Color textTertiary = AppTokens.colorTextTertiary;

  // ── 渐变访问 ─────────────────────────────────────
  static LinearGradient get brandGradient => AppTokens.gradientBrand;
  static LinearGradient get cardGradient => AppTokens.gradientCard;

  // ──────────────────────────────────────────────────
  //  亮色主题
  // ──────────────────────────────────────────────────
  static ThemeData light() => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        // ── ColorScheme ──────────────────────────────
        colorScheme: const ColorScheme.light(
          primary: AppTokens.colorPrimary,
          onPrimary: Colors.white,
          primaryContainer: AppTokens.colorPrimaryContainer,
          onPrimaryContainer: AppTokens.colorTextPrimary,
          secondary: AppTokens.colorSecondary,
          onSecondary: Colors.white,
          secondaryContainer: AppTokens.colorSecondaryContainer,
          onSecondaryContainer: AppTokens.colorTextPrimary,
          surface: AppTokens.colorBgSurface,
          onSurface: AppTokens.colorTextPrimary,
          surfaceContainerHighest: AppTokens.colorBgOverlay,
          error: AppTokens.colorError,
          onError: Colors.white,
          outline: AppTokens.colorBorder,
          outlineVariant: AppTokens.colorBorderStrong,
          shadow: Color(0x142DD4BF),
          scrim: Color(0x80042F2E),
        ),
        scaffoldBackgroundColor: AppTokens.colorBgBase,
        cardColor: AppTokens.colorBgSurface,
        dividerColor: AppTokens.colorBorder,

        // ── TextTheme ────────────────────────────────
        textTheme: _buildTextTheme(AppTokens.colorTextPrimary),

        // ── AppBar ───────────────────────────────────
        appBarTheme: AppBarTheme(
          backgroundColor: AppTokens.colorBgBase,
          foregroundColor: AppTokens.colorTextPrimary,
          elevation: 0,
          scrolledUnderElevation: 0.5,
          centerTitle: true,
          surfaceTintColor: Colors.transparent,
          shadowColor: AppTokens.colorBorder,
          titleTextStyle: const TextStyle(
            color: AppTokens.colorTextPrimary,
            fontSize: AppTokens.fontSizeLG,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.3,
          ),
          iconTheme: const IconThemeData(
            color: AppTokens.colorTextSecondary,
            size: AppTokens.iconLG,
          ),
          actionsIconTheme: const IconThemeData(
            color: AppTokens.colorTextSecondary,
          ),
          toolbarHeight: AppTokens.appBarHeight,
        ),

        // ── Card ─────────────────────────────────────
        cardTheme: CardThemeData(
          color: AppTokens.colorBgSurface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusLG),
            side: const BorderSide(color: AppTokens.colorBorder, width: 1),
          ),
          margin: EdgeInsets.zero,
        ),

        // ── ElevatedButton ───────────────────────────
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTokens.colorPrimary,
            foregroundColor: Colors.white,
            disabledBackgroundColor: AppTokens.colorPrimaryContainer,
            disabledForegroundColor: AppTokens.colorTextTertiary,
            elevation: 0,
            shadowColor: Colors.transparent,
            minimumSize: const Size(0, AppTokens.buttonHeight),
            padding: const EdgeInsets.symmetric(horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            ),
            textStyle: const TextStyle(
              fontSize: AppTokens.fontSizeMD,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.1,
            ),
          ),
        ),

        // ── OutlinedButton ───────────────────────────
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTokens.colorPrimary,
            side: const BorderSide(color: AppTokens.colorPrimary, width: 1.5),
            minimumSize: const Size(0, AppTokens.buttonHeight),
            padding: const EdgeInsets.symmetric(horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            ),
            textStyle: const TextStyle(
              fontSize: AppTokens.fontSizeMD,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),

        // ── TextButton ───────────────────────────────
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppTokens.colorPrimary,
            padding: const EdgeInsets.symmetric(
              horizontal: AppTokens.space12,
              vertical: AppTokens.space8,
            ),
            textStyle: const TextStyle(
              fontSize: AppTokens.fontSizeMD,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),

        // ── FilledButton ─────────────────────────────
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: AppTokens.colorPrimary,
            foregroundColor: Colors.white,
            minimumSize: const Size(0, AppTokens.buttonHeight),
            padding: const EdgeInsets.symmetric(horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            ),
          ),
        ),

        // ── InputDecoration ──────────────────────────
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppTokens.colorBgSurface,
          hintStyle: const TextStyle(
            color: AppTokens.colorTextTertiary,
            fontSize: AppTokens.fontSizeMD,
          ),
          labelStyle: const TextStyle(
            color: AppTokens.colorTextSecondary,
            fontSize: AppTokens.fontSizeMD,
          ),
          prefixIconColor: AppTokens.colorTextTertiary,
          suffixIconColor: AppTokens.colorTextTertiary,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space16,
            vertical: AppTokens.space16,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorBorder,
              width: 1,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorBorder,
              width: 1,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorPrimary,
              width: 1.5,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorError,
              width: 1,
            ),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorError,
              width: 1.5,
            ),
          ),
        ),

        // ── BottomNavigationBar ──────────────────────
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppTokens.colorBgSurface,
          selectedItemColor: AppTokens.colorPrimary,
          unselectedItemColor: AppTokens.colorTextTertiary,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          showSelectedLabels: true,
          showUnselectedLabels: true,
          selectedLabelStyle: TextStyle(
            fontSize: AppTokens.fontSizeXS,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: TextStyle(
            fontSize: AppTokens.fontSizeXS,
            fontWeight: FontWeight.w400,
          ),
        ),

        // ── NavigationBar (M3) ───────────────────────
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: AppTokens.colorBgSurface,
          indicatorColor: AppTokens.colorPrimaryContainer,
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(
                fontSize: AppTokens.fontSizeXS,
                fontWeight: FontWeight.w600,
                color: AppTokens.colorPrimary,
              );
            }
            return const TextStyle(
              fontSize: AppTokens.fontSizeXS,
              color: AppTokens.colorTextTertiary,
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const IconThemeData(color: AppTokens.colorPrimaryDark);
            }
            return const IconThemeData(color: AppTokens.colorTextTertiary);
          }),
        ),

        // ── Chip ─────────────────────────────────────
        chipTheme: ChipThemeData(
          backgroundColor: AppTokens.colorBgOverlay,
          labelStyle: const TextStyle(
            color: AppTokens.colorTextSecondary,
            fontSize: AppTokens.fontSizeSM,
          ),
          side: const BorderSide(color: AppTokens.colorBorder, width: 1),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusXL),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space12,
            vertical: AppTokens.space4,
          ),
          selectedColor: AppTokens.colorPrimaryContainer,
          checkmarkColor: AppTokens.colorPrimaryDark,
        ),

        // ── Divider ──────────────────────────────────
        dividerTheme: const DividerThemeData(
          color: AppTokens.colorBorder,
          thickness: 1,
          space: 1,
        ),

        // ── Icon ─────────────────────────────────────
        iconTheme: const IconThemeData(
          color: AppTokens.colorTextSecondary,
          size: AppTokens.iconLG,
        ),

        // ── ProgressIndicator ────────────────────────
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppTokens.colorPrimary,
          linearTrackColor: AppTokens.colorBorder,
          circularTrackColor: AppTokens.colorBorder,
        ),

        // ── SnackBar ─────────────────────────────────
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppTokens.colorTextPrimary,
          contentTextStyle: const TextStyle(
            color: AppTokens.colorBgBase,
            fontSize: AppTokens.fontSizeSM,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
          ),
          behavior: SnackBarBehavior.floating,
          insetPadding: const EdgeInsets.all(AppTokens.space16),
          actionTextColor: AppTokens.colorPrimary,
        ),

        // ── BottomSheet ──────────────────────────────
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: AppTokens.colorBgSurface,
          surfaceTintColor: Colors.transparent,
          modalBackgroundColor: AppTokens.colorBgSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(AppTokens.radiusXL),
            ),
          ),
          clipBehavior: Clip.antiAlias,
        ),

        // ── Dialog ───────────────────────────────────
        dialogTheme: DialogThemeData(
          backgroundColor: AppTokens.colorBgSurface,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusXL),
            side: const BorderSide(color: AppTokens.colorBorder, width: 1),
          ),
          titleTextStyle: const TextStyle(
            color: AppTokens.colorTextPrimary,
            fontSize: AppTokens.fontSizeXL,
            fontWeight: FontWeight.w600,
          ),
          contentTextStyle: const TextStyle(
            color: AppTokens.colorTextSecondary,
            fontSize: AppTokens.fontSizeMD,
            height: 1.5,
          ),
        ),

        // ── TabBar ───────────────────────────────────
        tabBarTheme: const TabBarThemeData(
          labelColor: AppTokens.colorPrimary,
          unselectedLabelColor: AppTokens.colorTextTertiary,
          indicatorColor: AppTokens.colorPrimary,
          indicatorSize: TabBarIndicatorSize.label,
          dividerColor: AppTokens.colorBorder,
          labelStyle: TextStyle(
            fontSize: AppTokens.fontSizeMD,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: TextStyle(
            fontSize: AppTokens.fontSizeMD,
            fontWeight: FontWeight.w400,
          ),
        ),

        // ── ListTile ─────────────────────────────────
        listTileTheme: const ListTileThemeData(
          textColor: AppTokens.colorTextPrimary,
          iconColor: AppTokens.colorTextSecondary,
          tileColor: Colors.transparent,
          dense: false,
          horizontalTitleGap: AppTokens.space12,
          minVerticalPadding: AppTokens.space12,
        ),

        // ── Switch ───────────────────────────────────
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return Colors.white;
            }
            return AppTokens.colorTextTertiary;
          }),
          trackColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppTokens.colorPrimary;
            }
            return AppTokens.colorBorder;
          }),
        ),

        // ── Checkbox ─────────────────────────────────
        checkboxTheme: CheckboxThemeData(
          fillColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppTokens.colorPrimary;
            }
            return Colors.transparent;
          }),
          checkColor: WidgetStateProperty.all(Colors.white),
          side: const BorderSide(color: AppTokens.colorBorder, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusXS),
          ),
        ),

        // ── FloatingActionButton ─────────────────────
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: AppTokens.colorPrimary,
          foregroundColor: Colors.white,
          elevation: 0,
          highlightElevation: 2,
          shape: CircleBorder(),
        ),

        // ── Tooltip ──────────────────────────────────
        tooltipTheme: TooltipThemeData(
          decoration: BoxDecoration(
            color: AppTokens.colorTextPrimary,
            borderRadius: BorderRadius.circular(AppTokens.radiusSM),
          ),
          textStyle: const TextStyle(
            color: AppTokens.colorBgBase,
            fontSize: AppTokens.fontSizeXS,
          ),
        ),

        // ── PopupMenuButton ──────────────────────────
        popupMenuTheme: PopupMenuThemeData(
          color: AppTokens.colorBgSurface,
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            side: const BorderSide(color: AppTokens.colorBorder, width: 1),
          ),
          textStyle: const TextStyle(
            color: AppTokens.colorTextPrimary,
            fontSize: AppTokens.fontSizeMD,
          ),
        ),
      );

  // ──────────────────────────────────────────────────
  //  暗色主题
  // ──────────────────────────────────────────────────
  static ThemeData dark() => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: AppTokens.colorPrimary,
          onPrimary: AppTokens.colorDarkBgBase,
          primaryContainer: Color(0xFF0D4740),
          onPrimaryContainer: AppTokens.colorDarkTextPrimary,
          secondary: AppTokens.colorSecondary,
          onSecondary: Colors.white,
          secondaryContainer: Color(0xFF1E1B4B),
          onSecondaryContainer: Color(0xFFE0E7FF),
          surface: AppTokens.colorDarkBgSurface,
          onSurface: AppTokens.colorDarkTextPrimary,
          surfaceContainerHighest: AppTokens.colorDarkBgElevated,
          error: AppTokens.colorError,
          onError: Colors.white,
          outline: AppTokens.colorDarkBorder,
          outlineVariant: Color(0xFF1A5E58),
          shadow: Color(0x28000000),
          scrim: Color(0xCC000000),
        ),
        scaffoldBackgroundColor: AppTokens.colorDarkBgBase,
        cardColor: AppTokens.colorDarkBgSurface,
        dividerColor: AppTokens.colorDarkBorder,
        textTheme: _buildTextTheme(AppTokens.colorDarkTextPrimary),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppTokens.colorDarkBgBase,
          foregroundColor: AppTokens.colorDarkTextPrimary,
          elevation: 0,
          centerTitle: true,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: AppTokens.colorDarkTextPrimary,
            fontSize: AppTokens.fontSizeLG,
            fontWeight: FontWeight.w600,
          ),
          iconTheme: IconThemeData(color: AppTokens.colorDarkTextSecondary),
        ),
        cardTheme: CardThemeData(
          color: AppTokens.colorDarkBgSurface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusLG),
            side: const BorderSide(
              color: AppTokens.colorDarkBorder,
              width: 1,
            ),
          ),
          margin: EdgeInsets.zero,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTokens.colorPrimary,
            foregroundColor: AppTokens.colorDarkBgBase,
            elevation: 0,
            minimumSize: const Size(0, AppTokens.buttonHeight),
            padding: const EdgeInsets.symmetric(horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            ),
            textStyle: const TextStyle(
              fontSize: AppTokens.fontSizeMD,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppTokens.colorDarkBgElevated,
          hintStyle: const TextStyle(color: AppTokens.colorDarkTextTertiary),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorDarkBorder,
              width: 1,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorDarkBorder,
              width: 1,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMD),
            borderSide: const BorderSide(
              color: AppTokens.colorPrimary,
              width: 1.5,
            ),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space16,
            vertical: AppTokens.space16,
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppTokens.colorDarkBgSurface,
          selectedItemColor: AppTokens.colorPrimary,
          unselectedItemColor: AppTokens.colorDarkTextTertiary,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppTokens.colorPrimary,
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: AppTokens.colorPrimary,
          foregroundColor: AppTokens.colorDarkBgBase,
          elevation: 0,
        ),
      );

  // ──────────────────────────────────────────────────
  //  私有方法：构建 TextTheme
  // ──────────────────────────────────────────────────
  static TextTheme _buildTextTheme(Color textColor) {
    final secondaryColor = textColor.withValues(alpha: 0.65);
    final tertiaryColor = textColor.withValues(alpha: 0.45);

    return TextTheme(
      // 大显示文字（Banner标题）
      displayLarge: TextStyle(
        fontSize: AppTokens.fontSize4XL,
        fontWeight: FontWeight.w700,
        color: textColor,
        letterSpacing: -1.0,
        height: 1.1,
      ),
      displayMedium: TextStyle(
        fontSize: AppTokens.fontSize3XL,
        fontWeight: FontWeight.w700,
        color: textColor,
        letterSpacing: -0.5,
        height: 1.15,
      ),
      displaySmall: TextStyle(
        fontSize: AppTokens.fontSize2XL,
        fontWeight: FontWeight.w600,
        color: textColor,
        letterSpacing: -0.3,
        height: 1.2,
      ),
      // 页面标题
      headlineLarge: TextStyle(
        fontSize: AppTokens.fontSizeXL,
        fontWeight: FontWeight.w700,
        color: textColor,
        letterSpacing: -0.3,
        height: 1.3,
      ),
      headlineMedium: TextStyle(
        fontSize: AppTokens.fontSizeLG,
        fontWeight: FontWeight.w600,
        color: textColor,
        letterSpacing: -0.2,
        height: 1.35,
      ),
      headlineSmall: TextStyle(
        fontSize: AppTokens.fontSizeMD,
        fontWeight: FontWeight.w600,
        color: textColor,
        letterSpacing: -0.1,
        height: 1.4,
      ),
      // 节标题
      titleLarge: TextStyle(
        fontSize: AppTokens.fontSizeMD,
        fontWeight: FontWeight.w600,
        color: textColor,
        height: 1.4,
      ),
      titleMedium: TextStyle(
        fontSize: AppTokens.fontSizeSM,
        fontWeight: FontWeight.w500,
        color: textColor,
        height: 1.4,
      ),
      titleSmall: TextStyle(
        fontSize: AppTokens.fontSizeSM,
        fontWeight: FontWeight.w500,
        color: secondaryColor,
        height: 1.4,
      ),
      // 正文
      bodyLarge: TextStyle(
        fontSize: AppTokens.fontSizeMD,
        fontWeight: FontWeight.w400,
        color: textColor,
        height: 1.6,
      ),
      bodyMedium: TextStyle(
        fontSize: AppTokens.fontSizeSM,
        fontWeight: FontWeight.w400,
        color: secondaryColor,
        height: 1.6,
      ),
      bodySmall: TextStyle(
        fontSize: AppTokens.fontSizeXS,
        fontWeight: FontWeight.w400,
        color: tertiaryColor,
        height: 1.5,
      ),
      // 标签
      labelLarge: TextStyle(
        fontSize: AppTokens.fontSizeMD,
        fontWeight: FontWeight.w500,
        color: textColor,
        letterSpacing: 0.1,
      ),
      labelMedium: TextStyle(
        fontSize: AppTokens.fontSizeSM,
        fontWeight: FontWeight.w500,
        color: secondaryColor,
        letterSpacing: 0.1,
      ),
      labelSmall: TextStyle(
        fontSize: AppTokens.fontSizeXS,
        fontWeight: FontWeight.w500,
        color: tertiaryColor,
        letterSpacing: 0.5,
      ),
    );
  }
}
