import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/teams_api.dart';
import '../../../core/models/team.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_status_badge.dart';

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

  // 搜索
  final _searchController = TextEditingController();
  Timer? _debounceTimer;
  String? _searchQuery;

  // 难度筛选
  final List<String> _selectedDifficulties = [];
  static const _difficultyOptions = [
    ('easy', '简单', Colors.green),
    ('moderate', '中等', Colors.orange),
    ('hard', '困难', Colors.red),
    ('expert', '专家', Colors.purple),
  ];

  @override
  void initState() {
    super.initState();
    _loadTeams();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged() {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      final query = _searchController.text.trim();
      if (query != _searchQuery) {
        setState(() => _searchQuery = query.isEmpty ? null : query);
        _loadTeams();
      }
    });
  }

  Future<void> _loadTeams() async {
    setState(() => _isLoading = true);
    try {
      final data = await _teamsApi.getTeams(
        status: _selectedStatus,
        difficulty: _selectedDifficulties.isEmpty ? null : _selectedDifficulties.join(','),
        q: _searchQuery,
        limit: 50,
      );
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
    return PopScope(
      canPop: true,
      child: Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTokens.textSecondary),
          onPressed: () => context.go('/'),
        ),
        title: const Text(
          '找队伍',
          style: TextStyle(color: AppTokens.textPrimary),
        ),
      ),
      body: Column(
        children: [
          // 搜索栏
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '搜索队伍...',
                hintStyle: const TextStyle(color: AppTokens.textTertiary),
                prefixIcon: const Icon(Icons.search, color: AppTokens.textTertiary),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppTokens.textTertiary),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = null);
                          _loadTeams();
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppTokens.bgSurface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),
          // 难度筛选
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                const Text(
                  '难度：',
                  style: TextStyle(
                    color: AppTokens.textSecondary,
                    fontSize: 13,
                  ),
                ),
                ..._difficultyOptions.map((item) {
                  final isSelected = _selectedDifficulties.contains(item.$1);
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(item.$2),
                      selected: isSelected,
                      onSelected: (_) {
                        setState(() {
                          if (isSelected) {
                            _selectedDifficulties.remove(item.$1);
                          } else {
                            _selectedDifficulties.add(item.$1);
                          }
                        });
                        _loadTeams();
                      },
                      backgroundColor: AppTokens.bgSurface,
                      selectedColor: item.$3.withOpacity(0.2),
                      side: BorderSide(
                        color: isSelected ? item.$3 : AppTokens.borderDefault,
                      ),
                      labelStyle: TextStyle(
                        color: isSelected ? item.$3 : AppTokens.textSecondary,
                        fontSize: 12,
                      ),
                      checkmarkColor: item.$3,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  );
                }),
              ],
            ),
          ),
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
                    backgroundColor: AppTokens.bgSurface,
                    selectedColor: AppTokens.brandPrimaryLight,
                    side: BorderSide(
                      color: isSelected ? AppTokens.brandPrimary : AppTokens.borderDefault,
                    ),
                    labelStyle: TextStyle(
                      color: isSelected
                          ? AppTokens.brandPrimary
                          : AppTokens.textSecondary,
                      fontSize: 13,
                    ),
                    checkmarkColor: AppTokens.brandPrimary,
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
                    child: CircularProgressIndicator(color: AppTokens.brandPrimary),
                  )
                : RefreshIndicator(
                    onRefresh: _loadTeams,
                    color: AppTokens.brandPrimary,
                    child: _teams.isEmpty
                        ? const Center(
                            child: Text(
                              '暂无队伍',
                              style:
                                  TextStyle(color: AppTokens.textSecondary),
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
        backgroundColor: AppTokens.brandPrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('发布队伍'),
      ),
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
    return GestureDetector(
      onTap: () => context.push('/teams/${team.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTokens.bgSurface,
          border: Border.all(color: AppTokens.borderDefault),
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          boxShadow: [
            BoxShadow(
              color: const Color(0x0A1A2332),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 图标容器：温暖琥珀浅色背景
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppTokens.brandPrimaryLight,
                borderRadius: BorderRadius.circular(AppTokens.radiusS),
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
                      color: AppTokens.textPrimary,
                      fontWeight: FontWeight.w600,
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
                        color: AppTokens.textSecondary,
                        fontSize: 13,
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.people_outlined,
                          size: 14, color: AppTokens.textTertiary),
                      const SizedBox(width: 4),
                      Text(
                        '${team.approvedMemberCount}/${team.maxMembers} 人',
                        style: const TextStyle(
                            color: AppTokens.textTertiary, fontSize: 12),
                      ),
                      const SizedBox(width: 12),
                      const Icon(Icons.calendar_today_outlined,
                          size: 14, color: AppTokens.textTertiary),
                      const SizedBox(width: 4),
                      Text(
                        team.date.length >= 10
                            ? '${team.date.substring(5, 7)}/${team.date.substring(8, 10)}'
                            : team.date,
                        style: const TextStyle(
                            color: AppTokens.textTertiary, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // 状态徽章（使用新组件）
            AppStatusBadge(
              status: team.status.name,
              showDot: team.status == TeamStatus.recruiting,
              size: 0.85,
            ),
          ],
        ),
      ),
    );
  }
}
