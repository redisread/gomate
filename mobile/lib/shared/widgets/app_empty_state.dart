import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'app_button.dart';

// ============================================================
// AppEmptyState — 空状态占位组件
// 用于列表无数据、搜索无结果、权限未满足等场景
// ============================================================

class AppEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const AppEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTokens.space8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: AppTokens.brandPrimaryLight,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: AppTokens.iconXL,
                color: AppTokens.brandPrimary,
              ),
            ),
            const SizedBox(height: AppTokens.space4),
            Text(
              title,
              style: const TextStyle(
                fontSize: AppTokens.fontSizeL,
                fontWeight: AppTokens.weightSemiBold,
                color: AppTokens.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: AppTokens.space2),
              Text(
                subtitle!,
                style: const TextStyle(
                  fontSize: AppTokens.fontSizeBase,
                  color: AppTokens.textTertiary,
                  height: AppTokens.lineHeightNormal,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppTokens.space6),
              AppButton(
                label: actionLabel!,
                onPressed: onAction,
                useGradient: true,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// 错误状态（含重试按钮）
class AppErrorState extends StatelessWidget {
  final String? message;
  final VoidCallback? onRetry;

  const AppErrorState({super.key, this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return AppEmptyState(
      icon: Icons.wifi_off_rounded,
      title: '加载失败',
      subtitle: message ?? '网络似乎有点问题，请稍后重试',
      actionLabel: onRetry != null ? '重新加载' : null,
      onAction: onRetry,
    );
  }
}
