import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_tokens.dart';

// ============================================================
// AppAvatar — 用户头像组件
// 对齐 Web 端 team-card.tsx 中的 Avatar 组件
// 特点：
// - 支持图片/字母占位
// - 根据姓名哈希生成一致的背景色
// - 多尺寸支持
// ============================================================

enum AvatarSize { xs, sm, md, lg, xl }

/// 用户头像组件
class AppAvatar extends StatelessWidget {
  /// 头像图片 URL（可选）
  final String? imageUrl;

  /// 用户名称（用于生成首字母和背景色）
  final String name;

  /// 头像尺寸
  final AvatarSize size;

  /// 是否显示环形边框
  final bool showRing;

  /// 自定义背景色（不提供则根据姓名哈希生成）
  final Color? backgroundColor;

  const AppAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = AvatarSize.sm,
    this.showRing = true,
    this.backgroundColor,
  });

  /// 小尺寸头像（用于列表项）
  const AppAvatar.small({
    super.key,
    required this.name,
    this.imageUrl,
    this.showRing = true,
    this.backgroundColor,
  }) : size = AvatarSize.sm;

  /// 微型头像（用于头像叠加）
  const AppAvatar.xs({
    super.key,
    required this.name,
    this.imageUrl,
    this.showRing = false,
    this.backgroundColor,
  }) : size = AvatarSize.xs;

  /// 中等头像（用于个人资料）
  const AppAvatar.medium({
    super.key,
    required this.name,
    this.imageUrl,
    this.showRing = true,
    this.backgroundColor,
  }) : size = AvatarSize.md;

  /// 大头像（用于个人资料顶部）
  const AppAvatar.large({
    super.key,
    required this.name,
    this.imageUrl,
    this.showRing = true,
    this.backgroundColor,
  }) : size = AvatarSize.lg;

  @override
  Widget build(BuildContext context) {
    final sizeValue = _getSizeValue();
    final fontSize = _getFontSize();

    // 如果有图片 URL，显示图片头像
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return _buildImageAvatar(sizeValue);
    }

    // 否则显示字母占位头像
    return _buildPlaceholderAvatar(sizeValue, fontSize);
  }

  Widget _buildImageAvatar(double sizeValue) {
    return Container(
      width: sizeValue,
      height: sizeValue,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        image: DecorationImage(
          image: NetworkImage(imageUrl!),
          fit: BoxFit.cover,
        ),
        boxShadow: showRing
            ? [
                BoxShadow(
                  color: Colors.white,
                  blurRadius: 0,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
    );
  }

  Widget _buildPlaceholderAvatar(double sizeValue, double fontSize) {
    final initials = _getInitials(name);
    final bgColor = backgroundColor ?? _generateBackgroundColor(name);

    return Container(
      width: sizeValue,
      height: sizeValue,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        boxShadow: showRing
            ? [
                BoxShadow(
                  color: Colors.white,
                  blurRadius: 0,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: Colors.white,
            fontSize: fontSize,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  double _getSizeValue() {
    switch (size) {
      case AvatarSize.xs:
        return 24.0;
      case AvatarSize.sm:
        return 32.0;
      case AvatarSize.md:
        return 44.0;
      case AvatarSize.lg:
        return 64.0;
      case AvatarSize.xl:
        return 96.0;
    }
  }

  double _getFontSize() {
    switch (size) {
      case AvatarSize.xs:
        return 10.0;
      case AvatarSize.sm:
        return 12.0;
      case AvatarSize.md:
        return 16.0;
      case AvatarSize.lg:
        return 24.0;
      case AvatarSize.xl:
        return 36.0;
    }
  }

  /// 获取首字母
  /// - 中文取第一个字
  /// - 英文取第一个字母大写
  String _getInitials(String name) {
    if (name.isEmpty) return '?';

    final firstChar = name[0];
    // 判断是否为中文字符
    if (RegExp(r'[\u4e00-\u9fa5]').hasMatch(firstChar)) {
      return firstChar;
    }
    // 英文取首字母大写
    return firstChar.toUpperCase();
  }

  /// 根据姓名哈希生成一致的背景色
  /// 使用蓝绿色域 (hue 150~220)，与 Web 端保持一致
  Color _generateBackgroundColor(String name) {
    final hash = name.split('').fold<int>(
      0,
      (acc, c) => acc + c.codeUnitAt(0),
    );

    // hue 范围：155~215（蓝绿色域）
    final hue = (hash % 60) + 155;

    return HSLColor.fromAHSL(
      1.0,
      hue.toDouble(),
      0.45, // saturation
      0.42, // lightness
    ).toColor();
  }
}

// ============================================================
// AppAvatarStack — 头像叠加组件
// 对齐 Web 端 team-card.tsx 中的成员头像叠加效果
// ============================================================

/// 头像叠加组件（用于显示队伍成员）
class AppAvatarStack extends StatelessWidget {
  /// 头像列表（用户名称和图片 URL）
  final List<({String name, String? imageUrl})> avatars;

  /// 最大显示数量（超过则显示 +N）
  final int maxVisible;

  /// 头像尺寸
  final AvatarSize size;

  const AppAvatarStack({
    super.key,
    required this.avatars,
    this.maxVisible = 4,
    this.size = AvatarSize.xs,
  });

  @override
  Widget build(BuildContext context) {
    final visibleAvatars = avatars.take(maxVisible).toList();
    final extraCount = math.max(0, avatars.length - maxVisible);

    // 计算头像尺寸
    final sizeValue = _getSizeValue();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            // 背景占位圆形
            Container(
              width: sizeValue,
              height: sizeValue,
              decoration: BoxDecoration(
                color: AppTokens.bgSurfaceElevated,
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white,
                  width: 2,
                ),
              ),
            ),
            // 可见的头像
            ...visibleAvatars.asMap().entries.map((entry) {
              final index = entry.key;
              final avatar = entry.value;
              return Positioned(
                left: index * (sizeValue * 0.6),
                child: AppAvatar(
                  name: avatar.name,
                  imageUrl: avatar.imageUrl,
                  size: size,
                  showRing: true,
                ),
              );
            }).toList(),
          ],
        ),
        // 额外的数量徽章
        if (extraCount > 0)
          Container(
            margin: const EdgeInsets.only(left: 4),
            padding: const EdgeInsets.symmetric(
              horizontal: 6,
              vertical: 2,
            ),
            decoration: BoxDecoration(
              color: AppTokens.bgSurfaceElevated,
              borderRadius: BorderRadius.circular(AppTokens.radiusFull),
              border: Border.all(
                color: Colors.white,
                width: 2,
              ),
            ),
            child: Text(
              '+$extraCount',
              style: TextStyle(
                color: AppTokens.textSecondary,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  double _getSizeValue() {
    switch (size) {
      case AvatarSize.xs:
        return 24.0;
      case AvatarSize.sm:
        return 32.0;
      case AvatarSize.md:
        return 44.0;
      case AvatarSize.lg:
        return 64.0;
      case AvatarSize.xl:
        return 96.0;
    }
  }
}
