import 'dart:math';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_tokens.dart';
import 'app_avatar.dart';
import 'app_status_badge.dart';

// ============================================================
// AppTeamCard — 队伍卡片组件
// 对齐 Web 端 team-card.tsx
// 特点：
// - 封面图（或渐变占位）
// - 玻璃态卡片背景
// - 收藏按钮（带 heartbeat 动画）
// - 左侧状态色条
// - 成员头像叠加 + 进度条
// ============================================================

/// 队伍数据模型
class TeamCardData {
  final String id;
  final String title;
  final String status;
  final String? difficulty;
  final String icon;
  final String date;
  final String time;
  final String duration;
  final int currentMembers;
  final int maxMembers;
  final String? locationName;
  final String? coverImage;
  final TeamMember leader;
  final List<TeamMember> members;
  final bool isFavorited;

  TeamCardData({
    required this.id,
    required this.title,
    required this.status,
    this.difficulty,
    this.icon = '🏔️',
    this.date = '',
    this.time = '',
    this.duration = '',
    this.currentMembers = 0,
    this.maxMembers = 1,
    this.locationName,
    this.coverImage,
    required this.leader,
    this.members = const [],
    this.isFavorited = false,
  });
}

class TeamMember {
  final String id;
  final String name;
  final String? avatar;

  TeamMember({
    required this.id,
    required this.name,
    this.avatar,
  });
}

/// 队伍卡片组件
class AppTeamCard extends StatefulWidget {
  final TeamCardData team;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onFavorite;

  const AppTeamCard({
    super.key,
    required this.team,
    this.onTap,
    this.onFavorite,
  });

  @override
  State<AppTeamCard> createState() => _AppTeamCardState();
}

class _AppTeamCardState extends State<AppTeamCard>
    with SingleTickerProviderStateMixin {
  late bool _favorited;
  late AnimationController _heartController;
  late Animation<double> _heartAnimation;

  @override
  void initState() {
    super.initState();
    _favorited = widget.team.isFavorited;
    _heartController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _heartAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(
        parent: _heartController,
        curve: Curves.elasticOut,
      ),
    );
  }

  @override
  void dispose() {
    _heartController.dispose();
    super.dispose();
  }

  void _handleFavorite() {
    setState(() {
      _favorited = !_favorited;
    });
    _heartController.forward(from: 0);
    widget.onFavorite?.call(_favorited);
  }

  @override
  Widget build(BuildContext context) {
    final approvedMembers =
        widget.team.members.where((m) => m.id != widget.team.leader.id).toList();
    final visibleMembers = approvedMembers.take(4).toList();
    final extraCount =
        max(0, widget.team.currentMembers - 1 - visibleMembers.length);
    final fillRatio =
        (widget.team.currentMembers / widget.team.maxMembers).clamp(0.0, 1.0);
    final isFull = widget.team.currentMembers >= widget.team.maxMembers;

    // 格式化日期
    String formattedDate = '';
    try {
      final date = DateTime.parse(widget.team.date);
      formattedDate = DateFormat('M 月 d 日 E', 'zh_CN').format(date);
    } catch (_) {
      formattedDate = widget.team.date;
    }

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppTokens.bgSurface,
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
          border: Border.all(color: AppTokens.borderDefault, width: 1),
          boxShadow: [
            BoxShadow(
              color: const Color(0x0A1A2332),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 封面图区域
            _buildCoverImage(),

            // 收藏按钮
            Positioned(
              top: 12,
              right: 12,
              child: _buildFavoriteButton(),
            ),

            // 卡片内容区
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 状态 + 难度徽章
                  _buildBadgesRow(),

                  const SizedBox(height: 12),

                  // 队伍标题
                  _buildTitle(),

                  const SizedBox(height: 12),

                  // 关键信息
                  _buildInfoRows(formattedDate),

                  const SizedBox(height: 12),

                  // 人数进度条
                  _buildProgressBar(fillRatio, isFull),

                  const SizedBox(height: 12),

                  // 底部：队长 + 成员头像
                  _buildBottomRow(visibleMembers, extraCount),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCoverImage() {
    final hasImage =
        widget.team.coverImage != null && widget.team.coverImage!.isNotEmpty;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(
        top: Radius.circular(AppTokens.radiusL),
      ),
      child: Container(
        height: 160,
        width: double.infinity,
        color: AppTokens.bgSurfaceElevated,
        child: hasImage
            ? Image.network(
                widget.team.coverImage!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _buildPlaceholder(),
              )
            : _buildPlaceholder(),
      ),
    );
  }

  Widget _buildPlaceholder() {
    // 无封面时展示品牌渐变占位
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: widget.team.status == 'completed' ||
                  widget.team.status == 'cancelled'
              ? [
                  const Color(0xFFf2ede7),
                  const Color(0xFFe8e0d7),
                ]
              : [
                  const Color(0xFF92400E),
                  const Color(0xFFD97706),
                  const Color(0xFFF59E0B),
                  const Color(0xFFFCD34D),
                ],
        ),
      ),
      child: const Icon(
        Icons.landscape_outlined,
        color: Colors.white54,
        size: 48,
      ),
    );
  }

  Widget _buildFavoriteButton() {
    return ScaleTransition(
      scale: _heartAnimation,
      child: GestureDetector(
        onTap: _handleFavorite,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(
            _favorited ? Icons.favorite : Icons.favorite_border,
            color: _favorited ? AppTokens.brandAccent : AppTokens.textTertiary,
            size: 20,
          ),
        ),
      ),
    );
  }

  Widget _buildBadgesRow() {
    return Row(
      children: [
        AppStatusBadge(
          status: widget.team.status,
          showDot: true,
          size: 0.9,
        ),
        if (widget.team.difficulty != null) ...[
          const SizedBox(width: 8),
          AppDifficultyBadge(
            difficulty: widget.team.difficulty!,
            size: 0.9,
          ),
        ],
        const Spacer(),
        Text(
          widget.team.icon,
          style: const TextStyle(fontSize: 20),
        ),
      ],
    );
  }

  Widget _buildTitle() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.team.title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: AppTokens.textPrimary,
            height: 1.4,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        if (widget.team.locationName != null &&
            widget.team.locationName!.isNotEmpty) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(
                Icons.place_outlined,
                size: 14,
                color: AppTokens.textTertiary,
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  widget.team.locationName!,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTokens.textTertiary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildInfoRows(String formattedDate) {
    return Column(
      children: [
        Row(
          children: [
            _infoRow(
              Icons.calendar_today_outlined,
              formattedDate,
            ),
            const SizedBox(width: 16),
            _infoRow(
              Icons.access_time_outlined,
              widget.team.time,
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _infoRow(
              Icons.people_outline,
              '${widget.team.currentMembers}/${widget.team.maxMembers}人',
              accent: widget.team.currentMembers >= widget.team.maxMembers,
            ),
            if (widget.team.duration.isNotEmpty) ...[
              const SizedBox(width: 16),
              _infoRow(
                Icons.timer_outlined,
                widget.team.duration,
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _infoRow(IconData icon, String text, {bool accent = false}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: accent ? AppTokens.brandPrimary : AppTokens.textTertiary,
        ),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(
            fontSize: 12,
            color: accent ? AppTokens.brandPrimary : AppTokens.textSecondary,
            fontWeight: accent ? FontWeight.w600 : null,
          ),
        ),
      ],
    );
  }

  Widget _buildProgressBar(double fillRatio, bool isFull) {
    return Container(
      height: 6,
      decoration: BoxDecoration(
        color: AppTokens.bgSurfaceElevated,
        borderRadius: BorderRadius.circular(AppTokens.radiusFull),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTokens.radiusFull),
        child: FractionallySizedBox(
          widthFactor: fillRatio,
          child: Container(
            height: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isFull
                    ? [
                        const Color(0xFFD97706),
                        const Color(0xFFB45309),
                      ]
                    : [
                        const Color(0xFFD97706),
                        const Color(0xFFF59E0B),
                      ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomRow(
      List<TeamMember> visibleMembers, int extraCount) {
    final leaderName = widget.team.leader.name;

    return Row(
      children: [
        // 队长信息
        Expanded(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppAvatar(
                name: leaderName,
                imageUrl: widget.team.leader.avatar,
                size: AvatarSize.sm,
              ),
              const SizedBox(width: 8),
              Flexible(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTokens.textTertiary,
                    ),
                    children: [
                      TextSpan(
                        text: leaderName,
                        style: const TextStyle(
                          color: AppTokens.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const TextSpan(text: ' 发起'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // 成员头像叠加
        if (visibleMembers.isNotEmpty) ...[
          SizedBox(
            width: visibleMembers.length * 14 + 4,
            child: Stack(
              clipBehavior: Clip.none,
              children: visibleMembers.asMap().entries.map((entry) {
                final index = entry.key;
                final member = entry.value;
                return Positioned(
                  left: index * 14.0,
                  child: AppAvatar(
                    name: member.name,
                    imageUrl: member.avatar,
                    size: AvatarSize.xs,
                  ),
                );
              }).toList(),
            ),
          ),
          if (extraCount > 0) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 6,
                vertical: 2,
              ),
              decoration: BoxDecoration(
                color: AppTokens.bgSurfaceElevated,
                borderRadius: BorderRadius.circular(AppTokens.radiusFull),
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: Text(
                '+$extraCount',
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTokens.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],

        const SizedBox(width: 8),

        // 箭头
        const Icon(
          Icons.chevron_right_rounded,
          size: 20,
          color: AppTokens.textTertiary,
        ),
      ],
    );
  }
}
