import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/teams_api.dart';
import '../../../core/models/team.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_status_badge.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/share_poster_widget.dart';
import '../../../shared/widgets/app_shimmer.dart';
import 'join_team_bottom_sheet.dart';

/// 队伍详情页面
class TeamDetailScreen extends ConsumerStatefulWidget {
  final String teamId;

  const TeamDetailScreen({super.key, required this.teamId});

  @override
  ConsumerState<TeamDetailScreen> createState() => _TeamDetailScreenState();
}

class _TeamDetailScreenState extends ConsumerState<TeamDetailScreen> {
  final _teamsApi = TeamsApi();
  TeamModel? _team;
  bool _isLoading = true;
  bool _isActioning = false;

  /// 当前用户在队伍中的状态（初始为访客）
  MyTeamStatus _myStatus = const MyTeamStatus(role: MyTeamRole.visitor);

  @override
  void initState() {
    super.initState();
    _loadTeam();
  }

  Future<void> _loadTeam() async {
    try {
      // 并行加载队伍详情和当前用户状态
      final authState = ref.read(authProvider).valueOrNull;
      final isLoggedIn = authState?.isLoggedIn ?? false;

      final futures = <Future>[
        _teamsApi.getTeam(widget.teamId),
        if (isLoggedIn) _teamsApi.getMyStatus(widget.teamId),
      ];
      final results = await Future.wait(futures);

      if (mounted) {
        setState(() {
          _team = results[0] as TeamModel;
          if (isLoggedIn && results.length > 1) {
            _myStatus = results[1] as MyTeamStatus;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// 分享队伍
  Future<void> _shareTeam(TeamModel team) async {
    // locationId 用于显示，地点名称需要从 API 获取或直接显示 ID
    final locationDisplay = team.locationId;
    await SharePosterWidget.show(
      context,
      title: team.title,
      locationName: locationDisplay,
      description: team.description,
      leaderName: team.leader?.displayName,
      membersInfo: '${team.approvedMemberCount}/${team.maxMembers} 人',
      date: team.date,
      time: team.time,
      url: 'https://gomate.live/teams/${team.id}',
    );
  }

  /// 申请加入（带留言输入）
  Future<void> _handleJoin() async {
    // 显示留言输入 Bottom Sheet
    await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => JoinTeamBottomSheet(
        onJoin: (message) async {
          setState(() => _isActioning = true);
          try {
            await _teamsApi.joinTeam(widget.teamId, message: message);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('申请已提交，等待领队审核')),
              );
              _loadTeam();
            }
            return 'success';
          } catch (e) {
            if (mounted) {
              context.go('/login');
            }
            return null;
          } finally {
            if (mounted) setState(() => _isActioning = false);
          }
        },
      ),
    );
  }

  /// 取消申请
  Future<void> _handleCancelJoin() async {
    setState(() => _isActioning = true);
    try {
      await _teamsApi.leaveTeam(widget.teamId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已取消申请')),
        );
        _loadTeam();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('操作失败，请重试')),
        );
      }
    } finally {
      if (mounted) setState(() => _isActioning = false);
    }
  }

  /// 申请退出
  Future<void> _handleLeave() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('申请退出'),
        content: const Text('确定要申请退出队伍吗？需要领队批准。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('确定',
                style: TextStyle(color: AppTokens.semanticError)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _isActioning = true);
    try {
      await _teamsApi.requestLeave(widget.teamId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('退出申请已提交，等待领队审核')),
        );
        _loadTeam();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('操作失败，请重试')),
        );
      }
    } finally {
      if (mounted) setState(() => _isActioning = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: TeamDetailShimmer(),
      );
    }

    if (_team == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('队伍不存在')),
      );
    }

    final team = _team!;
    final authState = ref.watch(authProvider).valueOrNull;
    final currentUserId = authState?.user?.id;

    // 判断是否为队长（与登录用户 ID 对比）
    final isLeader = currentUserId != null && currentUserId == team.leaderId;

    return Scaffold(
      appBar: AppBar(
        title: Text(team.title),
        actions: [
          // 分享按钮
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () => _shareTeam(team),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 队伍图标和状态
            Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppTokens.brandPrimaryLight,
                    borderRadius: BorderRadius.circular(AppTokens.radiusM),
                  ),
                  child: Center(
                    child:
                        Text(team.icon, style: const TextStyle(fontSize: 32)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        team.title,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: AppTokens.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      // 使用新的状态徽章组件
                      AppStatusBadge(
                        status: team.status.name,
                        showDot: team.status == TeamStatus.recruiting,
                        size: 1.0,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // 基本信息
            _InfoRow(
              icon: Icons.people_outlined,
              label: '人数',
              value: '${team.approvedMemberCount}/${team.maxMembers} 人',
            ),
            _InfoRow(
              icon: Icons.calendar_today_outlined,
              label: '活动时间',
              value: '${team.date} ${team.time}',
            ),
            _InfoRow(
              icon: Icons.schedule_outlined,
              label: '活动时长',
              value: '约 ${(team.durationMin / 60).toStringAsFixed(1)} 小时',
            ),

            if (team.leader != null) ...[
              const SizedBox(height: 4),
              _InfoRow(
                icon: Icons.person_outlined,
                label: '领队',
                value: team.leader!.displayName,
              ),
            ],

            const SizedBox(height: 20),
            const Divider(),

            // 活动描述
            if (team.description != null) ...[
              const SizedBox(height: 16),
              const Text(
                '活动介绍',
                style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: AppTokens.textPrimary),
              ),
              const SizedBox(height: 10),
              Text(
                team.description!,
                style: const TextStyle(
                    fontSize: 15, height: 1.6, color: AppTokens.textSecondary),
              ),
            ],

            // 入队要求
            if (team.requirements.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text(
                '入队要求',
                style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: AppTokens.textPrimary),
              ),
              const SizedBox(height: 10),
              ...team.requirements.map(
                (req) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ',
                          style: TextStyle(
                              color: AppTokens.brandPrimary,
                              fontWeight: FontWeight.bold)),
                      Expanded(
                        child: Text(req,
                            style: const TextStyle(
                                fontSize: 14, color: AppTokens.textSecondary)),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // 成员列表区域
            if (team.currentMembers > 0) ...[
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                '队伍成员（${team.approvedMemberCount} 人）',
                style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: AppTokens.textPrimary),
              ),
              const SizedBox(height: 12),
              // 领队信息展示（含「队长」角标）
              if (team.leader != null)
                AppAvatar.small(
                  name: team.leader!.displayName,
                  imageUrl: team.leader!.image,
                ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 54),
                child: Row(
                  children: [
                    Text(
                      team.leader!.displayName,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTokens.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTokens.brandPrimary,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        '队长',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 80),
          ],
        ),
      ),

      // 底部操作区：根据角色和状态差异化显示
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: isLeader
              ? _buildLeaderBottomBar(context, team)
              : _buildMemberBottomBar(context, team),
        ),
      ),
    );
  }

  /// 队长底部操作栏：「编辑队伍」+「管理队伍」按钮
  Widget _buildLeaderBottomBar(BuildContext context, TeamModel team) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              color: AppTokens.bgSurface,
              border: Border.all(color: AppTokens.brandPrimary),
              borderRadius: BorderRadius.circular(AppTokens.radiusM),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                onTap: () => context.push('/teams/${team.id}/edit'),
                child: const Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.edit_outlined,
                          color: AppTokens.brandPrimary, size: 18),
                      SizedBox(width: 6),
                      Text(
                        '编辑队伍',
                        style: TextStyle(
                          color: AppTokens.brandPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              gradient: AppTokens.gradientBrand,
              borderRadius: BorderRadius.circular(AppTokens.radiusM),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                onTap: () => context.push('/teams/${team.id}/manage'),
                child: const Center(
                  child: Text(
                    '管理队伍',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// 非队长底部操作栏：根据 _myStatus 差异化显示
  Widget _buildMemberBottomBar(BuildContext context, TeamModel team) {
    switch (_myStatus.role) {
      case MyTeamRole.visitor:
        return _buildVisitorBottomBar(team);
      case MyTeamRole.member:
        final memberStatus = _myStatus.memberStatus != null
            ? TeamMemberStatus.fromString(_myStatus.memberStatus!)
            : TeamMemberStatus.pending;
        return _buildApplicantBottomBar(memberStatus);
      case MyTeamRole.leader:
        // 不应走到此分支（队长走 isLeader 判断），防御性处理
        return const SizedBox.shrink();
    }
  }

  /// 访客底部操作栏
  Widget _buildVisitorBottomBar(TeamModel team) {
    final canJoin = team.status == TeamStatus.recruiting && team.hasVacancy;
    final disabledText = _getDisabledJoinText(team);

    return Container(
      width: double.infinity,
      height: 48,
      decoration: BoxDecoration(
        gradient: canJoin ? AppTokens.gradientBrand : null,
        color: canJoin ? null : AppTokens.borderDefault,
        borderRadius: BorderRadius.circular(AppTokens.radiusM),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          onTap: canJoin && !_isActioning ? _handleJoin : null,
          child: Center(
            child: _isActioning
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : Text(
                    canJoin ? '申请加入' : disabledText,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: canJoin ? Colors.white : AppTokens.textTertiary,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  /// 获取访客不可加入时的按钮文案
  String _getDisabledJoinText(TeamModel team) {
    switch (team.status) {
      case TeamStatus.recruiting:
        return '队伍已满';
      case TeamStatus.full:
        return '队伍已满';
      case TeamStatus.formed:
        return '已组建';
      case TeamStatus.completed:
        return '活动已结束';
      case TeamStatus.cancelled:
        return '队伍已取消';
    }
  }

  /// 申请人/成员底部操作栏（根据 memberStatus 显示不同状态）
  Widget _buildApplicantBottomBar(TeamMemberStatus memberStatus) {
    switch (memberStatus) {
      case TeamMemberStatus.pending:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 待审核状态 chip
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: AppTokens.brandPrimaryLight,
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                border: Border.all(color: AppTokens.brandPrimary),
              ),
              child: const Center(
                child: Text(
                  '申请审核中',
                  style: TextStyle(
                    color: AppTokens.brandPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            TextButton(
              onPressed: _isActioning ? null : _handleCancelJoin,
              child: const Text(
                '取消申请',
                style: TextStyle(color: AppTokens.textSecondary),
              ),
            ),
          ],
        );

      case TeamMemberStatus.approved:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 已加入状态 chip
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: AppTokens.brandPrimaryLight,
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                border: Border.all(color: AppTokens.semanticSuccess),
              ),
              child: const Center(
                child: Text(
                  '已加入 ✓',
                  style: TextStyle(
                    color: AppTokens.semanticSuccess,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            TextButton(
              onPressed: _isActioning ? null : _handleLeave,
              child: const Text(
                '申请退出',
                style: TextStyle(color: AppTokens.textSecondary),
              ),
            ),
          ],
        );

      case TeamMemberStatus.rejected:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 拒绝提示
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: AppTokens.brandPrimaryLight,
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                border: Border.all(color: AppTokens.semanticError),
              ),
              child: const Center(
                child: Text(
                  '申请被拒绝',
                  style: TextStyle(
                    color: AppTokens.semanticError,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isActioning ? null : _handleJoin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTokens.semanticSuccess,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTokens.radiusM),
                  ),
                ),
                child: const Text('重新申请', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        );

      case TeamMemberStatus.leavePending:
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: AppTokens.brandPrimaryLight,
            borderRadius: BorderRadius.circular(AppTokens.radiusM),
            border: Border.all(color: AppTokens.brandPrimary),
          ),
          child: const Center(
            child: Text(
              '退出申请审核中',
              style: TextStyle(
                color: AppTokens.brandPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        );
    }
  }
}

/// 信息行组件
class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTokens.textSecondary),
          const SizedBox(width: 8),
          Text(
            '$label：',
            style:
                const TextStyle(color: AppTokens.textSecondary, fontSize: 14),
          ),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

/// 申请加入留言对话框
class _JoinMessageDialog extends StatefulWidget {
  @override
  State<_JoinMessageDialog> createState() => _JoinMessageDialogState();
}

class _JoinMessageDialogState extends State<_JoinMessageDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('申请加入'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '给队长留言（可选）',
            style: TextStyle(
              color: AppTokens.textSecondary,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            maxLines: 3,
            maxLength: 100,
            decoration: InputDecoration(
              hintText: '例如：我有3年徒步经验，装备齐全...',
              hintStyle: TextStyle(color: AppTokens.textTertiary, fontSize: 14),
              filled: true,
              fillColor: AppTokens.bgSurface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: AppTokens.borderDefault),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: AppTokens.borderDefault),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: AppTokens.brandPrimary),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _controller.text.trim()),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTokens.brandPrimary,
            foregroundColor: Colors.white,
          ),
          child: const Text('提交申请'),
        ),
      ],
    );
  }
}
