import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:photo_view/photo_view.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:gal/gal.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:cached_network_image/cached_network_image.dart';


import '../../../core/api/locations_api.dart';
import '../../../core/api/teams_api.dart';
import '../../../core/models/location.dart';
import '../../../core/models/poi.dart';
import '../../../core/models/team.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_empty_state.dart';
import '../../../shared/widgets/app_status_badge.dart';

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
  List<PoiModel> _pois = [];
  bool _isLoading = true;
  bool _isLoadingTeams = false;
  bool _isLoadingPois = false;
  bool _isFavorited = false;

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    try {
      final results = await Future.wait([
        _locationsApi.getLocation(widget.locationId),
        _loadRecruitingTeams(),
        _loadPois(),
        _checkIfFavorited(),
      ]);

      if (mounted) {
        setState(() {
          _location = results[0] as LocationModel;
          _isFavorited = results[3] as bool;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<bool> _checkIfFavorited() async {
    try {
      final favorites = await _locationsApi.getFavorites();
      return favorites.any((location) => location.id == widget.locationId);
    } catch (e) {
      return false;
    }
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

  Future<void> _loadPois() async {
    setState(() => _isLoadingPois = true);
    try {
      final pois = await _locationsApi.getLocationPois(widget.locationId);
      if (mounted) {
        setState(() {
          _pois = pois;
          _isLoadingPois = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingPois = false);
    }
  }

  Future<void> _toggleFavorite() async {
    try {
      final result = await _locationsApi.favoriteLocation(widget.locationId);
      setState(() => _isFavorited = result);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result ? '已收藏' : '已取消收藏'),
            duration: const Duration(seconds: 1),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('操作失败，请重试')),
        );
      }
    }
  }

  void _showSharePoster() {
    if (_location == null) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SharePosterSheet(
        location: _location!,
        pois: _pois,
      ),
    );
  }

  void _showPoiImagePreview(PoiModel poi, int initialIndex) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _PoiImageGallery(
          poi: poi,
          initialIndex: initialIndex,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTokens.brandPrimary),
        ),
      );
    }

    if (_location == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(
          child:
              Text('地点不存在', style: TextStyle(color: AppTokens.textSecondary)),
        ),
      );
    }

    final location = _location!;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
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
              background: CachedNetworkImage(
                imageUrl: location.coverImage,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(color: AppTokens.bgSurface),
                errorWidget: (_, __, ___) => Container(
                  color: AppTokens.bgSurface,
                  child: const Icon(Icons.landscape,
                      color: AppTokens.textTertiary, size: 48),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.share_outlined, color: Colors.white),
                onPressed: _showSharePoster,
              ),
              IconButton(
                icon: Icon(
                  _isFavorited ? Icons.favorite : Icons.favorite_border,
                  color: Colors.white,
                ),
                onPressed: _toggleFavorite,
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (location.subtitle != null)
                    Text(
                      location.subtitle!,
                      style: const TextStyle(
                          color: AppTokens.textSecondary, fontSize: 16),
                    ),
                  if (location.cityName != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 16, color: AppTokens.textTertiary),
                        const SizedBox(width: 4),
                        Text(
                          location.cityName!,
                          style: const TextStyle(
                              color: AppTokens.textTertiary, fontSize: 14),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
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
                  if (_pois.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '打卡点',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: AppTokens.textPrimary,
                          ),
                        ),
                        Text(
                          '${_pois.length} 个点位',
                          style: const TextStyle(
                              fontSize: 13, color: AppTokens.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ..._pois.map((poi) => _PoiCard(
                          poi: poi,
                          onImageTap: (index) =>
                              _showPoiImagePreview(poi, index),
                        )),
                  ] else if (_isLoadingPois) ...[
                    const SizedBox(height: 24),
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ],
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
                              fontSize: 13, color: AppTokens.textSecondary),
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
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: () => context.go('/teams?locationId=${location.id}'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTokens.brandPrimary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('在此地找队伍', style: TextStyle(fontSize: 16)),
          ),
        ),
      ),
    );
  }

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
        onAction: () =>
            context.push('/teams/create?locationId=${widget.locationId}'),
      );
    }

    return Column(
      children: _recruitingTeams
          .map((team) => _TeamCard(
                team: team,
                onTap: () => context.push('/teams/${team.id}'),
              ))
          .toList(),
    );
  }
}

class _PoiCard extends StatelessWidget {
  final PoiModel poi;
  final void Function(int index) onImageTap;

  const _PoiCard({required this.poi, required this.onImageTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTokens.bgSurface,
        border: Border.all(color: AppTokens.borderDefault),
        borderRadius: BorderRadius.circular(AppTokens.radiusM),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppTokens.brandPrimaryLight,
                  borderRadius: BorderRadius.circular(AppTokens.radiusS),
                ),
                child: Center(
                  child: Text(poi.roleType.icon,
                      style: const TextStyle(fontSize: 18)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      poi.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppTokens.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      poi.roleType.label,
                      style: const TextStyle(
                          color: AppTokens.textTertiary, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (poi.order != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTokens.bgDivider,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '#${poi.order}',
                    style: const TextStyle(
                        color: AppTokens.textTertiary, fontSize: 11),
                  ),
                ),
            ],
          ),
          if (poi.description != null) ...[
            const SizedBox(height: 12),
            Text(
              poi.description!,
              style:
                  const TextStyle(color: AppTokens.textSecondary, fontSize: 13),
            ),
          ],
          if (poi.images.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 80,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: poi.images.length,
                itemBuilder: (_, index) {
                  return GestureDetector(
                    onTap: () => onImageTap(index),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AppTokens.radiusS),
                        color: AppTokens.bgSurface,
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: CachedNetworkImage(
                        imageUrl: poi.images[index],
                        fit: BoxFit.cover,
                        placeholder: (_, __) =>
                            Container(color: AppTokens.bgSurface),
                        errorWidget: (_, __, ___) => Container(
                          color: AppTokens.bgSurface,
                          child: const Icon(Icons.image,
                              color: AppTokens.textTertiary),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PoiImageGallery extends StatefulWidget {
  final PoiModel poi;
  final int initialIndex;

  const _PoiImageGallery({required this.poi, required this.initialIndex});

  @override
  State<_PoiImageGallery> createState() => _PoiImageGalleryState();
}

class _PoiImageGalleryState extends State<_PoiImageGallery> {
  late PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          widget.poi.name,
          style: const TextStyle(color: Colors.white),
        ),
        actions: [
          Text(
            '${_currentIndex + 1}/${widget.poi.images.length}',
            style: const TextStyle(color: Colors.white70),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: PageView.builder(
        controller: _pageController,
        itemCount: widget.poi.images.length,
        onPageChanged: (index) => setState(() => _currentIndex = index),
        itemBuilder: (_, index) {
          return PhotoView(
            imageProvider: CachedNetworkImageProvider(widget.poi.images[index]),
            minScale: PhotoViewComputedScale.contained,
            maxScale: PhotoViewComputedScale.covered * 2,
            loadingBuilder: (_, __) => const Center(
              child: CircularProgressIndicator(color: AppTokens.brandPrimary),
            ),
            errorBuilder: (_, __, ___) => const Center(
              child: Icon(Icons.error, color: AppTokens.semanticError),
            ),
          );
        },
      ),
    );
  }
}

class _SharePosterSheet extends StatefulWidget {
  final LocationModel location;
  final List<PoiModel> pois;

  const _SharePosterSheet({required this.location, required this.pois});

  @override
  State<_SharePosterSheet> createState() => _SharePosterSheetState();
}

class _SharePosterSheetState extends State<_SharePosterSheet> {
  final _posterKey = GlobalKey();
  bool _isGenerating = false;
  bool _hasPermission = false;

  @override
  void initState() {
    super.initState();
    _checkPermission();
  }

  Future<void> _checkPermission() async {
    if (Platform.isAndroid) {
      final status = await Permission.storage.status;
      if (status.isGranted) {
        setState(() => _hasPermission = true);
      } else {
        final result = await Permission.storage.request();
        setState(() => _hasPermission = result.isGranted);
      }
    } else {
      setState(() => _hasPermission = true);
    }
  }

  Future<void> _generateAndSave() async {
    if (!_hasPermission) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('需要存储权限才能保存海报')),
      );
      return;
    }

    setState(() => _isGenerating = true);

    try {
      await Future.delayed(const Duration(milliseconds: 500));

      final boundary = _posterKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) {
        setState(() => _isGenerating = false);
        return;
      }

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        setState(() => _isGenerating = false);
        return;
      }

      final buffer = byteData.buffer.asUint8List();
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/gomate_share.png');
      await file.writeAsBytes(buffer);

      await Gal.putImageBytes(buffer, album: 'GoMate');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('海报已保存到相册')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存失败: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = widget.location;
    final url = 'https://gomate.live/locations/${location.id}';

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppTokens.bgBase,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: AppTokens.borderDefault,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '分享海报',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppTokens.textPrimary),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTokens.textSecondary),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: RepaintBoundary(
                key: _posterKey,
                child: Container(
                  width: 375,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: location.coverImage,
                          width: double.infinity,
                          height: 160,
                          fit: BoxFit.cover,
                          placeholder: (_, __) =>
                              Container(color: AppTokens.bgSurface),
                          errorWidget: (_, __, ___) => Container(
                            color: AppTokens.brandPrimaryLight,
                            child: const Icon(Icons.landscape,
                                color: AppTokens.brandPrimary),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        location.name,
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTokens.textPrimary),
                      ),
                      if (location.subtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          location.subtitle!,
                          style: const TextStyle(
                              fontSize: 14, color: AppTokens.textSecondary),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined,
                              size: 16, color: AppTokens.textTertiary),
                          const SizedBox(width: 4),
                          Text(
                            location.cityName ?? '深圳',
                            style: const TextStyle(
                                fontSize: 13, color: AppTokens.textTertiary),
                          ),
                        ],
                      ),
                      if (location.tags.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: location.tags.take(4).map((tag) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTokens.brandPrimaryLight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                tag,
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: AppTokens.brandPrimary),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                      if (widget.pois.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.place_outlined,
                                size: 16, color: AppTokens.textTertiary),
                            const SizedBox(width: 4),
                            Text(
                              '${widget.pois.length} 个打卡点',
                              style: const TextStyle(
                                  fontSize: 13, color: AppTokens.textTertiary),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 16),
                      Center(
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [
                              BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.08),
                                  blurRadius: 8),
                            ],
                          ),
                          child: QrImageView(
                            data: url,
                            version: QrVersions.auto,
                            size: 100,
                            backgroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Center(
                        child: Text(
                          '扫码查看地点详情',
                          style: TextStyle(
                              fontSize: 12, color: AppTokens.textTertiary),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Center(
                        child: Text(
                          'gomate.live',
                          style: TextStyle(
                              fontSize: 11, color: AppTokens.textTertiary),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final text = '''🏔️ ${location.name}
${location.subtitle ?? ''}

📍 ${location.cityName ?? '深圳'}

$url''';
                      await Share.share(text, subject: location.name);
                    },
                    icon: const Icon(Icons.link),
                    label: const Text('复制链接'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTokens.textSecondary,
                      side: const BorderSide(color: AppTokens.borderDefault),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _isGenerating ? null : _generateAndSave,
                    icon: _isGenerating
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.save_alt),
                    label: Text(_isGenerating ? '生成中...' : '保存海报'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTokens.brandPrimary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TeamCard extends StatelessWidget {
  final TeamModel team;
  final VoidCallback onTap;

  const _TeamCard({required this.team, required this.onTap});

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
                    child:
                        Text(team.icon, style: const TextStyle(fontSize: 24)),
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
                const Icon(Icons.calendar_today_outlined,
                    size: 14, color: AppTokens.textTertiary),
                const SizedBox(width: 4),
                Text(
                  team.date.length >= 10
                      ? '${team.date.substring(5, 7)}/${team.date.substring(8, 10)}'
                      : team.date,
                  style: const TextStyle(
                      color: AppTokens.textTertiary, fontSize: 13),
                ),
                const SizedBox(width: 16),
                const Icon(Icons.people_outlined,
                    size: 14, color: AppTokens.textTertiary),
                const SizedBox(width: 4),
                Text(
                  '${team.approvedMemberCount}/${team.maxMembers} 人',
                  style: const TextStyle(
                      color: AppTokens.textTertiary, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: team.maxMembers > 0
                    ? team.approvedMemberCount / team.maxMembers
                    : 0,
                backgroundColor: AppTokens.bgDivider,
                valueColor: AlwaysStoppedAnimation<Color>(
                  team.hasVacancy
                      ? AppTokens.semanticSuccess
                      : AppTokens.semanticError,
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
              AppDifficultyBadge(difficulty: route.difficulty.label, size: 0.9),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.straighten,
                  size: 14, color: AppTokens.textTertiary),
              const SizedBox(width: 4),
              Text(
                '${route.distance.toStringAsFixed(1)} 公里',
                style: const TextStyle(
                    color: AppTokens.textTertiary, fontSize: 13),
              ),
              const SizedBox(width: 16),
              const Icon(Icons.schedule,
                  size: 14, color: AppTokens.textTertiary),
              const SizedBox(width: 4),
              Text(
                '${route.durationMin}~${route.durationMax} 分钟',
                style: const TextStyle(
                    color: AppTokens.textTertiary, fontSize: 13),
              ),
              if (route.elevation != null) ...[
                const SizedBox(width: 16),
                const Icon(Icons.terrain,
                    size: 14, color: AppTokens.textTertiary),
                const SizedBox(width: 4),
                Text(
                  '↑${route.elevation} 米',
                  style: const TextStyle(
                      color: AppTokens.textTertiary, fontSize: 13),
                ),
              ],
            ],
          ),
          if (route.description != null) ...[
            const SizedBox(height: 8),
            Text(
              route.description!,
              style:
                  const TextStyle(color: AppTokens.textSecondary, fontSize: 13),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}
