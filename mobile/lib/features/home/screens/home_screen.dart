import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/api/teams_api.dart';
import '../../../core/models/location.dart';
import '../../../core/models/team.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_shimmer.dart';
import '../../../shared/widgets/app_status_badge.dart';

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
  DateTime? _lastPressedTime;

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
        _locationsApi.getLocations(page: 1, limit: 6),
        _teamsApi.getTeams(page: 1, status: 'recruiting', limit: 5),
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

  /// 骨架屏加载状态（增强版）
  Widget _buildLoadingSkeleton() {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 搜索栏骨架
          Padding(
            padding: const EdgeInsets.all(AppTokens.space4),
            child: AppShimmer(
              width: double.infinity,
              height: 48,
              borderRadius: AppTokens.radiusL,
            ),
          ),
          // 地点标题骨架
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const AppShimmer(width: 80, height: 24),
                const AppShimmer(width: 60, height: 20),
              ],
            ),
          ),
          const SizedBox(height: AppTokens.space3),
          // 地点卡片骨架
          const HomeLocationShimmer(),
          const SizedBox(height: AppTokens.space5),
          // 队伍标题骨架
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const AppShimmer(width: 100, height: 24),
                const AppShimmer(width: 60, height: 20),
              ],
            ),
          ),
          const SizedBox(height: AppTokens.space3),
          // 队伍列表骨架
          const HomeTeamShimmer(),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) {
        if (!didPop) {
          // 双击退出应用
          final now = DateTime.now();
          if (_lastPressedTime == null || now.difference(_lastPressedTime!) > const Duration(seconds: 2)) {
            _lastPressedTime = now;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('再按一次退出应用')),
            );
            return;
          }
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
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
        extendBodyBehindAppBar: true,
        body: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.center,
              colors: [
                AppTokens.brandPrimaryLight.withValues(alpha: 0.3),
                AppTokens.bgBase,
              ],
              stops: const [0.0, 0.15],
            ),
          ),
          child: SafeArea(
            child: _isLoading
                ? _buildLoadingSkeleton()
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppTokens.space6),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: AppTokens.semanticError.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.cloud_off_outlined,
                                  size: 48,
                                  color: AppTokens.semanticError,
                                ),
                              ),
                              const SizedBox(height: AppTokens.space4),
                              const Text(
                                '加载失败',
                                style: TextStyle(
                                  fontSize: AppTokens.fontSizeL,
                                  fontWeight: FontWeight.w600,
                                  color: AppTokens.textPrimary,
                                ),
                              ),
                              const SizedBox(height: AppTokens.space2),
                              Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: AppTokens.fontSizeS,
                                  color: AppTokens.textSecondary,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: AppTokens.space5),
                              Container(
                                decoration: BoxDecoration(
                                  gradient: AppTokens.gradientBrand,
                                  borderRadius: BorderRadius.circular(AppTokens.radiusM),
                                ),
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: _loadData,
                                    borderRadius: BorderRadius.circular(AppTokens.radiusM),
                                    child: const Padding(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: 24,
                                        vertical: 12,
                                      ),
                                      child: Text(
                                        '重新加载',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: AppTokens.fontSizeM,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        color: AppTokens.brandPrimary,
                        backgroundColor: AppTokens.bgSurface,
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // 搜索栏（点击跳转地点页，语义化提示）
                              _buildSearchBar(),

                              // 热门地点区域
                              _buildLocationsSection(),

                              // 招募中队伍区域
                              _buildTeamsSection(),

                              const SizedBox(height: 80),
                            ],
                          ),
                        ),
                      ),
          ),
        ),
      ),
    );
  }

  /// 搜索栏组件
  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(AppTokens.space4),
      child: GestureDetector(
        onTap: () => context.go('/locations'),
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: AppTokens.space4,
              vertical: AppTokens.space3),
          decoration: BoxDecoration(
            color: AppTokens.bgSurface,
            borderRadius: BorderRadius.circular(AppTokens.radiusL),
            border: Border.all(color: AppTokens.borderDefault, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: const Row(
            children: [
              Icon(Icons.search_rounded,
                  color: AppTokens.textTertiary,
                  size: AppTokens.iconL),
              SizedBox(width: AppTokens.space2),
              Expanded(
                child: Text(
                  '搜索地点、路线或队伍...',
                  style: TextStyle(
                      color: AppTokens.textTertiary,
                      fontSize: AppTokens.fontSizeBase),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(Icons.tune_rounded,
                  color: AppTokens.textTertiary,
                  size: AppTokens.iconM),
            ],
          ),
        ),
      ),
    );
  }

  /// 地点区域
  Widget _buildLocationsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 标题行
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
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
        // 地点卡片列表
        SizedBox(
          height: 220,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
            itemCount: _locations.length,
            itemBuilder: (context, index) {
              final location = _locations[index];
              return _LocationCard(location: location);
            },
          ),
        ),
      ],
    );
  }

  /// 队伍区域
  Widget _buildTeamsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: AppTokens.space5),
        // 标题行
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
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
        const SizedBox(height: AppTokens.space3),
        // 队伍列表
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
          itemCount: _teams.length,
          separatorBuilder: (_, __) => const SizedBox(height: AppTokens.space2),
          itemBuilder: (context, index) {
            final team = _teams[index];
            return _TeamListItem(team: team);
          },
        ),
      ],
    );
  }
}

/// 地点横向卡片组件（Glassmorphism 2.0 + 点击动画）
class _LocationCard extends StatefulWidget {
  final LocationModel location;

  const _LocationCard({required this.location});

  @override
  State<_LocationCard> createState() => _LocationCardState();
}

class _LocationCardState extends State<_LocationCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        context.push('/locations/${widget.location.id}');
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          width: AppTokens.cardWidthHorizontal,
          margin: const EdgeInsets.only(right: AppTokens.space3),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTokens.radiusL),
            boxShadow: [
              BoxShadow(
                color: AppTokens.brandPrimary.withValues(alpha: 0.15),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppTokens.radiusL),
            child: Stack(
              children: [
                // 封面图
                Positioned.fill(
                  child: CachedNetworkImage(
                    imageUrl: widget.location.coverImage,
                    fit: BoxFit.cover,
                    cacheKey: widget.location.id,
                    maxWidthDiskCache: 300,
                    maxHeightDiskCache: 220,
                    placeholder: (context, url) => Container(
                      color: AppTokens.bgSurface,
                      child: const Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTokens.brandPrimary,
                        ),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      decoration: const BoxDecoration(
                        gradient: AppTokens.gradientBrand,
                      ),
                      child: const Center(
                        child: Icon(Icons.landscape_outlined,
                            color: Colors.white70,
                            size: AppTokens.iconXL),
                      ),
                    ),
                  ),
                ),
                // 底部渐变遮罩（增强对比度）
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.7),
                          Colors.black.withValues(alpha: 0.85),
                        ],
                        stops: const [0.0, 0.4, 0.8, 1.0],
                      ),
                    ),
                  ),
                ),
                // 顶部装饰渐变（视觉亮点）
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 60,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.white.withValues(alpha: 0.15),
                          Colors.transparent,
                        ],
                      ),
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
                          widget.location.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: AppTokens.fontSizeBase,
                            shadows: [
                              Shadow(
                                color: Colors.black45,
                                offset: Offset(0, 1),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        if (widget.location.cityName != null)
                          Row(
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                color: Colors.white70,
                                size: 12,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  widget.location.cityName!,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: AppTokens.fontSizeS,
                                    shadows: [
                                      Shadow(
                                        color: Colors.black45,
                                        offset: Offset(0, 1),
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 队伍列表项组件（增强视觉层次 + 点击动画）
class _TeamListItem extends StatefulWidget {
  final TeamModel team;

  const _TeamListItem({required this.team});

  @override
  State<_TeamListItem> createState() => _TeamListItemState();
}

class _TeamListItemState extends State<_TeamListItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _elevationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.98).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _elevationAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        context.push('/teams/${widget.team.id}');
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: AnimatedBuilder(
          animation: _elevationAnimation,
          builder: (context, child) {
            return Container(
              padding: const EdgeInsets.all(AppTokens.space4),
              decoration: BoxDecoration(
                color: AppTokens.bgSurface,
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                border: Border.all(
                  color: AppTokens.borderDefault.withValues(alpha: 0.5),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppTokens.brandPrimary.withValues(alpha: 0.08 * _elevationAnimation.value),
                    blurRadius: 12 * _elevationAnimation.value,
                    offset: Offset(0, 2 * _elevationAnimation.value),
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // 队伍图标容器：渐变背景 + 阴影
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppTokens.brandPrimaryLight,
                          AppTokens.brandPrimaryLight.withValues(alpha: 0.7),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      boxShadow: [
                        BoxShadow(
                          color: AppTokens.brandPrimary.withValues(alpha: 0.2),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        widget.team.icon,
                        style: const TextStyle(fontSize: 26),
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
                          widget.team.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
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
                              '${widget.team.approvedMemberCount}/${widget.team.maxMembers} 人',
                              style: const TextStyle(
                                color: AppTokens.textTertiary,
                                fontSize: AppTokens.fontSizeS,
                              ),
                            ),
                            const SizedBox(width: AppTokens.space2),
                            const Icon(
                              Icons.schedule_outlined,
                              size: AppTokens.iconXS,
                              color: AppTokens.textTertiary,
                            ),
                            const SizedBox(width: AppTokens.space1),
                            Text(
                              widget.team.date.length >= 10
                                  ? '${widget.team.date.substring(5, 7)}/${widget.team.date.substring(8, 10)}'
                                  : widget.team.date,
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
                  const SizedBox(width: AppTokens.space2),
                  // 状态徽章（使用新组件）
                  AppStatusBadge(
                    status: widget.team.status.name,
                    showDot: widget.team.status == TeamStatus.recruiting,
                    size: 0.9,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
