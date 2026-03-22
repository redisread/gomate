import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/teams_api.dart';
import '../../../core/models/team.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

// ============================================================
// 主页面
// ============================================================

/// 我的队伍页面
/// TabBar：我创建的 / 我加入的 / 我的申请
class MyTeamsScreen extends ConsumerStatefulWidget {
  const MyTeamsScreen({super.key});

  @override
  ConsumerState<MyTeamsScreen> createState() => _MyTeamsScreenState();
}

class _MyTeamsScreenState extends ConsumerState<MyTeamsScreen>
    with SingleTickerProviderStateMixin {
  final _teamsApi = TeamsApi();
  late final TabController _tabController;

  List<TeamModel> _createdTeams = [];
  List<_JoinedTeamItem> _joinedTeams = [];
  List<_JoinedTeamItem> _applications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// 加载所有队伍数据：我创建的 / 我加入的 / 我的申请
  Future<void> _loadData() async {
    final currentUserId =
        ref.read(authProvider).valueOrNull?.user?.id;
    if (currentUserId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      // 获取所有队伍，客户端分类
      final allTeams = await _teamsApi.getTeams(limit: 100);

      // 我创建的：leaderId == currentUserId
      final created =
          allTeams.where((t) => t.leaderId == currentUserId).toList();

      // 我加入的 / 我的申请：并行调用 getMyStatus
      // 只对非我创建的队伍查询状态，降低请求量
      final otherTeams =
          allTeams.where((t) => t.leaderId != currentUserId).toList();

      final statusFutures = otherTeams
          .map((t) => _teamsApi.getMyStatus(t.id).then((s) => (t, s)))
          .toList();
      final statuses = await Future.wait(statusFutures, eagerError: false);

      final joined = <_JoinedTeamItem>[];
      final apps = <_JoinedTeamItem>[];

      for (final result in statuses) {
        final team = result.$1;
        final status = result.$2;
        if (status.role == MyTeamRole.member) {
          final memberStatus = status.memberStatus;
          if (memberStatus == 'approved' || memberStatus == 'leave_pending') {
            joined.add(_JoinedTeamItem(
              team: team,
              memberStatus: TeamMemberStatus.fromString(memberStatus!),
            ));
          } else if (memberStatus == 'pending' ||
              memberStatus == 'rejected') {
            apps.add(_JoinedTeamItem(
              team: team,
              memberStatus: TeamMemberStatus.fromString(memberStatus!),
              appliedAt: team.createdAt,
            ));
          }
        }
      }

      if (mounted) {
        setState(() {
          _createdTeams = created;
          _joinedTeams = joined;
          _applications = apps;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        title: const Text('我的队伍'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '我创建的'),
            Tab(text: '我加入的'),
            Tab(text: '我的申请'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _CreatedTeamsTab(teams: _createdTeams),
          _JoinedTeamsTab(joinedTeams: _joinedTeams),
          _ApplicationsTab(applications: _applications),
        ],
      ),
    );
  }
}

// ============================================================
// 内部数据结构
// ============================================================

/// 已加入/申请中队伍（含我的成员状态）
class _JoinedTeamItem {
  final TeamModel team;
  final TeamMemberStatus memberStatus;
  final DateTime? appliedAt;

  const _JoinedTeamItem({
    required this.team,
    required this.memberStatus,
    this.appliedAt,
  });
}

// ============================================================
// Tab 子组件
// ============================================================

/// 我创建的队伍 Tab
class _CreatedTeamsTab extends StatelessWidget {
  final List<TeamModel> teams;

  const _CreatedTeamsTab({required this.teams});

  @override
  Widget build(BuildContext context) {
    if (teams.isEmpty) {
      return const Center(
        child: Text(
          '你还没有创建过队伍',
          style: TextStyle(color: AppTokens.textSecondary),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: teams.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, index) => _TeamCardItem(
        team: teams[index],
        trailing: _buildManageButton(context, teams[index]),
      ),
    );
  }

  Widget _buildManageButton(BuildContext context, TeamModel team) {
    return TextButton(
      onPressed: () => context.push('/teams/${team.id}/manage'),
      child: const Text('管理', style: TextStyle(color: AppTokens.brandPrimary)),
    );
  }
}

/// 我加入的队伍 Tab
class _JoinedTeamsTab extends StatelessWidget {
  final List<_JoinedTeamItem> joinedTeams;

  const _JoinedTeamsTab({required this.joinedTeams});

  @override
  Widget build(BuildContext context) {
    if (joinedTeams.isEmpty) {
      return const Center(
        child: Text(
          '你还没有加入任何队伍',
          style: TextStyle(color: AppTokens.textSecondary),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: joinedTeams.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, index) {
        final item = joinedTeams[index];
        return _TeamCardItem(
          team: item.team,
          trailing: _MemberStatusBadge(status: item.memberStatus),
        );
      },
    );
  }
}

/// 我的申请 Tab
class _ApplicationsTab extends StatelessWidget {
  final List<_JoinedTeamItem> applications;

  const _ApplicationsTab({required this.applications});

  @override
  Widget build(BuildContext context) {
    if (applications.isEmpty) {
      return const Center(
        child: Text(
          '暂无申请记录',
          style: TextStyle(color: AppTokens.textSecondary),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: applications.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, index) {
        final app = applications[index];
        return _TeamCardItem(
          team: app.team,
          trailing: _ApplicationStatusBadge(status: app.memberStatus),
          subtitle: app.appliedAt != null
              ? '申请时间：${_formatDate(app.appliedAt!)}'
              : null,
        );
      },
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.month}/${dt.day} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

// ============================================================
// 共用子组件
// ============================================================

/// 队伍卡片条目
class _TeamCardItem extends StatelessWidget {
  final TeamModel team;
  final Widget? trailing;
  final String? subtitle;

  const _TeamCardItem({
    required this.team,
    this.trailing,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/teams/${team.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTokens.bgSurface,
          border: Border.all(color: AppTokens.borderDefault),
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 队伍图标
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppTokens.brandPrimaryLight,
                borderRadius: BorderRadius.circular(AppTokens.radiusS),
              ),
              child: Center(
                child: Text(
                  team.icon,
                  style: const TextStyle(fontSize: 24),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // 队伍信息
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    team.title,
                    style: const TextStyle(
                      color: AppTokens.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 12, color: AppTokens.textTertiary),
                      const SizedBox(width: 4),
                      Text(
                        '${team.date} ${team.time}',
                        style: const TextStyle(
                          color: AppTokens.textTertiary,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Icon(Icons.people_outlined,
                          size: 12, color: AppTokens.textTertiary),
                      const SizedBox(width: 4),
                      Text(
                        '${team.approvedMemberCount}/${team.maxMembers}',
                        style: const TextStyle(
                          color: AppTokens.textTertiary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        color: AppTokens.textTertiary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // 操作区域或状态标签
            if (trailing != null) ...[
              const SizedBox(width: 8),
              trailing!,
            ],
          ],
        ),
      ),
    );
  }
}

/// 成员状态角标（已加入 / 退出审核中）
class _MemberStatusBadge extends StatelessWidget {
  final TeamMemberStatus status;

  const _MemberStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color, bgColor) = switch (status) {
      TeamMemberStatus.approved =>
        ('已加入', AppTokens.semanticSuccess, const Color(0xFFDCFCE7)),
      TeamMemberStatus.leavePending => (
          '退出审核中',
          const Color(0xFFD97706),
          const Color(0xFFFEF3C7)
        ),
      TeamMemberStatus.pending => (
          '审核中',
          const Color(0xFFD97706),
          const Color(0xFFFEF3C7)
        ),
      TeamMemberStatus.rejected =>
        ('已拒绝', AppTokens.semanticError, const Color(0xFFFEE2E2)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// 申请状态角标
class _ApplicationStatusBadge extends StatelessWidget {
  final TeamMemberStatus status;

  const _ApplicationStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color, bgColor) = switch (status) {
      TeamMemberStatus.pending => (
          '审核中',
          const Color(0xFFD97706),
          const Color(0xFFFEF3C7)
        ),
      TeamMemberStatus.approved =>
        ('已通过', AppTokens.semanticSuccess, const Color(0xFFDCFCE7)),
      TeamMemberStatus.rejected =>
        ('已拒绝', AppTokens.semanticError, const Color(0xFFFEE2E2)),
      TeamMemberStatus.leavePending => (
          '退出审核中',
          const Color(0xFFD97706),
          const Color(0xFFFEF3C7)
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
