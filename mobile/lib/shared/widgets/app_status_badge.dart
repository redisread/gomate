import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

// ============================================================
// AppStatusBadge — 状态徽章组件
// 用于队伍状态、难度标签等语义色展示
// ============================================================

enum StatusBadgeType {
  recruiting,
  full,
  formed,
  completed,
  cancelled,
  difficultyEasy,
  difficultyModerate,
  difficultyHard,
  difficultyExpert,
}

/// 状态徽章
class AppStatusBadge extends StatelessWidget {
  final String label;
  final StatusBadgeType type;

  const AppStatusBadge({
    super.key,
    required this.label,
    required this.type,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _resolveColors(type);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space2,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: colors.$2,
        borderRadius: BorderRadius.circular(AppTokens.radiusXS),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors.$1,
          fontSize: AppTokens.fontSizeXS,
          fontWeight: AppTokens.weightSemiBold,
        ),
      ),
    );
  }

  /// 根据类型返回 (前景色, 背景色)
  (Color, Color) _resolveColors(StatusBadgeType t) {
    switch (t) {
      case StatusBadgeType.recruiting:
        return (AppTokens.statusRecruiting, AppTokens.statusRecruitingBg);
      case StatusBadgeType.full:
        return (AppTokens.statusFull, AppTokens.statusFullBg);
      case StatusBadgeType.formed:
        return (AppTokens.statusFormed, AppTokens.statusFormedBg);
      case StatusBadgeType.completed:
        return (AppTokens.statusCompleted, AppTokens.statusCompletedBg);
      case StatusBadgeType.cancelled:
        return (AppTokens.statusCancelled, AppTokens.statusCancelledBg);
      case StatusBadgeType.difficultyEasy:
        return (AppTokens.difficultyEasy, AppTokens.difficultyEasyBg);
      case StatusBadgeType.difficultyModerate:
        return (AppTokens.difficultyModerate, AppTokens.difficultyModerateBg);
      case StatusBadgeType.difficultyHard:
        return (AppTokens.difficultyHard, AppTokens.difficultyHardBg);
      case StatusBadgeType.difficultyExpert:
        return (AppTokens.difficultyExpert, AppTokens.difficultyExpertBg);
    }
  }
}
