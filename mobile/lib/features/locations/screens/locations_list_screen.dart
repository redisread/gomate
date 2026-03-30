import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/cities_api.dart';
import '../../../core/api/locations_api.dart';
import '../../../core/api/tags_api.dart';
import '../../../core/models/location.dart';
import '../../../shared/theme/app_tokens.dart';

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
  bool _isLoadingMore = false;
  bool _hasMore = true;
  String? _errorMessage;
  int _currentPage = 1;

  // 搜索和筛选状态
  final _searchController = TextEditingController();
  Timer? _debounceTimer;
  String? _searchQuery;
  String? _selectedCityId;
  List<String> _selectedTagIds = [];
  String? _selectedType; // hiking, explore, leisure, travel

  bool get _hasActiveFilter =>
      _selectedCityId != null || _selectedTagIds.isNotEmpty || _selectedType != null;

  @override
  void initState() {
    super.initState();
    _loadFilterOptions();
    _loadLocations();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  /// 搜索防抖
  void _onSearchChanged() {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      final query = _searchController.text.trim();
      if (query != _searchQuery) {
        setState(() {
          _searchQuery = query.isEmpty ? null : query;
          _currentPage = 1;
          _hasMore = true;
        });
        _loadLocations();
      }
    });
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

  Future<void> _loadLocations({bool loadMore = false}) async {
    if (loadMore) {
      if (_isLoadingMore || !_hasMore) return;
      setState(() => _isLoadingMore = true);
    } else {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
        _currentPage = 1;
      });
    }

    try {
      final targetPage = loadMore ? _currentPage + 1 : 1;
      final data = await _locationsApi.getLocations(
        cityId: _selectedCityId,
        tagIds: _selectedTagIds.isEmpty ? null : _selectedTagIds,
        type: _selectedType,
        q: _searchQuery,
        page: targetPage,
        limit: 20,
      );
      if (mounted) {
        setState(() {
          if (loadMore) {
            _locations.addAll(data);
            _currentPage = targetPage;
          } else {
            _locations = data;
          }
          _hasMore = data.length >= 20;
          _isLoading = false;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          if (!loadMore) {
            _errorMessage = e.toString();
          }
          _isLoading = false;
          _isLoadingMore = false;
        });
      }
    }
  }

  /// 显示筛选底部弹窗
  void _showFilterSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTokens.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _FilterBottomSheet(
        cities: _cities,
        tags: _tags,
        selectedCityId: _selectedCityId,
        selectedTagIds: _selectedTagIds,
        selectedType: _selectedType,
        onApply: (cityId, tagIds, type) {
          setState(() {
            _selectedCityId = cityId;
            _selectedTagIds = tagIds;
            _selectedType = type;
          });
          _loadLocations();
        },
      ),
    );
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
          '探索地点',
          style: TextStyle(color: AppTokens.textPrimary),
        ),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.tune, color: AppTokens.textSecondary),
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
                      color: AppTokens.brandPrimary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // 搜索栏
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '搜索地点...',
                hintStyle: const TextStyle(color: AppTokens.textTertiary),
                prefixIcon: const Icon(Icons.search, color: AppTokens.textTertiary),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppTokens.textTertiary),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = null;
                            _currentPage = 1;
                            _hasMore = true;
                          });
                          _loadLocations();
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
          // 内容区
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTokens.brandPrimary),
                  )
                : _errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline,
                                  size: 48, color: AppTokens.semanticError),
                              const SizedBox(height: 12),
                              Text(
                                '加载失败',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(color: AppTokens.textPrimary),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _errorMessage!,
                                style: const TextStyle(
                                    color: AppTokens.textSecondary, fontSize: 12),
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
                              style: TextStyle(color: AppTokens.textSecondary),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _loadLocations(),
                            color: AppTokens.brandPrimary,
                            child: NotificationListener<ScrollNotification>(
                              onNotification: (scrollInfo) {
                                if (scrollInfo.metrics.pixels >=
                                    scrollInfo.metrics.maxScrollExtent - 100) {
                                  _loadLocations(loadMore: true);
                                }
                                return false;
                              },
                              child: GridView.builder(
                                padding: const EdgeInsets.all(16),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  childAspectRatio: 0.8,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                ),
                                itemCount: _locations.length + (_hasMore ? 1 : 0),
                                itemBuilder: (context, index) {
                                  if (index >= _locations.length) {
                                    return const Center(
                                      child: Padding(
                                        padding: EdgeInsets.all(16),
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    );
                                  }
                                  final location = _locations[index];
                                  return _LocationGridCard(location: location);
                                },
                              ),
                            ),
                          ),
          ),
        ],
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
  final String? selectedType;
  final void Function(String? cityId, List<String> tagIds, String? type) onApply;

  const _FilterBottomSheet({
    required this.cities,
    required this.tags,
    required this.selectedCityId,
    required this.selectedTagIds,
    required this.selectedType,
    required this.onApply,
  });

  @override
  State<_FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<_FilterBottomSheet> {
  String? _cityId;
  late List<String> _tagIds;
  String? _type;

  // 地点类型选项
  static const _locationTypes = [
    ('hiking', '户外徒步', Icons.hiking),
    ('explore', '城市探索', Icons.explore),
    ('leisure', '休闲探店', Icons.coffee),
    ('travel', '旅行', Icons.flight),
  ];

  @override
  void initState() {
    super.initState();
    _cityId = widget.selectedCityId;
    _tagIds = List<String>.from(widget.selectedTagIds);
    _type = widget.selectedType;
  }

  void _reset() {
    setState(() {
      _cityId = null;
      _tagIds = [];
      _type = null;
    });
  }

  void _apply() {
    widget.onApply(_cityId, _tagIds, _type);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTokens.bgSurface,
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
                  color: AppTokens.borderDefault,
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
                  color: AppTokens.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Divider(height: 1, color: AppTokens.borderDefault),
            // 地点类型筛选
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Text(
                '地点类型',
                style: TextStyle(
                  color: AppTokens.textSecondary,
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
                children: [
                  // "全部" 选项
                  FilterChip(
                    label: const Text('全部'),
                    selected: _type == null,
                    onSelected: (_) => setState(() => _type = null),
                    backgroundColor: AppTokens.bgBase,
                    selectedColor: AppTokens.brandPrimary,
                    side: BorderSide(
                      color: _type == null
                          ? AppTokens.brandPrimary
                          : AppTokens.borderDefault,
                    ),
                    labelStyle: TextStyle(
                      color: _type == null ? Colors.white : AppTokens.textSecondary,
                      fontSize: 13,
                    ),
                    checkmarkColor: Colors.white,
                  ),
                  ..._locationTypes.map((type) {
                    final isSelected = _type == type.$1;
                    return FilterChip(
                      avatar: Icon(type.$3, size: 16, color: isSelected ? Colors.white : AppTokens.textSecondary),
                      label: Text(type.$2),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _type = type.$1),
                      backgroundColor: AppTokens.bgBase,
                      selectedColor: AppTokens.brandPrimary,
                      side: BorderSide(
                        color: isSelected
                            ? AppTokens.brandPrimary
                            : AppTokens.borderDefault,
                      ),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppTokens.textSecondary,
                        fontSize: 13,
                      ),
                      checkmarkColor: Colors.white,
                    );
                  }),
                ],
              ),
            ),
            // 城市筛选
            if (widget.cities.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  '城市',
                  style: TextStyle(
                    color: AppTokens.textSecondary,
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
                        backgroundColor: AppTokens.bgBase,
                        selectedColor: AppTokens.brandPrimary,
                        side: BorderSide(
                          color: _cityId == null
                              ? AppTokens.brandPrimary
                              : AppTokens.borderDefault,
                        ),
                        labelStyle: TextStyle(
                          color: _cityId == null
                              ? Colors.white
                              : AppTokens.textSecondary,
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
                            backgroundColor: AppTokens.bgBase,
                            selectedColor: AppTokens.brandPrimary,
                            side: BorderSide(
                              color: isSelected
                                  ? AppTokens.brandPrimary
                                  : AppTokens.borderDefault,
                            ),
                            labelStyle: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : AppTokens.textSecondary,
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
                    color: AppTokens.textSecondary,
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
                      backgroundColor: AppTokens.bgBase,
                      selectedColor: AppTokens.brandPrimary,
                      side: BorderSide(
                        color: selected ? AppTokens.brandPrimary : AppTokens.borderDefault,
                      ),
                      labelStyle: TextStyle(
                        color:
                            selected ? Colors.white : AppTokens.textSecondary,
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
                        foregroundColor: AppTokens.textSecondary,
                        side: const BorderSide(color: AppTokens.borderDefault),
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
                        gradient: AppTokens.gradientBrand,
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
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
          color: AppTokens.bgSurface,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
          child: Stack(
            children: [
              Positioned.fill(
                child: Image.network(
                  location.coverImage,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppTokens.bgSurface,
                    child: const Icon(Icons.landscape,
                        color: AppTokens.textTertiary, size: 48),
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
