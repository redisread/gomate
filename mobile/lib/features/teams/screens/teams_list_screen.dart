import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/teams_api.dart';
import '../../../core/models/team.dart';
import '../../../shared/theme/app_theme.dart';

/// 队伍列表页面
class TeamsListScreen extends ConsumerStatefulWidget {
  const TeamsListScreen({super.key});

  @override
  ConsumerState<TeamsListScreen> createState() => _TeamsListScreenState();
}

class _TeamsListScreenState extends ConsumerState<TeamsListScreen> {
  final _teamsApi = TeamsApi();
  List<TeamModel> _teams = [];
  bool _isLoading = true;
  String _selectedStatus = 'recruiting';

  @override
  void initState() {
    super.initState();
    _loadTeams();
  }

  Future<void> _loadTeams() async {
    setState(() => _isLoading = true);
    try {
      final data = await _teamsApi.getTeams(status: _selectedStatus, limit: 50);
      if (mounted) {
        setState(() {
          _teams = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textSecondary),
          onPressed: () => context.go('/'),
        ),
        title: const Text(
          '找队伍',
          style: TextStyle(color: AppColors.textPrimary),
        ),
      ),
      body: Column(
        children: [
          // 状态筛选 Tab
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                {'label': '招募中', 'value': 'recruiting'},
                {'label': '已满', 'value': 'full'},
                {'label': '已组建', 'value': 'formed'},
                {'label': '已完成', 'value': 'completed'},
              ].map((item) {
                final isSelected = _selectedStatus == item['value'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(item['label']!),
                    selected: isSelected,
                    onSelected: (_) {
                      setState(() => _selectedStatus = item['value']!);
                      _loadTeams();
                    },
                    backgroundColor: AppColors.cardBackground,
                    selectedColor: AppColors.brandMuted,
                    side: BorderSide(
                      color: isSelected ? AppColors.brand : AppColors.border,
                    ),
                    labelStyle: TextStyle(
                      color: isSelected
                          ? AppColors.brand
                          : AppColors.textSecondary,
                      fontSize: 13,
                    ),
                    checkmarkColor: AppColors.brand,
                    showCheckmark: true,
                  ),
                );
              }).toList(),
            ),
          ),

          // 队伍列表
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.brand),
                  )
                : RefreshIndicator(
                    onRefresh: _loadTeams,
                    color: AppColors.brand,
                    child: _teams.isEmpty
                        ? const Center(
                            child: Text(
                              '暂无队伍',
                              style:
                                  TextStyle(color: AppColors.textSecondary),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _teams.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              return _TeamCard(team: _teams[index]);
                            },
                          ),
                  ),
          ),
        ],
      ),

      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/teams/create'),
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('发布队伍'),
      ),
    );
  }
}

/// 队伍卡片组件
class _TeamCard extends StatelessWidget {
  final TeamModel team;

  const _TeamCard({required this.team});

  @override
  Widget build(BuildContext context) {
    final isRecruiting = team.status == TeamStatus.recruiting;
    return GestureDetector(
      onTap: () => context.push('/teams/${team.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 图标容器
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.brandMuted,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  team.icon,
                  style: const TextStyle(fontSize: 26),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // 信息
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    team.title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (team.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      team.description!,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.people_outlined,
                          size: 14, color: AppColors.textPlaceholder),
                      const SizedBox(width: 4),
                      Text(
                        '${team.approvedMemberCount}/${team.maxMembers} 人',
                        style: const TextStyle(
                            color: AppColors.textPlaceholder, fontSize: 12),
                      ),
                      const SizedBox(width: 12),
                      const Icon(Icons.calendar_today_outlined,
                          size: 14, color: AppColors.textPlaceholder),
                      const SizedBox(width: 4),
                      Text(
                        team.date.length >= 10
                            ? '${team.date.substring(5, 7)}/${team.date.substring(8, 10)}'
                            : team.date,
                        style: const TextStyle(
                            color: AppColors.textPlaceholder, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // 状态标签
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isRecruiting
                    ? AppColors.brandMuted
                    : AppColors.background,
                borderRadius: BorderRadius.circular(4),
                border: isRecruiting
                    ? null
                    : Border.all(color: AppColors.border),
              ),
              child: Text(
                team.status.label,
                style: TextStyle(
                  color: isRecruiting
                      ? AppColors.brand
                      : AppColors.textPlaceholder,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
