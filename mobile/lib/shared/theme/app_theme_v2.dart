import 'package:flutter/material.dart';
import 'app_tokens.dart';

// ============================================================
// GoMate App Theme V2
// 视觉方向：「有温度的随身户外助手」
// 色调：柔和蓝绿（Soft Teal）+ 自然白底
// 参考：slock.ai 简洁 UI 语言
// ============================================================

/// Material 3 主题构建器
class AppThemeV2 {
  AppThemeV2._();

  static ThemeData get light {
    const colorScheme = ColorScheme.light(
      primary: AppTokens.brandPrimary,
      primaryContainer: AppTokens.brandPrimaryLight,
      secondary: AppTokens.brandAccent,
      secondaryContainer: AppTokens.brandAccentLight,
      surface: AppTokens.bgSurface,
      surfaceContainerHighest: AppTokens.bgSurfaceElevated,
      error: AppTokens.semanticError,
      onPrimary: AppTokens.textInverse,
      onSecondary: AppTokens.textInverse,
      onSurface: AppTokens.textPrimary,
      onError: AppTokens.textInverse,
      outline: AppTokens.borderDefault,
      outlineVariant: AppTokens.borderStrong,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppTokens.bgBase,

      // AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: AppTokens.bgBase,
        foregroundColor: AppTokens.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: AppTokens.textPrimary,
          fontSize: AppTokens.fontSizeXL,
          fontWeight: AppTokens.weightSemiBold,
          letterSpacing: -0.3,
        ),
        iconTheme: IconThemeData(
          color: AppTokens.textSecondary,
          size: AppTokens.iconL,
        ),
      ),

      // Card
      cardTheme: CardThemeData(
        color: AppTokens.bgSurface,
        elevation: 0,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          side: const BorderSide(color: AppTokens.borderDefault, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),

      // ElevatedButton（主按钮）
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTokens.brandPrimary,
          foregroundColor: AppTokens.textInverse,
          disabledBackgroundColor: AppTokens.brandPrimaryLight,
          disabledForegroundColor: AppTokens.textTertiary,
          elevation: 0,
          shadowColor: Colors.transparent,
          minimumSize: const Size(0, AppTokens.btnHeightM),
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space6,
            vertical: AppTokens.space3,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusS),
          ),
          textStyle: const TextStyle(
            fontSize: AppTokens.fontSizeM,
            fontWeight: AppTokens.weightSemiBold,
            letterSpacing: 0,
          ),
        ),
      ),

      // OutlinedButton
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTokens.textPrimary,
          side: const BorderSide(color: AppTokens.borderDefault, width: 1.5),
          minimumSize: const Size(0, AppTokens.btnHeightM),
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space6,
            vertical: AppTokens.space3,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusS),
          ),
          textStyle: const TextStyle(
            fontSize: AppTokens.fontSizeM,
            fontWeight: AppTokens.weightMedium,
            letterSpacing: 0,
          ),
        ),
      ),

      // TextButton
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppTokens.brandPrimary,
          textStyle: const TextStyle(
            fontSize: AppTokens.fontSizeBase,
            fontWeight: AppTokens.weightMedium,
          ),
        ),
      ),

      // 输入框
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppTokens.bgSurfaceElevated,
        hintStyle: const TextStyle(
          color: AppTokens.textTertiary,
          fontSize: AppTokens.fontSizeBase,
        ),
        labelStyle: const TextStyle(
          color: AppTokens.textSecondary,
          fontSize: AppTokens.fontSizeBase,
        ),
        floatingLabelStyle: const TextStyle(
          color: AppTokens.brandPrimary,
          fontSize: AppTokens.fontSizeS,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
          borderSide: const BorderSide(color: AppTokens.borderDefault, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
          borderSide: const BorderSide(color: AppTokens.borderDefault, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
          borderSide: const BorderSide(color: AppTokens.brandPrimary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
          borderSide: const BorderSide(color: AppTokens.semanticError, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
          borderSide:
              const BorderSide(color: AppTokens.semanticError, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppTokens.space4,
          vertical: AppTokens.space3,
        ),
        prefixIconColor: AppTokens.textTertiary,
        suffixIconColor: AppTokens.textTertiary,
      ),

      // NavigationBar（底部导航，Material 3）
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppTokens.bgSurface,
        indicatorColor: AppTokens.brandPrimaryLight,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(
              color: AppTokens.brandPrimary,
              size: AppTokens.iconL,
            );
          }
          return const IconThemeData(
            color: AppTokens.textTertiary,
            size: AppTokens.iconL,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: AppTokens.brandPrimary,
              fontSize: AppTokens.fontSizeXS,
              fontWeight: AppTokens.weightSemiBold,
            );
          }
          return const TextStyle(
            color: AppTokens.textTertiary,
            fontSize: AppTokens.fontSizeXS,
            fontWeight: AppTokens.weightRegular,
          );
        }),
        elevation: 0,
        height: AppTokens.navBarHeight,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        overlayColor: WidgetStateProperty.all(Colors.transparent),
      ),

      // Chip
      chipTheme: ChipThemeData(
        backgroundColor: AppTokens.bgSurfaceElevated,
        selectedColor: AppTokens.brandPrimaryLight,
        disabledColor: AppTokens.bgSurfaceElevated,
        labelStyle: const TextStyle(
          color: AppTokens.textSecondary,
          fontSize: AppTokens.fontSizeS,
          fontWeight: AppTokens.weightMedium,
        ),
        side: const BorderSide(color: AppTokens.borderDefault, width: 1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusFull),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.space3,
          vertical: AppTokens.space1,
        ),
        checkmarkColor: AppTokens.brandPrimary,
        showCheckmark: false,
      ),

      // Divider
      dividerTheme: const DividerThemeData(
        color: AppTokens.bgDivider,
        thickness: 1,
        space: 1,
      ),

      // Icon
      iconTheme: const IconThemeData(
        color: AppTokens.textSecondary,
        size: AppTokens.iconL,
      ),

      // ProgressIndicator
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppTokens.brandPrimary,
        circularTrackColor: AppTokens.brandPrimaryLight,
      ),

      // SnackBar
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppTokens.textPrimary,
        contentTextStyle: const TextStyle(
          color: AppTokens.textInverse,
          fontSize: AppTokens.fontSizeBase,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusS),
        ),
        behavior: SnackBarBehavior.floating,
        insetPadding: const EdgeInsets.all(AppTokens.space4),
        elevation: 0,
      ),

      // BottomSheet
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppTokens.bgSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        modalElevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppTokens.radiusXL),
          ),
        ),
        showDragHandle: true,
        dragHandleColor: AppTokens.borderStrong,
      ),

      // Dialog
      dialogTheme: DialogThemeData(
        backgroundColor: AppTokens.bgSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
        ),
        titleTextStyle: const TextStyle(
          color: AppTokens.textPrimary,
          fontSize: AppTokens.fontSizeXL,
          fontWeight: AppTokens.weightSemiBold,
        ),
        contentTextStyle: const TextStyle(
          color: AppTokens.textSecondary,
          fontSize: AppTokens.fontSizeBase,
          height: AppTokens.lineHeightNormal,
        ),
      ),

      // TabBar
      tabBarTheme: const TabBarThemeData(
        labelColor: AppTokens.brandPrimary,
        unselectedLabelColor: AppTokens.textTertiary,
        indicatorColor: AppTokens.brandPrimary,
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: AppTokens.bgDivider,
        labelStyle: TextStyle(
          fontSize: AppTokens.fontSizeBase,
          fontWeight: AppTokens.weightSemiBold,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: AppTokens.fontSizeBase,
          fontWeight: AppTokens.weightRegular,
        ),
      ),

      // ListTile
      listTileTheme: const ListTileThemeData(
        textColor: AppTokens.textPrimary,
        iconColor: AppTokens.textSecondary,
        tileColor: Colors.transparent,
        contentPadding: EdgeInsets.symmetric(
          horizontal: AppTokens.paddingPageH,
          vertical: AppTokens.space1,
        ),
        minLeadingWidth: 0,
        horizontalTitleGap: AppTokens.space3,
      ),

      // Switch
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppTokens.textInverse;
          }
          return AppTokens.textTertiary;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppTokens.brandPrimary;
          }
          return AppTokens.bgSurfaceElevated;
        }),
        trackOutlineColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return Colors.transparent;
          }
          return AppTokens.borderDefault;
        }),
      ),

      // 文字主题
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightBold,
          letterSpacing: -1.0,
        ),
        displayMedium: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightBold,
          letterSpacing: -0.5,
        ),
        displaySmall: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightSemiBold,
          letterSpacing: -0.25,
        ),
        headlineLarge: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightBold,
          letterSpacing: -0.5,
        ),
        headlineMedium: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightSemiBold,
        ),
        headlineSmall: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightSemiBold,
        ),
        titleLarge: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightSemiBold,
          fontSize: AppTokens.fontSizeXL,
        ),
        titleMedium: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightMedium,
          fontSize: AppTokens.fontSizeL,
        ),
        titleSmall: TextStyle(
          color: AppTokens.textSecondary,
          fontWeight: AppTokens.weightMedium,
          fontSize: AppTokens.fontSizeM,
        ),
        bodyLarge: TextStyle(
          color: AppTokens.textPrimary,
          fontSize: AppTokens.fontSizeM,
          height: AppTokens.lineHeightNormal,
        ),
        bodyMedium: TextStyle(
          color: AppTokens.textSecondary,
          fontSize: AppTokens.fontSizeBase,
          height: AppTokens.lineHeightNormal,
        ),
        bodySmall: TextStyle(
          color: AppTokens.textTertiary,
          fontSize: AppTokens.fontSizeS,
          height: AppTokens.lineHeightNormal,
        ),
        labelLarge: TextStyle(
          color: AppTokens.textPrimary,
          fontWeight: AppTokens.weightMedium,
          fontSize: AppTokens.fontSizeBase,
        ),
        labelMedium: TextStyle(
          color: AppTokens.textSecondary,
          fontSize: AppTokens.fontSizeS,
        ),
        labelSmall: TextStyle(
          color: AppTokens.textTertiary,
          fontSize: AppTokens.fontSizeXS,
        ),
      ),

      // FloatingActionButton
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppTokens.brandPrimary,
        foregroundColor: AppTokens.textInverse,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppTokens.radiusM)),
        ),
      ),
    );
  }
}
