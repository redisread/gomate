import 'package:flutter/material.dart';
import '../theme/app_tokens.dart';

// ============================================================
// AppStatusBadge — 队伍状态徽章
// 对齐 Web 端 status-badge.tsx
// 特点：圆角徽章 + 状态圆点（recruiting 时闪烁）
// ============================================================

/// 状态徽章组件
/// - status: 队伍状态 (recruiting/full-formed/completed/cancelled)
/// - showDot: 是否显示状态圆点
/// - size: 徽章尺寸倍数
class AppStatusBadge extends StatelessWidget {
  final String status;
  final bool showDot;
  final double size;

  const AppStatusBadge({
    super.key,
    required this.status,
    this.showDot = true,
    this.size = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getStatusColors(status);
    final label = _getStatusLabel(status);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: 10 * size,
        vertical: 4 * size,
      ),
      decoration: BoxDecoration(
        color: colors['bg'] as Color,
        borderRadius: BorderRadius.circular(AppTokens.radiusFull),
        border: Border.all(
          color: colors['border'] as Color,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDot) ...[
            _buildStatusDot(colors['dotColor'] as Color, status == 'recruiting'),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              color: colors['text'] as Color,
              fontSize: 12 * size,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusDot(Color color, bool animate) {
    if (animate) {
      // 招募中：带 ping 动画的圆点
      return SizedBox(
        width: 6,
        height: 6,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // 外圈扩散动画 - 使用无限循环的 TweenAnimationBuilder
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 1.0, end: 1.8),
              duration: const Duration(milliseconds: 1200),
              onEnd: () {}, // 触发动画循环
              builder: (context, value, child) {
                return Transform.scale(
                  scale: value,
                  child: Opacity(
                    opacity: 0.6 * (1 - (value - 1) / 0.8),
                    child: child,
                  ),
                );
              },
              child: Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
            ),
            // 内圆点
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      );
    }
    // 静态圆点
    return Container(
      width: 6,
      height: 6,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }

  Map<String, dynamic> _getStatusColors(String status) {
    switch (status) {
      case 'recruiting':
        return {
          'bg': const Color.fromRGBO(255, 251, 235, 1.0),
          'text': const Color(0xFF92400E),
          'border': const Color.fromRGBO(217, 119, 6, 0.25),
          'dotColor': const Color(0xFFD97706),
        };
      case 'full':
        return {
          'bg': const Color.fromRGBO(255, 243, 224, 1.0),
          'text': const Color(0xFF92400e),
          'border': const Color.fromRGBO(217, 119, 6, 0.25),
          'dotColor': const Color(0xFFd97706),
        };
      case 'formed':
        return {
          'bg': const Color.fromRGBO(252, 211, 77, 0.12),
          'text': const Color(0xFFD97706),
          'border': const Color.fromRGBO(252, 211, 77, 0.30),
          'dotColor': const Color(0xFFF59E0B),
        };
      case 'completed':
        return {
          'bg': const Color.fromRGBO(143, 127, 110, 0.10),
          'text': const Color(0xFF8f7f6e),
          'border': const Color.fromRGBO(143, 127, 110, 0.20),
          'dotColor': const Color(0xFF8f7f6e),
        };
      case 'cancelled':
        return {
          'bg': const Color.fromRGBO(229, 62, 62, 0.08),
          'text': const Color(0xFFc53030),
          'border': const Color.fromRGBO(229, 62, 62, 0.20),
          'dotColor': const Color(0xFFe53e3e),
        };
      default:
        return {
          'bg': AppTokens.bgSurfaceElevated,
          'text': AppTokens.textTertiary,
          'border': AppTokens.borderDefault,
          'dotColor': AppTokens.textTertiary,
        };
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'recruiting':
        return '正在招募';
      case 'full':
        return '名额已满';
      case 'formed':
        return '队伍已集结';
      case 'completed':
        return '圆满收队';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  }
}

// ============================================================
// AppDifficultyBadge — 难度徽章（方形标签）
// 对齐 Web 端 status-badge.tsx 中的 DifficultyBadge
// ============================================================

/// 难度徽章组件
/// - difficulty: 难度等级 (easy/moderate/hard/expert)
/// - size: 徽章尺寸倍数
class AppDifficultyBadge extends StatelessWidget {
  final String difficulty;
  final double size;

  const AppDifficultyBadge({
    super.key,
    required this.difficulty,
    this.size = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getDifficultyColors(difficulty);
    final label = _getDifficultyLabel(difficulty);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: 8 * size,
        vertical: 4 * size,
      ),
      decoration: BoxDecoration(
        color: colors['bg'] as Color,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors['text'] as Color,
          fontSize: 11 * size,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Map<String, dynamic> _getDifficultyColors(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return {
          'bg': const Color.fromRGBO(234, 247, 224, 1.0),
          'text': const Color(0xFF52C41A),
        };
      case 'moderate':
        return {
          'bg': const Color.fromRGBO(230, 240, 255, 1.0),
          'text': const Color(0xFF1677FF),
        };
      case 'hard':
        return {
          'bg': const Color.fromRGBO(255, 243, 224, 1.0),
          'text': const Color(0xFFFA8C16),
        };
      case 'expert':
        return {
          'bg': const Color.fromRGBO(255, 238, 238, 1.0),
          'text': const Color(0xFFFF4D4F),
        };
      default:
        return {
          'bg': AppTokens.bgSurfaceElevated,
          'text': AppTokens.textTertiary,
        };
    }
  }

  String _getDifficultyLabel(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return '简单';
      case 'moderate':
        return '普通';
      case 'hard':
        return '困难';
      case 'expert':
        return '专家';
      default:
        return difficulty;
    }
  }
}
