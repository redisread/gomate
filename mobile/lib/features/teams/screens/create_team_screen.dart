import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/api/teams_api.dart';
import '../../../core/models/location.dart';
import '../../../shared/theme/app_tokens.dart';

class CreateTeamScreen extends ConsumerStatefulWidget {
  final String? locationId;

  const CreateTeamScreen({
    super.key,
    this.locationId,
  });

  @override
  ConsumerState<CreateTeamScreen> createState() => _CreateTeamScreenState();
}

class _CreateTeamScreenState extends ConsumerState<CreateTeamScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _teamsApi = TeamsApi();
  final _locationsApi = LocationsApi();

  List<LocationModel> _locations = [];
  LocationModel? _selectedLocation;
  List<RouteModel> _routes = [];
  RouteModel? _selectedRoute;
  String? _selectedLocationId;
  DateTime _startTime = DateTime.now().add(const Duration(days: 3));
  int _maxMembers = 10;
  int _durationMin = 240;
  bool _isLoading = false;
  bool _isLoadingLocations = true;
  bool _durationManuallyEdited = false;
  int? _recommendedDuration;

  List<TextEditingController> _requirementControllers = [];

  static const _durationOptions = [
    120,
    180,
    240,
    300,
    360,
    420,
    480,
    540,
    600,
    720
  ];

  @override
  void initState() {
    super.initState();
    _selectedLocationId = widget.locationId;
    _loadLocations();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    for (final c in _requirementControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadLocations() async {
    try {
      final data = await _locationsApi.getLocations(limit: 100);
      if (mounted) {
        setState(() {
          _locations = data;
          _isLoadingLocations = false;
        });
        if (_selectedLocationId != null) {
          _onLocationChanged(_selectedLocationId!);
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingLocations = false);
    }
  }

  void _onLocationChanged(String locationId) {
    final location = _locations.firstWhere(
      (l) => l.id == locationId,
      orElse: () => _locations.first,
    );
    setState(() {
      _selectedLocation = location;
      _routes = location.routes;
      _selectedRoute = null;
      _durationManuallyEdited = false;
    });

    if (_routes.isNotEmpty) {
      final firstRoute = _routes.first;
      setState(() {
        _selectedRoute = firstRoute;
        _recommendedDuration = _calculateRecommendedDuration(firstRoute);
        if (!_durationManuallyEdited) {
          _durationMin = _recommendedDuration ?? 240;
        }
      });
    } else {
      setState(() {
        _recommendedDuration = null;
        if (!_durationManuallyEdited) {
          _durationMin = 240;
        }
      });
    }
  }

  int _calculateRecommendedDuration(RouteModel route) {
    if (route.durationMin > 0 && route.durationMax > 0) {
      return (route.durationMin + route.durationMax) ~/ 2;
    }
    if (route.durationMin > 0) {
      return route.durationMin;
    }
    final difficultyDuration = {
      Difficulty.easy: 180,
      Difficulty.moderate: 300,
      Difficulty.hard: 420,
      Difficulty.expert: 600,
    };
    return difficultyDuration[route.difficulty] ?? 240;
  }

  void _onRouteChanged(RouteModel? route) {
    setState(() {
      _selectedRoute = route;
      if (route != null) {
        _recommendedDuration = _calculateRecommendedDuration(route);
        if (!_durationManuallyEdited) {
          _durationMin = _recommendedDuration ?? 240;
        }
      }
    });
  }

  void _addRequirement() {
    if (_requirementControllers.length < 10) {
      setState(() {
        _requirementControllers.add(TextEditingController());
      });
    }
  }

  void _removeRequirement(int index) {
    setState(() {
      _requirementControllers[index].dispose();
      _requirementControllers.removeAt(index);
    });
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startTime,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_startTime),
    );
    if (time == null) return;

    setState(() {
      _startTime = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedLocationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请选择活动地点')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final requirements = _requirementControllers
          .map((c) => c.text.trim())
          .where((r) => r.isNotEmpty)
          .toList();

      final team = await _teamsApi.createTeam({
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'locationId': _selectedLocationId,
        'routeId': _selectedRoute?.id,
        'startTime': _startTime.millisecondsSinceEpoch ~/ 1000,
        'endTime': _startTime
                .add(Duration(minutes: _durationMin))
                .millisecondsSinceEpoch ~/
            1000,
        'maxMembers': _maxMembers,
        'durationMin': _durationMin,
        'requirements': requirements,
      });
      if (mounted) {
        context.go('/teams/${team.id}');
      }
    } catch (e) {
      if (mounted) {
        context.go('/login');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('发布队伍'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionTitle('队伍名称', Icons.edit_outlined,
                    isRequired: true),
                TextFormField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    hintText: '例如：梧桐山赏秋徒步',
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppTokens.borderDefault),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return '请输入队伍名称';
                    if (value.length < 4) return '名称至少 4 个字符';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildSectionTitle('活动地点', Icons.location_on_outlined,
                    isRequired: true),
                _isLoadingLocations
                    ? const CircularProgressIndicator(
                        color: AppTokens.brandPrimary)
                    : DropdownButtonFormField<String>(
                        value: _selectedLocationId,
                        hint: const Text('选择徒步地点'),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: AppTokens.bgSurface,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                                color: AppTokens.borderDefault),
                          ),
                        ),
                        items: _locations.map((loc) {
                          return DropdownMenuItem(
                            value: loc.id,
                            child: Text(loc.name),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() => _selectedLocationId = value);
                          if (value != null) _onLocationChanged(value);
                        },
                      ),
                const SizedBox(height: 16),
                if (_routes.isNotEmpty) ...[
                  _buildSectionTitle('徒步路线', Icons.route_outlined,
                      hint: '选择路线后可自动推荐时长'),
                  DropdownButtonFormField<String>(
                    value: _selectedRoute?.id,
                    hint: const Text('选择一条路线（可选）'),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppTokens.bgSurface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide:
                            const BorderSide(color: AppTokens.borderDefault),
                      ),
                    ),
                    items: _routes.map((route) {
                      return DropdownMenuItem(
                        value: route.id,
                        child: Text(
                            '${route.name} - ${route.difficulty.label} | ${route.durationMin ~/ 60}-${route.durationMax ~/ 60}小时'),
                      );
                    }).toList(),
                    onChanged: (value) {
                      final route = _routes.firstWhere(
                        (r) => r.id == value,
                        orElse: () => _routes.first,
                      );
                      _onRouteChanged(value == null ? null : route);
                    },
                  ),
                  const SizedBox(height: 16),
                ],
                _buildSectionTitle('活动时间', Icons.calendar_today_outlined,
                    isRequired: true),
                GestureDetector(
                  onTap: _pickDateTime,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTokens.borderDefault),
                      borderRadius: BorderRadius.circular(12),
                      color: AppTokens.bgSurface,
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today_outlined,
                            color: AppTokens.textSecondary),
                        const SizedBox(width: 8),
                        Text(
                          '${_startTime.year}/${_startTime.month}/${_startTime.day} '
                          '${_startTime.hour.toString().padLeft(2, '0')}:'
                          '${_startTime.minute.toString().padLeft(2, '0')}',
                          style: const TextStyle(color: AppTokens.textPrimary),
                        ),
                      ],
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text(
                    '队伍创建后日期不可修改',
                    style:
                        TextStyle(color: AppTokens.textTertiary, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionTitle(
                            '活动时长',
                            Icons.timelapse_outlined,
                            isRequired: true,
                            hint: _recommendedDuration != null
                                ? '推荐${_recommendedDuration! ~/ 60}小时'
                                : null,
                          ),
                          DropdownButtonFormField<int>(
                            value: _durationMin,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: AppTokens.bgSurface,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                    color: AppTokens.borderDefault),
                              ),
                            ),
                            items: _durationOptions.map((m) {
                              final isRecommended = m == _recommendedDuration;
                              return DropdownMenuItem(
                                value: m,
                                child: Text(
                                  '${m ~/ 60}小时${isRecommended ? '（推荐）' : ''}',
                                  style: TextStyle(
                                    color: isRecommended
                                        ? AppTokens.brandPrimary
                                        : null,
                                    fontWeight:
                                        isRecommended ? FontWeight.w600 : null,
                                  ),
                                ),
                              );
                            }).toList(),
                            onChanged: (value) {
                              setState(() {
                                _durationMin = value ?? 240;
                                _durationManuallyEdited = true;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionTitle('最大人数', Icons.people_outlined,
                              isRequired: true, hint: '2-50人'),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove),
                                onPressed: _maxMembers > 2
                                    ? () => setState(() => _maxMembers--)
                                    : null,
                              ),
                              Text(
                                '$_maxMembers 人',
                                style: const TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              IconButton(
                                icon: const Icon(Icons.add),
                                onPressed: _maxMembers < 50
                                    ? () => setState(() => _maxMembers++)
                                    : null,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildSectionTitle('活动介绍', Icons.notes_outlined),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: '描述这次活动的特点、路线、注意事项等',
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppTokens.borderDefault),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _buildSectionTitle('参与要求', Icons.list_alt_outlined,
                    hint: '最多 10 条'),
                ..._requirementControllers.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final controller = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: AppTokens.brandPrimaryLight,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              '${idx + 1}',
                              style: const TextStyle(
                                color: AppTokens.brandPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: controller,
                            decoration: InputDecoration(
                              hintText: '例如：需要有徒步经验',
                              filled: true,
                              fillColor: AppTokens.bgSurface,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                    color: AppTokens.borderDefault),
                              ),
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close,
                              color: AppTokens.semanticError),
                          onPressed: () => _removeRequirement(idx),
                        ),
                      ],
                    ),
                  );
                }),
                if (_requirementControllers.length < 10)
                  GestureDetector(
                    onTap: _addRequirement,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppTokens.borderDefault),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Center(
                        child: Text(
                          '+ 添加一条',
                          style: TextStyle(color: AppTokens.textSecondary),
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTokens.brandPrimaryLight.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppTokens.brandPrimary.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.lightbulb_outline,
                          color: AppTokens.brandPrimary),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          '发布后队长会自动加入队伍，其他成员需要申请加入',
                          style: TextStyle(color: AppTokens.brandPrimaryDark),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleCreate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTokens.brandPrimary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('发布队伍', style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon,
      {bool isRequired = false, String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppTokens.textSecondary),
          const SizedBox(width: 6),
          Text(
            title,
            style: const TextStyle(
              color: AppTokens.textPrimary,
              fontWeight: FontWeight.w500,
              fontSize: 14,
            ),
          ),
          if (isRequired)
            const Text('*', style: TextStyle(color: AppTokens.semanticError)),
          if (hint != null)
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: Text(
                hint,
                style: const TextStyle(
                    color: AppTokens.textTertiary, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}
