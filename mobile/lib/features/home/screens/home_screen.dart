import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/api/teams_api.dart';
import '../../../core/models/location.dart';
import '../../../core/models/team.dart';
import '../../../shared/theme/app_theme.dart';

/// 首页：展示精选地点和最新招募队伍
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _locationsApi = LocationsApi();
  final _teamsApi = TeamsApi();

  List<LocationModel> _locations = [];
  List<TeamModel> _teams = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _locationsApi.getLocations(limit: 6),
        _teamsApi.getTeams(status: 'recruiting', limit: 5),
      ]);
      if (mounted) {
        setState(() {
          _locations = results[0] as List<LocationModel>;
          _teams = results[1] as List<TeamModel>;
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      debugPrint('HomeScreen._loadData error: $e\n$stack');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        title: ShaderMask(
          shaderCallback: (bounds) => AppGradients.brand.createShader(bounds),
          blendMode: BlendMode.srcIn,
          child: const Text(
            'GoMate',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 22,
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outlined,
                color: AppColors.textSecondary),
            onPressed: () => context.go('/profile'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: AppColors.error),
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                            onPressed: _loadData, child: const Text('重试')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 搜索栏（假搜索框）
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: GestureDetector(
                            onTap: () => context.go('/locations'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppColors.cardBackground,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                    color: AppColors.border, width: 1),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.search,
                                      color: AppColors.textPlaceholder),
                                  SizedBox(width: 8),
                                  Text(
                                    '搜索地点、路线或队伍...',
                                    style: TextStyle(
                                        color: AppColors.textPlaceholder),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        // 热门地点标题行
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '热门地点',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.go('/locations'),
                                child: const Text(
                                  '查看全部',
                                  style: TextStyle(color: AppColors.brand),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // 地点横向卡片列表
                        SizedBox(
                          height: 200,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _locations.length,
                            itemBuilder: (context, index) {
                              final location = _locations[index];
                              return _LocationCard(location: location);
                            },
                          ),
                        ),

                        const SizedBox(height: 24),

                        // 招募中队伍标题行
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '招募中队伍',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.go('/teams'),
                                child: const Text(
                                  '查看全部',
                                  style: TextStyle(color: AppColors.brand),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // 队伍列表
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding:
                              const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _teams.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final team = _teams[index];
                            return _TeamListItem(team: team);
                          },
                        ),
                        const SizedBox(height: 80),
                      ],
                    ),
                  ),
                ),
    );
  }
}

/// 地点横向卡片组件
class _LocationCard extends StatelessWidget {
  final LocationModel location;

  const _LocationCard({required this.location});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/locations/${location.id}'),
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: AppColors.cardBackground,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              // 封面图
              Positioned.fill(
                child: Image.network(
                  location.coverImage,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppColors.cardBackground,
                    child: const Icon(Icons.landscape,
                        color: AppColors.textPlaceholder),
                  ),
                ),
              ),
              // 底部渐变遮罩：透明 → 黑色
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.7),
                      ],
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        location.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (location.cityName != null)
                        Text(
                          location.cityName!,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 队伍列表项组件
class _TeamListItem extends StatelessWidget {
  final TeamModel team;

  const _TeamListItem({required this.team});

  @override
  Widget build(BuildContext context) {
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
          children: [
            // 队伍图标容器：浅橙背景
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.brandMuted,
                borderRadius: BorderRadius.circular(10),
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
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.people_outlined,
                        size: 14,
                        color: AppColors.textPlaceholder,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${team.approvedMemberCount}/${team.maxMembers} 人',
                        style: const TextStyle(
                          color: AppColors.textPlaceholder,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // 状态标签（招募中）
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.brandMuted,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                team.status.label,
                style: const TextStyle(
                  color: AppColors.brand,
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
