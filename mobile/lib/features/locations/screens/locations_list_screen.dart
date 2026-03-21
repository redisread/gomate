import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/cities_api.dart';
import '../../../core/api/locations_api.dart';
import '../../../core/api/tags_api.dart';
import '../../../core/models/location.dart';
import '../../../shared/theme/app_theme.dart';

/// 地点列表页面
class LocationsListScreen extends ConsumerStatefulWidget {
  const LocationsListScreen({super.key});

  @override
  ConsumerState<LocationsListScreen> createState() =>
      _LocationsListScreenState();
}

class _LocationsListScreenState extends ConsumerState<LocationsListScreen> {
  final _locationsApi = LocationsApi();
  final _citiesApi = CitiesApi();
  final _tagsApi = TagsApi();

  List<LocationModel> _locations = [];
  List<CityModel> _cities = [];
  List<TagModel> _tags = [];

  bool _isLoading = true;
  String? _errorMessage;

  // 筛选状态
  String? _selectedCityId;
  List<String> _selectedTagIds = [];

  bool get _hasActiveFilter =>
      _selectedCityId != null || _selectedTagIds.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadFilterOptions();
    _loadLocations();
  }

  /// 并行加载城市和标签数据
  Future<void> _loadFilterOptions() async {
    try {
      final results = await Future.wait([
        _citiesApi.getCities(),
        _tagsApi.getLocationTags(),
      ]);
      if (mounted) {
        final cities = results[0] as List<CityModel>;
        final tags = results[1] as List<TagModel>;
        debugPrint('[Filter] 城市数: ${cities.length}, 标签数: ${tags.length}');
        setState(() {
          _cities = cities;
          _tags = tags;
        });
      }
    } catch (e) {
      debugPrint('[Filter] 加载筛选选项失败: $e');
    }
  }

  Future<void> _loadLocations() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final data = await _locationsApi.getLocations(
        cityId: _selectedCityId,
        tagIds: _selectedTagIds.isEmpty ? null : _selectedTagIds,
        limit: 50,
      );
      if (mounted) {
        setState(() {
          _locations = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  /// 显示筛选底部弹窗
  void _showFilterSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _FilterBottomSheet(
        cities: _cities,
        tags: _tags,
        selectedCityId: _selectedCityId,
        selectedTagIds: _selectedTagIds,
        onApply: (cityId, tagIds) {
          setState(() {
            _selectedCityId = cityId;
            _selectedTagIds = tagIds;
          });
          _loadLocations();
        },
      ),
    );
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
          '探索地点',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.tune, color: AppColors.textSecondary),
                onPressed: _showFilterSheet,
              ),
              if (_hasActiveFilter)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.brand,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.brand),
            )
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: AppColors.error),
                        const SizedBox(height: 12),
                        Text(
                          '加载失败',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _errorMessage!,
                          style: const TextStyle(
                              color: AppColors.textSecondary, fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadLocations,
                          child: const Text('重试'),
                        ),
                      ],
                    ),
                  ),
                )
              : _locations.isEmpty
                  ? const Center(
                      child: Text(
                        '暂无地点数据',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadLocations,
                      color: AppColors.brand,
                      child: GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.8,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: _locations.length,
                        itemBuilder: (context, index) {
                          final location = _locations[index];
                          return _LocationGridCard(location: location);
                        },
                      ),
                    ),
    );
  }
}

/// 筛选底部弹窗
class _FilterBottomSheet extends StatefulWidget {
  final List<CityModel> cities;
  final List<TagModel> tags;
  final String? selectedCityId;
  final List<String> selectedTagIds;
  final void Function(String? cityId, List<String> tagIds) onApply;

  const _FilterBottomSheet({
    required this.cities,
    required this.tags,
    required this.selectedCityId,
    required this.selectedTagIds,
    required this.onApply,
  });

  @override
  State<_FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<_FilterBottomSheet> {
  String? _cityId;
  late List<String> _tagIds;

  @override
  void initState() {
    super.initState();
    _cityId = widget.selectedCityId;
    _tagIds = List<String>.from(widget.selectedTagIds);
  }

  void _reset() {
    setState(() {
      _cityId = null;
      _tagIds = [];
    });
  }

  void _apply() {
    widget.onApply(_cityId, _tagIds);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.cardBackground,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 顶部把手
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // 标题
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Text(
                '筛选',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Divider(height: 1, color: AppColors.border),
            // 城市筛选
            if (widget.cities.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  '城市',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    // "全部" 选项
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: const Text('全部'),
                        selected: _cityId == null,
                        onSelected: (_) => setState(() => _cityId = null),
                        backgroundColor: AppColors.background,
                        selectedColor: AppColors.brand,
                        side: BorderSide(
                          color: _cityId == null
                              ? AppColors.brand
                              : AppColors.border,
                        ),
                        labelStyle: TextStyle(
                          color: _cityId == null
                              ? Colors.white
                              : AppColors.textSecondary,
                          fontSize: 13,
                        ),
                        checkmarkColor: Colors.white,
                      ),
                    ),
                    ...widget.cities.map(
                      (city) {
                        final isSelected = _cityId == city.id;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(city.name),
                            selected: isSelected,
                            onSelected: (_) =>
                                setState(() => _cityId = city.id),
                            backgroundColor: AppColors.background,
                            selectedColor: AppColors.brand,
                            side: BorderSide(
                              color: isSelected
                                  ? AppColors.brand
                                  : AppColors.border,
                            ),
                            labelStyle: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.textSecondary,
                              fontSize: 13,
                            ),
                            checkmarkColor: Colors.white,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
            // 标签筛选
            if (widget.tags.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  '标签',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: widget.tags.map((tag) {
                    final selected = _tagIds.contains(tag.id);
                    return FilterChip(
                      label: Text(tag.name),
                      selected: selected,
                      onSelected: (value) {
                        setState(() {
                          if (value) {
                            _tagIds = [..._tagIds, tag.id];
                          } else {
                            _tagIds =
                                _tagIds.where((id) => id != tag.id).toList();
                          }
                        });
                      },
                      backgroundColor: AppColors.background,
                      selectedColor: AppColors.brand,
                      side: BorderSide(
                        color: selected ? AppColors.brand : AppColors.border,
                      ),
                      labelStyle: TextStyle(
                        color:
                            selected ? Colors.white : AppColors.textSecondary,
                        fontSize: 13,
                      ),
                      checkmarkColor: Colors.white,
                    );
                  }).toList(),
                ),
              ),
            ],
            const SizedBox(height: 16),
            // 按钮行
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _reset,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.textSecondary,
                        side: const BorderSide(color: AppColors.border),
                      ),
                      child: const Text('重置'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: Container(
                      width: double.infinity,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: AppGradients.brand,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: _apply,
                          child: const Center(
                            child: Text(
                              '确认',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 地点网格卡片
class _LocationGridCard extends StatelessWidget {
  final LocationModel location;

  const _LocationGridCard({required this.location});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/locations/${location.id}'),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: AppColors.cardBackground,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              Positioned.fill(
                child: Image.network(
                  location.coverImage,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppColors.cardBackground,
                    child: const Icon(Icons.landscape,
                        color: AppColors.textPlaceholder, size: 48),
                  ),
                ),
              ),
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
                        Colors.black.withValues(alpha: 0.75),
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
                      if (location.subtitle != null)
                        Text(
                          location.subtitle!,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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
