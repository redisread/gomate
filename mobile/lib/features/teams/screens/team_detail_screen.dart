import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/teams_api.dart';
import '../../../core/models/team.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_theme.dart';

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

  /// 申请加入
  Future<void> _handleJoin() async {
    setState(() => _isActioning = true);
    try {
      await _teamsApi.joinTeam(widget.teamId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('申请已提交，等待领队审核')),
        );
        _loadTeam();
      }
    } catch (e) {
      if (mounted) {
        context.go('/login');
      }
    } finally {
      if (mounted) setState(() => _isActioning = false);
    }
  }

  /// 取消申请
  Future<void> _handleCancelJoin() async {
    setState(() => _isActioning = true);
    try {
      // TODO(Agent-C): 接入取消申请 API
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
            child: const Text('确定', style: TextStyle(color: AppColors.error)),
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
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
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
                    color: AppColors.brandMuted,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(team.icon,
                        style: const TextStyle(fontSize: 32)),
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
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.brandMuted,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          team.status.label,
                          style: const TextStyle(
                            color: AppColors.brand,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
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
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Text(
                team.description!,
                style: const TextStyle(fontSize: 15, height: 1.6),
              ),
            ],

            // 入队要求
            if (team.requirements.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text(
                '入队要求',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
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
                              color: AppColors.brand,
                              fontWeight: FontWeight.bold)),
                      Expanded(
                        child: Text(req,
                            style: const TextStyle(fontSize: 14)),
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
                    fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              // TODO(Agent-C): 接入真实成员列表数据，替换此 mock
              // 领队信息展示（含「队长」角标）
              if (team.leader != null)
                _MemberAvatarItem(
                  user: team.leader!,
                  isLeader: true,
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

  /// 队长底部操作栏：「管理队伍」蓝色按钮
  Widget _buildLeaderBottomBar(BuildContext context, TeamModel team) {
    return ElevatedButton(
      onPressed: () => context.push('/teams/${team.id}/manage'),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        ),
      ),
      child: const Text('管理队伍', style: TextStyle(fontSize: 16)),
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

    return ElevatedButton(
      onPressed: canJoin && !_isActioning ? _handleJoin : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.success,
        foregroundColor: Colors.white,
        disabledBackgroundColor: AppColors.border,
        disabledForegroundColor: AppColors.textSecondary,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        ),
      ),
      child: _isActioning
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white),
            )
          : Text(
              canJoin ? '申请加入' : disabledText,
              style: const TextStyle(fontSize: 16),
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
                color: const Color(0xFFFEF3C7),
                borderRadius:
                    BorderRadius.circular(AppTheme.radiusMedium),
                border: Border.all(color: const Color(0xFFF59E0B)),
              ),
              child: const Center(
                child: Text(
                  '申请审核中',
                  style: TextStyle(
                    color: Color(0xFFD97706),
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
                style: TextStyle(color: AppColors.textSecondary),
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
                color: const Color(0xFFDCFCE7),
                borderRadius:
                    BorderRadius.circular(AppTheme.radiusMedium),
                border: Border.all(color: AppColors.success),
              ),
              child: const Center(
                child: Text(
                  '已加入 ✓',
                  style: TextStyle(
                    color: AppColors.success,
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
                style: TextStyle(color: AppColors.textSecondary),
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
                color: const Color(0xFFFEE2E2),
                borderRadius:
                    BorderRadius.circular(AppTheme.radiusMedium),
                border: Border.all(color: AppColors.error),
              ),
              child: const Center(
                child: Text(
                  '申请被拒绝',
                  style: TextStyle(
                    color: AppColors.error,
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
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(AppTheme.radiusMedium),
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
            color: const Color(0xFFFEF3C7),
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            border: Border.all(color: const Color(0xFFF59E0B)),
          ),
          child: const Center(
            child: Text(
              '退出申请审核中',
              style: TextStyle(
                color: Color(0xFFD97706),
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        );
    }
  }
}

/// 成员头像条目（显示头像 + 昵称，队长带角标）
class _MemberAvatarItem extends StatelessWidget {
  final dynamic user; // UserModel
  final bool isLeader;

  const _MemberAvatarItem({
    required this.user,
    this.isLeader = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          // 头像
          Stack(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.brandMuted,
                backgroundImage:
                    user.image != null ? NetworkImage(user.image!) : null,
                child: user.image == null
                    ? Text(
                        user.displayName.isNotEmpty
                            ? user.displayName[0]
                            : '?',
                        style: const TextStyle(
                          color: AppColors.brand,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
              // 队长角标
              if (isLeader)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.brand,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      '队长',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 10),
          Text(
            user.displayName,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
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
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Text(
            '$label：',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
          ),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}
