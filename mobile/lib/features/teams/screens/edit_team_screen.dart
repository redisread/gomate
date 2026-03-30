import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/teams_api.dart';
import '../../../core/models/team.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

/// 编辑队伍页面
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

  List<TextEditingController> _requirementControllers = [];
  
  TeamModel? _team;
  int _maxMembers = 10; // 本地状态跟踪最大人数
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isLeader = false;

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
    try {
      final team = await _teamsApi.getTeam(widget.teamId);
      final authState = ref.read(authProvider).valueOrNull;
      final currentUserId = authState?.user?.id;
      
      // 检查是否为队长
      final isLeader = currentUserId != null && currentUserId == team.leaderId;
      
      if (!isLeader) {
        // 非队长重定向到详情页
        if (mounted) {
          context.go('/teams/${widget.teamId}');
        }
        return;
      }

      if (mounted) {
        setState(() {
          _team = team;
          _maxMembers = team.maxMembers; // 初始化本地状态
          _isLeader = true;
          _titleController.text = team.title;
          _descriptionController.text = team.description ?? '';
          
          // 初始化参与要求控制器
          _requirementControllers = team.requirements
              .map((req) => TextEditingController(text: req))
              .toList();
          
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        // 加载失败，返回详情页
        context.go('/teams/${widget.teamId}');
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

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSaving = true);
    try {
      final requirements = _requirementControllers
          .map((c) => c.text.trim())
          .where((r) => r.isNotEmpty)
          .toList();

      final updatedTeam = await _teamsApi.updateTeam(widget.teamId, {
        'title': _titleController.text.trim(),
        'maxMembers': _maxMembers,
        'description': _descriptionController.text.trim(),
        'requirements': requirements,
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('队伍信息已更新')),
        );
        // 返回详情页
        context.go('/teams/${updatedTeam.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('保存失败，请重试')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (!_isLeader || _team == null) {
      // 非队长或团队不存在，显示错误页面
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('无权限编辑')),
      );
    }

    final team = _team!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('编辑队伍'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 队伍标题
                _buildSectionTitle('队伍名称', Icons.edit_outlined, isRequired: true),
                TextFormField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    hintText: '例如：梧桐山赏秋徒步',
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTokens.borderDefault),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return '请输入队伍名称';
                    if (value.length < 3) return '名称至少 3 个字符';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // 最大人数
                _buildSectionTitle('最大人数', Icons.people_outlined, hint: '2-50人'),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTokens.borderDefault),
                    borderRadius: BorderRadius.circular(12),
                    color: AppTokens.bgSurface,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$_maxMembers 人',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove),
                            onPressed: _maxMembers > 2
                                ? () => setState(() => _maxMembers--)
                                : null,
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
                const SizedBox(height: 16),

                // 队伍描述
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
                      borderSide: const BorderSide(color: AppTokens.borderDefault),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 参与要求
                _buildSectionTitle('参与要求', Icons.list_alt_outlined, hint: '最多 10 条'),
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
                                borderSide: const BorderSide(color: AppTokens.borderDefault),
                              ),
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppTokens.semanticError),
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
                const SizedBox(height: 16),

                // 只读信息提示
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTokens.bgSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTokens.borderDefault),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '核心信息不可修改',
                        style: TextStyle(
                          color: AppTokens.textTertiary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _InfoRow(
                        icon: Icons.calendar_today_outlined,
                        label: '活动日期',
                        value: team.date,
                      ),
                      _InfoRow(
                        icon: Icons.access_time_outlined,
                        label: '活动时间',
                        value: team.time,
                      ),
                      _InfoRow(
                        icon: Icons.location_on_outlined,
                        label: '活动地点',
                        value: team.locationId,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 保存按钮
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _handleSave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTokens.brandPrimary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isSaving
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
                style: const TextStyle(color: AppTokens.textTertiary, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}

/// 信息行组件
class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppTokens.textSecondary),
          const SizedBox(width: 8),
          Text(
            '$label：',
            style: const TextStyle(color: AppTokens.textSecondary, fontSize: 13),
          ),
          Text(value, style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }
}