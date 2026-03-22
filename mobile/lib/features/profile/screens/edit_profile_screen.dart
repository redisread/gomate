import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

/// 编辑个人资料页面
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nicknameCtrl;
  late TextEditingController _bioCtrl;
  late TextEditingController _wechatCtrl;

  String _level = 'beginner';
  String _gender = '';

  File? _pendingAvatar; // 待上传的本地头像文件
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).valueOrNull?.user;
    _nicknameCtrl = TextEditingController(text: user?.nickname ?? user?.name ?? '');
    _bioCtrl = TextEditingController(text: user?.bio ?? '');
    _wechatCtrl = TextEditingController(text: user?.wechat ?? '');
    _level = user?.level ?? 'beginner';
    _gender = user?.gender ?? '';
  }

  @override
  void dispose() {
    _nicknameCtrl.dispose();
    _bioCtrl.dispose();
    _wechatCtrl.dispose();
    super.dispose();
  }

  /// 选择头像（相册 / 拍照）
  Future<void> _pickAvatar(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: source,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 85,
    );
    if (picked == null) return;
    setState(() => _pendingAvatar = File(picked.path));
  }

  /// 弹出选择来源 Sheet
  void _showAvatarPicker() {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('从相册选择'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAvatar(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('拍照'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAvatar(ImageSource.camera);
              },
            ),
          ],
        ),
      ),
    );
  }

  /// 保存修改
  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      final notifier = ref.read(authProvider.notifier);

      // 先获取头像 URL（如有），不触发 state 更新
      String? avatarUrl;
      if (_pendingAvatar != null) {
        avatarUrl = await notifier.uploadAvatar(_pendingAvatar!);
      }

      // 合并头像 URL 与文字信息，单次 state 更新
      await notifier.updateUser(
        nickname: _nicknameCtrl.text.trim(),
        bio: _bioCtrl.text.trim(),
        wechat: _wechatCtrl.text.trim(),
        level: _level,
        gender: _gender.isEmpty ? null : _gender,
        image: avatarUrl,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('保存成功')),
      );
      context.go('/profile');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('保存失败：$e')),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).valueOrNull?.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('编辑资料'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('保存', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ─── 头像 ───────────────────────────────────────────────
              Center(
                child: GestureDetector(
                  onTap: _showAvatarPicker,
                  child: Stack(
                    children: [
                      _AvatarPreview(
                        pendingFile: _pendingAvatar,
                        networkUrl: user?.image,
                        displayName: user?.displayName ?? '',
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: AppTokens.brandPrimary,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.camera_alt, size: 16, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  '点击更换头像',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ),
              const SizedBox(height: 24),

              // ─── 昵称 ───────────────────────────────────────────────
              _SectionLabel('昵称'),
              TextFormField(
                controller: _nicknameCtrl,
                decoration: const InputDecoration(
                  hintText: '请输入昵称',
                  border: OutlineInputBorder(),
                ),
                maxLength: 20,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? '昵称不能为空' : null,
              ),
              const SizedBox(height: 16),

              // ─── 个人简介 ────────────────────────────────────────────
              _SectionLabel('个人简介'),
              TextFormField(
                controller: _bioCtrl,
                decoration: const InputDecoration(
                  hintText: '介绍一下自己吧',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
                maxLength: 100,
              ),
              const SizedBox(height: 16),

              // ─── 徒步等级 ────────────────────────────────────────────
              _SectionLabel('徒步等级'),
              _LevelSelector(
                value: _level,
                onChanged: (v) => setState(() => _level = v),
              ),
              const SizedBox(height: 16),

              // ─── 性别 ────────────────────────────────────────────────
              _SectionLabel('性别'),
              _GenderSelector(
                value: _gender,
                onChanged: (v) => setState(() => _gender = v),
              ),
              const SizedBox(height: 16),

              // ─── 微信号 ──────────────────────────────────────────────
              _SectionLabel('微信号'),
              TextFormField(
                controller: _wechatCtrl,
                decoration: const InputDecoration(
                  hintText: '请输入微信号（可选）',
                  border: OutlineInputBorder(),
                ),
                maxLength: 30,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── 头像预览组件 ─────────────────────────────────────────────────────────────

class _AvatarPreview extends StatelessWidget {
  final File? pendingFile;
  final String? networkUrl;
  final String displayName;

  const _AvatarPreview({
    required this.pendingFile,
    required this.networkUrl,
    required this.displayName,
  });

  @override
  Widget build(BuildContext context) {
    ImageProvider? provider;
    if (pendingFile != null) {
      provider = FileImage(pendingFile!);
    } else if (networkUrl != null) {
      provider = NetworkImage(networkUrl!);
    }

    return CircleAvatar(
      radius: 48,
      backgroundColor: Colors.grey[200],
      backgroundImage: provider,
      child: provider == null
          ? Text(
              displayName.isNotEmpty ? displayName.substring(0, 1) : '?',
              style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
            )
          : null,
    );
  }
}

// ─── 等级选择器 ───────────────────────────────────────────────────────────────

class _LevelSelector extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const _LevelSelector({required this.value, required this.onChanged});

  static const _levels = [
    ('beginner', '新手'),
    ('intermediate', '进阶'),
    ('advanced', '资深'),
    ('expert', '专家'),
  ];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: _levels.map((item) {
        final selected = value == item.$1;
        return ChoiceChip(
          label: Text(item.$2),
          selected: selected,
          selectedColor: AppTokens.brandPrimary,
          labelStyle: TextStyle(
            color: selected ? Colors.white : Colors.black87,
          ),
          onSelected: (_) => onChanged(item.$1),
        );
      }).toList(),
    );
  }
}

// ─── 性别选择器 ───────────────────────────────────────────────────────────────

class _GenderSelector extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const _GenderSelector({required this.value, required this.onChanged});

  static const _genders = [
    ('male', '男'),
    ('female', '女'),
    ('other', '其他'),
  ];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: _genders.map((item) {
        final selected = value == item.$1;
        return ChoiceChip(
          label: Text(item.$2),
          selected: selected,
          selectedColor: AppTokens.brandPrimary,
          labelStyle: TextStyle(
            color: selected ? Colors.white : Colors.black87,
          ),
          onSelected: (_) => onChanged(item.$1),
        );
      }).toList(),
    );
  }
}

// ─── 辅助 Label ───────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    );
  }
}
