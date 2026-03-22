import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/api/teams_api.dart';
import '../../../core/models/location.dart';
import '../../../core/models/team.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_shimmer.dart';

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

  /// 骨架屏加载状态
  Widget _buildLoadingSkeleton() {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppTokens.space4),
            child: AppShimmer(
                width: double.infinity,
                height: 48,
                borderRadius: AppTokens.radiusM),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
            child: AppShimmer(width: 120, height: 24),
          ),
          const SizedBox(height: AppTokens.space3),
          const HomeLocationShimmer(),
          const SizedBox(height: AppTokens.space6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
            child: AppShimmer(width: 120, height: 24),
          ),
          const SizedBox(height: AppTokens.space3),
          const HomeTeamShimmer(),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        title: ShaderMask(
          shaderCallback: (bounds) =>
              AppTokens.gradientBrand.createShader(bounds),
          blendMode: BlendMode.srcIn,
          child: const Text(
            'GoMate',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: AppTokens.fontSizeXXL,
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline_rounded,
                color: AppTokens.textSecondary),
            onPressed: () => context.go('/profile'),
          ),
        ],
      ),
      body: _isLoading
          ? _buildLoadingSkeleton()
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppTokens.space6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: AppTokens.semanticError),
                        const SizedBox(height: AppTokens.space3),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: AppTokens.fontSizeS,
                            color: AppTokens.textSecondary,
                          ),
                        ),
                        const SizedBox(height: AppTokens.space4),
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
                        // 搜索栏（点击跳转地点页，语义化提示）
                        Padding(
                          padding: const EdgeInsets.all(AppTokens.space4),
                          child: GestureDetector(
                            onTap: () => context.go('/locations'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: AppTokens.space4,
                                  vertical: AppTokens.space3),
                              decoration: BoxDecoration(
                                color: AppTokens.bgSurface,
                                borderRadius:
                                    BorderRadius.circular(AppTokens.radiusM),
                                border: Border.all(
                                    color: AppTokens.borderDefault, width: 1),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.search_rounded,
                                      color: AppTokens.textTertiary,
                                      size: AppTokens.iconL),
                                  SizedBox(width: AppTokens.space2),
                                  Text(
                                    '搜索地点、路线或队伍...',
                                    style: TextStyle(
                                        color: AppTokens.textTertiary,
                                        fontSize: AppTokens.fontSizeBase),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        // 热门地点标题行
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppTokens.space4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '热门地点',
                                style: TextStyle(
                                  fontSize: AppTokens.fontSizeXL,
                                  fontWeight: FontWeight.bold,
                                  color: AppTokens.textPrimary,
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.go('/locations'),
                                child: const Text('查看全部'),
                              ),
                            ],
                          ),
                        ),

                        // 地点横向卡片列表
                        SizedBox(
                          height: 200,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(
                                horizontal: AppTokens.space4),
                            itemCount: _locations.length,
                            itemBuilder: (context, index) {
                              final location = _locations[index];
                              return _LocationCard(location: location);
                            },
                          ),
                        ),

                        const SizedBox(height: AppTokens.space6),

                        // 招募中队伍标题行
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppTokens.space4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '招募中队伍',
                                style: TextStyle(
                                  fontSize: AppTokens.fontSizeXL,
                                  fontWeight: FontWeight.bold,
                                  color: AppTokens.textPrimary,
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.go('/teams'),
                                child: const Text('查看全部'),
                              ),
                            ],
                          ),
                        ),

                        // 队伍列表
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppTokens.space4),
                          itemCount: _teams.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: AppTokens.space2),
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
        width: AppTokens.cardWidthHorizontal,
        margin: const EdgeInsets.only(right: AppTokens.space3),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
          color: AppTokens.bgSurfaceElevated,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
          child: Stack(
            children: [
              // 封面图
              Positioned.fill(
                child: Image.network(
                  location.coverImage,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppTokens.bgSurfaceElevated,
                    child: const Icon(Icons.landscape_outlined,
                        color: AppTokens.textTertiary,
                        size: AppTokens.iconXL),
                  ),
                ),
              ),
              // 底部渐变遮罩
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: AppTokens.gradientImageOverlay,
                  ),
                ),
              ),
              // 底部文字内容
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Padding(
                  padding: const EdgeInsets.all(AppTokens.space3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        location.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: AppTokens.fontSizeBase,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (location.cityName != null)
                        Text(
                          location.cityName!,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: AppTokens.fontSizeS,
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
        padding: const EdgeInsets.all(AppTokens.space4),
        decoration: BoxDecoration(
          color: AppTokens.bgSurface,
          border: Border.all(color: AppTokens.borderDefault),
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
        ),
        child: Row(
          children: [
            // 队伍图标容器：蓝绿浅色背景
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
            const SizedBox(width: AppTokens.space3),
            // 队伍信息
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    team.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: AppTokens.fontSizeM,
                      color: AppTokens.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppTokens.space1),
                  Row(
                    children: [
                      const Icon(
                        Icons.people_outlined,
                        size: AppTokens.iconXS,
                        color: AppTokens.textTertiary,
                      ),
                      const SizedBox(width: AppTokens.space1),
                      Text(
                        '${team.approvedMemberCount}/${team.maxMembers} 人',
                        style: const TextStyle(
                          color: AppTokens.textTertiary,
                          fontSize: AppTokens.fontSizeS,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // 状态标签（使用状态专用 Token）
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppTokens.space2, vertical: AppTokens.space1),
              decoration: BoxDecoration(
                color: AppTokens.statusRecruitingBg,
                borderRadius: BorderRadius.circular(AppTokens.radiusXS),
              ),
              child: Text(
                team.status.label,
                style: const TextStyle(
                  color: AppTokens.statusRecruiting,
                  fontSize: AppTokens.fontSizeS,
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
