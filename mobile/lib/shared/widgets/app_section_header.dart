import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

// ============================================================
// AppSectionHeader — 页面章节标题行
// 左：标题文字，右：可选「查看全部」链接
// ============================================================

class AppSectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry? padding;

  const AppSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ??
          const EdgeInsets.symmetric(horizontal: AppTokens.paddingPageH),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: AppTokens.fontSizeL,
              fontWeight: AppTokens.weightBold,
              color: AppTokens.textPrimary,
              letterSpacing: -0.2,
            ),
          ),
          if (actionLabel != null && onAction != null)
            GestureDetector(
              onTap: onAction,
              child: Row(
                children: [
                  Text(
                    actionLabel!,
                    style: const TextStyle(
                      fontSize: AppTokens.fontSizeS,
                      color: AppTokens.brandPrimary,
                      fontWeight: AppTokens.weightMedium,
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: AppTokens.iconS,
                    color: AppTokens.brandPrimary,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
