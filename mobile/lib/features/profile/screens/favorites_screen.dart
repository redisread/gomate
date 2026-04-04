import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/models/location.dart';
import '../../../core/navigation/app_router.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_empty_state.dart';
import '../../../shared/widgets/app_shimmer.dart';

/// 我的收藏页面
class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key});

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen> {
  List<LocationModel> _favorites = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      debugPrint('[FavoritesScreen] 开始加载收藏列表...');
      final favorites = await LocationsApi().getFavorites();
      debugPrint('[FavoritesScreen] 成功加载 ${favorites.length} 个收藏');
      setState(() {
        _favorites = favorites;
        _isLoading = false;
      });
    } catch (e, stackTrace) {
      debugPrint('[FavoritesScreen] 加载收藏失败: $e');
      debugPrint('[FavoritesScreen] 堆栈: $stackTrace');
      setState(() {
        _errorMessage = '加载收藏失败: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _removeFavorite(LocationModel location) async {
    try {
      await LocationsApi().removeFavorite(location.id);
      setState(() {
        _favorites.removeWhere((f) => f.id == location.id);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('已取消收藏'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('取消收藏失败，请重试'),
            backgroundColor: AppTokens.semanticError,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // 未登录时重定向到登录页
    final authAsync = ref.watch(authProvider);
    final authState = authAsync.valueOrNull;
    if (authState == null || !authState.isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.go('/login');
      });
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          '我的收藏',
          style: TextStyle(
            color: AppTokens.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTokens.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadFavorites,
        color: AppTokens.brandPrimary,
        backgroundColor: AppTokens.bgSurface,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return _buildShimmer();
    }

    if (_errorMessage != null) {
      return Center(
        child: AppErrorState(
          message: _errorMessage,
          onRetry: _loadFavorites,
        ),
      );
    }

    if (_favorites.isEmpty) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.2),
          AppEmptyState(
            icon: Icons.favorite_border,
            title: '还没有收藏地点',
            subtitle: '发现喜欢的地方，点击心形图标收藏',
            actionLabel: '去探索',
            onAction: () => context.push('/locations'),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppTokens.space4),
      itemCount: _favorites.length,
      itemBuilder: (context, index) {
        final location = _favorites[index];
        return _FavoriteCard(
          location: location,
          onRemove: () => _removeFavorite(location),
          onTap: () => context.push(AppRoutes.locationDetailPath(location.id)),
        );
      },
    );
  }

  Widget _buildShimmer() {
    return ListView.builder(
      padding: const EdgeInsets.all(AppTokens.space4),
      itemCount: 6,
      itemBuilder: (_, __) => Padding(
        padding: const EdgeInsets.only(bottom: AppTokens.space3),
        child: Container(
          height: 100,
          padding: const EdgeInsets.all(AppTokens.space3),
          decoration: BoxDecoration(
            color: AppTokens.bgSurface,
            borderRadius: BorderRadius.circular(AppTokens.radiusL),
            border: Border.all(color: AppTokens.borderDefault, width: 1),
          ),
          child: Row(
            children: [
              AppShimmer(
                width: 80,
                height: 80,
                borderRadius: AppTokens.radiusM,
              ),
              const SizedBox(width: AppTokens.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AppShimmer(width: double.infinity, height: 18),
                    const SizedBox(height: AppTokens.space2),
                    AppShimmer(width: 120, height: 14),
                    const SizedBox(height: AppTokens.space2),
                    AppShimmer(width: 80, height: 12),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 收藏卡片组件
class _FavoriteCard extends StatelessWidget {
  final LocationModel location;
  final VoidCallback onRemove;
  final VoidCallback onTap;

  const _FavoriteCard({
    required this.location,
    required this.onRemove,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(location.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppTokens.space4),
        decoration: BoxDecoration(
          color: AppTokens.semanticError,
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
        ),
        child: const Icon(
          Icons.delete_outline,
          color: Colors.white,
        ),
      ),
      onDismissed: (_) => onRemove(),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTokens.radiusL),
        child: Padding(
          padding: const EdgeInsets.only(bottom: AppTokens.space3),
          child: Container(
            padding: const EdgeInsets.all(AppTokens.space3),
            decoration: BoxDecoration(
              color: AppTokens.bgSurface,
              borderRadius: BorderRadius.circular(AppTokens.radiusL),
              border: Border.all(color: AppTokens.borderDefault, width: 1),
              boxShadow: [
                BoxShadow(
                  color: const Color(0x0A1A2332),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
            children: [
              // 封面图
              ClipRRect(
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                child: CachedNetworkImage(
                  imageUrl: location.coverImage,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  cacheKey: location.id,
                  maxWidthDiskCache: 100,
                  maxHeightDiskCache: 100,
                  placeholder: (context, url) => Container(
                    width: 80,
                    height: 80,
                    color: AppTokens.bgDivider,
                    child: const Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTokens.brandPrimary,
                      ),
                    ),
                  ),
                  errorWidget: (context, url, error) => Container(
                    width: 80,
                    height: 80,
                    color: AppTokens.bgDivider,
                    child: const Icon(
                      Icons.image_not_supported,
                      color: AppTokens.textTertiary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppTokens.space3),
              // 信息区
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      location.name,
                      style: const TextStyle(
                        fontSize: AppTokens.fontSizeL,
                        fontWeight: AppTokens.weightSemiBold,
                        color: AppTokens.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppTokens.space1),
                    if (location.address != null) ...[
                      Text(
                        location.address!,
                        style: const TextStyle(
                          fontSize: AppTokens.fontSizeBase,
                          color: AppTokens.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: AppTokens.space1),
                    ],
                    Row(
                      children: [
                        Icon(
                          Icons.location_on_outlined,
                          size: 14,
                          color: AppTokens.textTertiary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          location.cityName ?? '未知城市',
                          style: const TextStyle(
                            fontSize: AppTokens.fontSizeS,
                            color: AppTokens.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // 取消收藏按钮
              IconButton(
                icon: const Icon(
                  Icons.favorite,
                  color: AppTokens.semanticError,
                ),
                onPressed: onRemove,
              ),
            ],
          ),
        ),
      ),
    ),
    );
  }
}
