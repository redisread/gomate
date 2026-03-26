import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/locations_api.dart';
import '../../../core/api/teams_api.dart';
import '../../../core/models/location.dart';
import '../../../shared/theme/app_tokens.dart';

/// 创建队伍页面
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
  String? _selectedLocationId;
  DateTime _startTime = DateTime.now().add(const Duration(days: 3));
  int _maxMembers = 10;
  bool _isLoading = false;
  bool _isLoadingLocations = true;

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
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingLocations = false);
    }
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
      final team = await _teamsApi.createTeam({
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'locationId': _selectedLocationId,
        'startTime': _startTime.millisecondsSinceEpoch ~/ 1000,
        'endTime':
            _startTime.add(const Duration(hours: 6)).millisecondsSinceEpoch ~/
                1000,
        'maxMembers': _maxMembers,
        'durationMin': 360,
      });
      if (mounted) {
        context.go('/teams/${team.id}');
      }
    } catch (e) {
      if (mounted) {
        // 未登录时跳转登录页
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
                // 标题
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: '队伍名称',
                    hintText: '例如：梧桐山赏秋徒步',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return '请输入队伍名称';
                    if (value.length < 4) return '名称至少 4 个字符';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // 描述
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: '活动介绍（可选）',
                    hintText: '描述这次活动的特点、路线、注意事项等',
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 16),

                // 选择地点
                const Text(
                  '活动地点',
                  style: TextStyle(fontSize: 14, color: AppTokens.textSecondary),
                ),
                const SizedBox(height: 8),
                _isLoadingLocations
                    ? const CircularProgressIndicator()
                    : DropdownButtonFormField<String>(
                        value: _selectedLocationId,
                        hint: const Text('选择徒步地点'),
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                        ),
                        items: _locations.map((loc) {
                          return DropdownMenuItem(
                            value: loc.id,
                            child: Text(loc.name),
                          );
                        }).toList(),
                        onChanged: (value) =>
                            setState(() => _selectedLocationId = value),
                      ),
                const SizedBox(height: 16),

                // 活动时间
                const Text(
                  '活动时间',
                  style: TextStyle(fontSize: 14, color: AppTokens.textSecondary),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: _pickDateTime,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTokens.borderDefault),
                      borderRadius: BorderRadius.circular(4),
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
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 最大人数
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('最大人数'),
                    Row(
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

                const SizedBox(height: 32),

                // 发布按钮
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleCreate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTokens.brandPrimary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
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
}
