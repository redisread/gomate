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

/// 队伍管理页面（仅队长可访问）
/// 提供 TabBar：待审批 / 退出申请 / 成员列表
class TeamManageScreen extends ConsumerStatefulWidget {
  final String teamId;

  const TeamManageScreen({super.key, required this.teamId});

  @override
  ConsumerState<TeamManageScreen> createState() => _TeamManageScreenState();
}

class _TeamManageScreenState extends ConsumerState<TeamManageScreen>
    with SingleTickerProviderStateMixin {
  final _teamsApi = TeamsApi();
  late final TabController _tabController;

  /// 待审批加入申请
  List<TeamMemberApplication> _pendingMembers = [];

  /// 退出申请
  List<TeamMemberApplication> _leavePendingMembers = [];

  /// 已批准成员
  List<TeamMemberApplication> _approvedMembers = [];

  bool _isLoading = true;
  bool _isLeader = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _checkPermissionAndLoad();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// 检查权限并加载数据
  Future<void> _checkPermissionAndLoad() async {
    try {
      // 获取当前用户ID
      final authState = ref.read(authProvider).valueOrNull;
      final currentUserId = authState?.user?.id;
      
      if (currentUserId == null) {
        // 未登录用户重定向到登录页
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('请先登录')),
          );
          context.go('/login');
        }
        return;
      }
      
      // 获取队伍详情以验证是否为队长
      final team = await _teamsApi.getTeam(widget.teamId);
      _isLeader = currentUserId == team.leaderId;
      
      if (!_isLeader) {
        // 非队长用户显示错误并返回
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('只有队长可以管理队伍')),
          );
          context.pop();
        }
        return;
      }
      
      // 是队长，加载成员申请数据
      await _loadMembersData();
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('加载失败，请重试')),
        );
        context.pop();
      }
    }
  }

  /// 加载所有成员申请数据
  Future<void> _loadMembersData() async {
    try {
      final all = await _teamsApi.getApplications(widget.teamId);
      if (mounted) {
        setState(() {
          _pendingMembers =
              all.where((m) => m.status == 'pending').toList();
          _leavePendingMembers =
              all.where((m) => m.status == 'leave_pending').toList();
          _approvedMembers =
              all.where((m) => m.status == 'approved').toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// 批准加入申请
  Future<void> _approveJoin(String userId) async {
    try {
      await _teamsApi.approveApplication(widget.teamId, userId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已批准加入')),
        );
        _loadMembersData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('操作失败，请重试')),
        );
      }
    }
  }

  /// 拒绝加入申请
  Future<void> _rejectJoin(String userId) async {
    try {
      await _teamsApi.rejectApplication(widget.teamId, userId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已拒绝申请')),
        );
        _loadMembersData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('操作失败，请重试')),
        );
      }
    }
  }

  /// 批准退出申请
  Future<void> _approveLeave(String userId) async {
    try {
      await _teamsApi.approveLeave(widget.teamId, userId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已批准退出')),
        );
        _loadMembersData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('操作失败，请重试')),
        );
      }
    }
  }

  /// 拒绝退出申请
  Future<void> _rejectLeave(String userId) async {
    try {
      await _teamsApi.rejectLeave(widget.teamId, userId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已拒绝退出申请')),
        );
        _loadMembersData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('操作失败，请重试')),
        );
      }
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
        title: const Text('管理队伍'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('待审批'),
                  if (_pendingMembers.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    _BadgeCount(count: _pendingMembers.length),
                  ],
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('退出申请'),
                  if (_leavePendingMembers.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    _BadgeCount(count: _leavePendingMembers.length),
                  ],
                ],
              ),
            ),
            const Tab(text: '成员列表'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _PendingJoinTab(
            members: _pendingMembers,
            onApprove: (m) => _approveJoin(m.userId),
            onReject: (m) => _rejectJoin(m.userId),
          ),
          _PendingLeaveTab(
            members: _leavePendingMembers,
            onApprove: (m) => _approveLeave(m.userId),
            onReject: (m) => _rejectLeave(m.userId),
          ),
          _ApprovedMembersTab(members: _approvedMembers),
        ],
      ),
    );
  }
}

// ============================================================
// Tab 子组件
// ============================================================

/// 待审批 Tab
class _PendingJoinTab extends StatelessWidget {
  final List<TeamMemberApplication> members;
  final void Function(TeamMemberApplication) onApprove;
  final void Function(TeamMemberApplication) onReject;

  const _PendingJoinTab({
    required this.members,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) {
      return const Center(
        child: Text(
          '暂无待审批申请',
          style: TextStyle(color: AppTokens.textSecondary),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: members.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final member = members[index];
        return _ApplicantCard(
          member: member,
          actions: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => onReject(member),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTokens.semanticError,
                    side: const BorderSide(color: AppTokens.semanticError),
                  ),
                  child: const Text('拒绝'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => onApprove(member),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTokens.semanticSuccess,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('批准'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// 退出申请 Tab
class _PendingLeaveTab extends StatelessWidget {
  final List<TeamMemberApplication> members;
  final void Function(TeamMemberApplication) onApprove;
  final void Function(TeamMemberApplication) onReject;

  const _PendingLeaveTab({
    required this.members,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) {
      return const Center(
        child: Text(
          '暂无退出申请',
          style: TextStyle(color: AppTokens.textSecondary),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: members.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final member = members[index];
        return _ApplicantCard(
          member: member,
          statusLabel: '申请退出',
          statusColor: const Color(0xFFD97706),
          statusBgColor: const Color(0xFFFEF3C7),
          actions: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => onReject(member),
                  child: const Text('拒绝退出'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => onApprove(member),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD97706),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('批准退出'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// 成员列表 Tab
class _ApprovedMembersTab extends StatelessWidget {
  final List<TeamMemberApplication> members;

  const _ApprovedMembersTab({required this.members});

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) {
      return const Center(
        child: Text(
          '暂无成员',
          style: TextStyle(color: AppTokens.textSecondary),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: members.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final member = members[index];
        return ListTile(
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          leading: CircleAvatar(
            radius: 22,
            backgroundColor: AppTokens.brandPrimaryLight,
            child: Text(
              member.userName.isNotEmpty ? member.userName[0] : '?',
              style: const TextStyle(
                color: AppTokens.brandPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          title: Text(
            member.userName,
            style: const TextStyle(
              color: AppTokens.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
          subtitle: Text(
            '加入于 ${_formatDate(member.createdAt)}',
            style: const TextStyle(
              color: AppTokens.textTertiary,
              fontSize: 12,
            ),
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text(
              '已加入',
              style: TextStyle(
                color: AppTokens.semanticSuccess,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        );
      },
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.month}/${dt.day}';
  }
}

// ============================================================
// 共用子组件
// ============================================================

/// 申请人卡片（待审批 / 退出申请 共用）
class _ApplicantCard extends StatelessWidget {
  final TeamMemberApplication member;
  final Widget actions;
  final String? statusLabel;
  final Color? statusColor;
  final Color? statusBgColor;

  const _ApplicantCard({
    required this.member,
    required this.actions,
    this.statusLabel,
    this.statusColor,
    this.statusBgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTokens.bgSurface,
        border: Border.all(color: AppTokens.borderDefault),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 用户信息行
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppTokens.brandPrimaryLight,
                child: Text(
                  member.userName.isNotEmpty ? member.userName[0] : '?',
                  style: const TextStyle(
                    color: AppTokens.brandPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      member.userName,
                      style: const TextStyle(
                        color: AppTokens.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 2),
                    if (member.wechat != null && member.wechat!.isNotEmpty)
                      Text(
                        '微信: ${member.wechat}',
                        style: const TextStyle(
                          color: AppTokens.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                  ],
                ),
              ),
              // 状态标签（退出申请时显示）
              if (statusLabel != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBgColor ?? AppTokens.brandPrimaryLight,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    statusLabel!,
                    style: TextStyle(
                      color: statusColor ?? AppTokens.brandPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          // 申请时间
          Text(
            '申请时间：${_formatDateTime(member.createdAt)}',
            style: const TextStyle(
              color: AppTokens.textTertiary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 12),
          // 操作按钮
          actions,
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.month}/${dt.day} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

/// 数量角标组件
class _BadgeCount extends StatelessWidget {
  final int count;

  const _BadgeCount({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppTokens.semanticError,
        borderRadius: BorderRadius.circular(AppTokens.radiusS),
      ),
      child: Text(
        count > 99 ? '99+' : '$count',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}