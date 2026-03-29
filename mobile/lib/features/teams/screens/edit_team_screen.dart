import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/teams_api.dart';
import '../../../core/models/team.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

class EditTeamScreen extends ConsumerStatefulWidget {
  final String teamId;

  const EditTeamScreen({super.key, required this.teamId});

  @override
  ConsumerState<EditTeamScreen> createState() => _EditTeamScreenState();
}

class _EditTeamScreenState extends ConsumerState<EditTeamScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _teamsApi = TeamsApi();

  TeamModel? _team;
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  bool _isLeader = false;

  int _maxMembers = 10;
  String _time = '09:00';
  int _durationMin = 240;
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
    _loadTeam();
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

  Future<void> _loadTeam() async {
    final authState = ref.read(authProvider).valueOrNull;
    final currentUserId = authState?.user?.id;

    if (currentUserId == null) {
      if (mounted) context.go('/login');
      return;
    }

    try {
      final team = await _teamsApi.getTeam(widget.teamId);
      if (team.leaderId != currentUserId) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _isLeader = false;
            _error = '只有队长可以编辑队伍';
          });
        }
        return;
      }

      _requirementControllers =
          team.requirements.map((r) => TextEditingController(text: r)).toList();

      if (mounted) {
        setState(() {
          _team = team;
          _isLeader = true;
          _titleController.text = team.title;
          _descriptionController.text = team.description ?? '';
          _maxMembers = team.maxMembers;
          _time = team.time;
          _durationMin = team.durationMin;
          _requirementControllers = team.requirements
              .map((r) => TextEditingController(text: r))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = '获取队伍信息失败';
        });
      }
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final cleanedRequirements = _requirementControllers
          .map((c) => c.text.trim())
          .where((r) => r.isNotEmpty)
          .toList();

      await _teamsApi.updateTeam(widget.teamId, {
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'maxMembers': _maxMembers,
        'time': _time,
        'durationMin': _durationMin,
        'requirements': cleanedRequirements,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('队伍信息已更新')),
        );
        context.go('/teams/${widget.teamId}');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _error = e.toString().contains('只有队长') ? '只有队长可以修改队伍' : '保存失败，请重试';
        });
      }
    }
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

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppTokens.bgBase,
        body: const Center(
          child: CircularProgressIndicator(color: AppTokens.brandPrimary),
        ),
      );
    }

    if (!_isLeader || _team == null) {
      return Scaffold(
        backgroundColor: AppTokens.bgBase,
        appBar: AppBar(
          backgroundColor: AppTokens.bgBase,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppTokens.textSecondary),
            onPressed: () => context.go('/teams/${widget.teamId}'),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline,
                  size: 48, color: AppTokens.semanticError),
              const SizedBox(height: 16),
              Text(
                _error ?? '无权限编辑此队伍',
                style: const TextStyle(color: AppTokens.textSecondary),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/teams/${widget.teamId}'),
                child: const Text('返回队伍详情'),
              ),
            ],
          ),
        ),
      );
    }

    final team = _team!;

    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTokens.textSecondary),
          onPressed: () => context.go('/teams/${widget.teamId}'),
        ),
        title: const Text(
          '编辑队伍',
          style: TextStyle(
              color: AppTokens.textPrimary, fontWeight: FontWeight.w600),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle('队伍名称', Icons.edit_outlined, isRequired: true),
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
                  if (value == null || value.trim().isEmpty) return '请输入队伍名称';
                  if (value.trim().length < 4) return '名称至少 4 个字符';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              _buildSectionTitle('活动地点', Icons.location_on_outlined),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  color: AppTokens.bgSurface,
                  border: Border.all(color: AppTokens.borderDefault),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text(
                        '地点已设定',
                        style: TextStyle(color: AppTokens.textPrimary),
                      ),
                    ),
                    const Icon(Icons.lock_outline,
                        size: 16, color: AppTokens.textTertiary),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  '队伍创建后地点不可修改',
                  style: TextStyle(color: AppTokens.textTertiary, fontSize: 12),
                ),
              ),
              const SizedBox(height: 16),
              _buildSectionTitle('活动日期', Icons.calendar_today_outlined),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  color: AppTokens.bgSurface,
                  border: Border.all(color: AppTokens.borderDefault),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(team.date,
                        style: const TextStyle(color: AppTokens.textPrimary)),
                    const Icon(Icons.lock_outline,
                        size: 16, color: AppTokens.textTertiary),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  '队伍创建后日期不可修改',
                  style: TextStyle(color: AppTokens.textTertiary, fontSize: 12),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionTitle('集合时间', Icons.schedule_outlined),
                        DropdownButtonFormField<String>(
                          value: _time,
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: AppTokens.bgSurface,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                  color: AppTokens.borderDefault),
                            ),
                          ),
                          items: List.generate(24, (i) {
                            final hour = i.toString().padLeft(2, '0');
                            return DropdownMenuItem(
                              value: '$hour:00',
                              child: Text('$hour:00'),
                            );
                          }),
                          onChanged: (v) => setState(() => _time = v ?? _time),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionTitle('活动时长', Icons.timelapse_outlined),
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
                            return DropdownMenuItem(
                              value: m,
                              child: Text('${m ~/ 60} 小时'),
                            );
                          }).toList(),
                          onChanged: (v) =>
                              setState(() => _durationMin = v ?? _durationMin),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildSectionTitle(
                '最大人数',
                Icons.people_outlined,
                isRequired: true,
                hint: '至少 ${team.currentMembers} 人',
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove),
                    onPressed: _maxMembers > team.currentMembers
                        ? () => setState(() => _maxMembers--)
                        : null,
                  ),
                  Text(
                    '$_maxMembers 人',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: _maxMembers < 50
                        ? () => setState(() => _maxMembers++)
                        : null,
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  '当前已有成员，人数上限不能低于此数',
                  style: TextStyle(color: AppTokens.textTertiary, fontSize: 12),
                ),
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
                        '修改后的信息会立即生效，已申请的成员会看到更新后的内容',
                        style: TextStyle(color: AppTokens.brandPrimaryDark),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTokens.semanticError.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          color: AppTokens.semanticError),
                      const SizedBox(width: 8),
                      Text(_error!,
                          style:
                              const TextStyle(color: AppTokens.semanticError)),
                    ],
                  ),
                ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.go('/teams/${widget.teamId}'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppTokens.borderDefault),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('取消',
                          style: TextStyle(color: AppTokens.textSecondary)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _handleSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTokens.brandPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('保存修改', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
            ],
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
