import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/models/location.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_status_badge.dart';

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
  LocationModel? _location;
  bool _isLoading = true;
  bool _isFavorited = false;

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    try {
      final data = await _locationsApi.getLocation(widget.locationId);
      if (mounted) {
        setState(() {
          _location = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
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
