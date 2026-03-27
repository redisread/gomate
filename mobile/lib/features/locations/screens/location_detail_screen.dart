import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/api/teams_api.dart';
import '../../../core/models/location.dart';
import '../../../core/models/team.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_empty_state.dart';
import '../../../shared/widgets/app_status_badge.dart';
import '../../../shared/widgets/app_team_card.dart';

/// 地点详情页面
class LocationDetailScreen extends ConsumerStatefulWidget {
  final String locationId;

  const LocationDetailScreen({super.key, required this.locationId});

  @override
  ConsumerState<LocationDetailScreen> createState() =>
      _LocationDetailScreenState();
}

class _LocationDetailScreenState extends ConsumerState<LocationDetailScreen> {
  final _locationsApi = LocationsApi();
  final _teamsApi = TeamsApi();
  LocationModel? _location;
  List<TeamModel> _recruitingTeams = [];
  bool _isLoading = true;
  bool _isLoadingTeams = false;
  bool _isFavorited = false;

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    try {
      // 并行加载地点详情和招募队伍
      final results = await Future.wait([
        _locationsApi.getLocation(widget.locationId),
        _loadRecruitingTeams(),
      ]);

      if (mounted) {
        setState(() {
          _location = results[0] as LocationModel;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// 分享地点
  Future<void> _shareLocation() async {
    if (_location == null) return;
    final location = _location!;
    final url = 'https://gomate.live/locations/${location.id}';
    final text = '''🏔️ ${location.name}
${location.subtitle ?? ''}

📍 ${location.cityName ?? '深圳'}

$url''';    await Share.share(text, subject: location.name);
  }
  Future<void> _loadRecruitingTeams() async {
    setState(() => _isLoadingTeams = true);
    try {
      final teams = await _teamsApi.getTeams(
        locationId: widget.locationId,
        status: 'recruiting',
        limit: 10,
      );
      if (mounted) {
        setState(() {
          _recruitingTeams = teams;
          _isLoadingTeams = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingTeams = false);
    }
  }

  Future<void> _toggleFavorite() async {
    try {
      final result =
          await _locationsApi.favoriteLocation(widget.locationId);
      setState(() => _isFavorited = result);
    } catch (e) {
      // 未登录时跳转登录页
      if (mounted) context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_location == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('地点不存在')),
      );
    }

    final location = _location!;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // 封面图头部
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                location.name,
                style: const TextStyle(
                  color: Colors.white,
                  shadows: [Shadow(blurRadius: 4, color: Colors.black)],
                ),
              ),
              background: Image.network(
                location.coverImage,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.grey[300],
                ),
              ),
            ),
            actions: [
              // 分享按钮
              IconButton(
                icon: const Icon(Icons.share_outlined, color: Colors.white),
                onPressed: _shareLocation,
              ),
              // 收藏按钮
              IconButton(
                icon: Icon(
                  _isFavorited ? Icons.favorite : Icons.favorite_border,
                  color: Colors.white,
                ),
                onPressed: _toggleFavorite,
              ),
            ],
          ),

          // 内容区
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 副标题
                  if (location.subtitle != null)
                    Text(
                      location.subtitle!,
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 16,
                      ),
                    ),

                  // 城市信息
                  if (location.cityName != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          location.cityName!,
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 14),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 16),

                  // 标签
                  if (location.tags.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: location.tags.map((tag) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTokens.brandPrimaryLight,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            tag,
                            style: const TextStyle(
                              color: AppTokens.brandPrimary,
                              fontSize: 12,
                              fontWeight: AppTokens.weightMedium,
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 16),

                  // 描述
                  const Text(
                    '地点介绍',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppTokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    location.description,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.6,
                      color: AppTokens.textSecondary,
                    ),
                  ),

                  // 路线信息
                  if (location.routes.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 16),
                    const Text(
                      '路线选择',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppTokens.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...location.routes.map((route) => _RouteCard(route: route)),
                  ],

                  // 招募队伍列表
                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '正在招募的队伍',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppTokens.textPrimary,
                        ),
                      ),
                      if (_recruitingTeams.isNotEmpty)
                        Text(
                          '${_recruitingTeams.length} 个队伍',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTokens.textSecondary,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildTeamsSection(),

                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        ],
      ),

      // 底部：找队伍按钮
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: () =>
                context.go('/teams?locationId=${location.id}'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTokens.brandPrimary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              '在此地找队伍',
              style: TextStyle(fontSize: 16),
            ),
          ),
        ),
      ),
    );
  }

  /// 构建招募队伍区域
  Widget _buildTeamsSection() {
    if (_isLoadingTeams) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    if (_recruitingTeams.isEmpty) {
      return AppEmptyState(
        icon: Icons.group_outlined,
        title: '暂无招募中的队伍',
        subtitle: '成为第一个在这里组建队伍的人吧',
        actionLabel: '创建队伍',
        onAction: () => context.push('/teams/create?locationId=${widget.locationId}'),
      );
    }

    return Column(
      children: _recruitingTeams.map((team) => _TeamCard(
        team: team,
        onTap: () => context.push('/teams/${team.id}'),
      )).toList(),
    );
  }
}

/// 招募队伍卡片
class _TeamCard extends StatelessWidget {
  final TeamModel team;
  final VoidCallback onTap;

  const _TeamCard({
    required this.team,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
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
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        team.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                          color: AppTokens.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      AppStatusBadge(
                        status: team.status.name,
                        showDot: team.status == TeamStatus.recruiting,
                        size: 0.85,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined, size: 14, color: AppTokens.textTertiary),
                const SizedBox(width: 4),
                Text(
                  team.date.length >= 10 ? '${team.date.substring(5, 7)}/${team.date.substring(8, 10)}' : team.date,
                  style: const TextStyle(color: AppTokens.textTertiary, fontSize: 13),
                ),
                const SizedBox(width: 16),
                const Icon(Icons.people_outlined, size: 14, color: AppTokens.textTertiary),
                const SizedBox(width: 4),
                Text(
                  '${team.approvedMemberCount}/${team.maxMembers} 人',
                  style: const TextStyle(color: AppTokens.textTertiary, fontSize: 13),
                ),
              ],
            ),
            // 人数进度条
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: team.maxMembers > 0 ? team.approvedMemberCount / team.maxMembers : 0,
                backgroundColor: AppTokens.bgDivider,
                valueColor: AlwaysStoppedAnimation<Color>(
                  team.hasVacancy ? AppTokens.semanticSuccess : AppTokens.semanticError,
                ),
                minHeight: 4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 路线信息卡片
class _RouteCard extends StatelessWidget {
  final RouteModel route;

  const _RouteCard({required this.route});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  route.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: AppTokens.textPrimary,
                  ),
                ),
              ),
              // 难度徽章（使用新组件）
              AppDifficultyBadge(difficulty: route.difficulty.label, size: 0.9),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.straighten, size: 14, color: AppTokens.textTertiary),
              const SizedBox(width: 4),
              Text(
                '${route.distance.toStringAsFixed(1)} 公里',
                style: const TextStyle(color: AppTokens.textTertiary, fontSize: 13),
              ),
              const SizedBox(width: 16),
              const Icon(Icons.schedule, size: 14, color: AppTokens.textTertiary),
              const SizedBox(width: 4),
              Text(
                '${route.durationMin}~${route.durationMax} 分钟',
                style: const TextStyle(color: AppTokens.textTertiary, fontSize: 13),
              ),
              if (route.elevation != null) ...[
                const SizedBox(width: 16),
                const Icon(Icons.terrain, size: 14, color: AppTokens.textTertiary),
                const SizedBox(width: 4),
                Text(
                  '↑${route.elevation} 米',
                  style: const TextStyle(color: AppTokens.textTertiary, fontSize: 13),
                ),
              ],
            ],
          ),
          if (route.description != null) ...[
            const SizedBox(height: 8),
            Text(
              route.description!,
              style: const TextStyle(color: AppTokens.textSecondary, fontSize: 13),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}
