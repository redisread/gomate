import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/users_api.dart';
import '../../../core/models/user.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_avatar.dart';

/// 个人资料页面
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _usersApi = UsersApi();
  UserStats? _stats;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  /// 从 /users/:id 接口加载统计数据（get-session 不含 stats）
  Future<void> _loadStats() async {
    try {
      final authState = ref.read(authProvider).valueOrNull;
      final userId = authState?.user?.id;
      if (userId == null) return;

      final user = await _usersApi.getUser(userId);
      if (mounted) {
        setState(() => _stats = user.stats);
      }
    } catch (_) {}
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确认退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('确认',
                style: TextStyle(color: AppTokens.semanticError)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    await ref.read(authProvider.notifier).logout();
  }

  String _getLevelLabel(String level) {
    switch (level) {
      case 'beginner':
        return '新手';
      case 'intermediate':
        return '进阶';
      case 'advanced':
        return '资深';
      case 'expert':
        return '专家';
      default:
        return '新手';
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    if (authState.isLoading) {
      return PopScope(
        canPop: true,
        child: const Scaffold(body: Center(child: CircularProgressIndicator())),
      );
    }

    final currentUser = authState.valueOrNull?.user;

    if (currentUser == null) {
      return PopScope(
        canPop: true,
        child: Scaffold(
          appBar: AppBar(title: const Text('个人资料')),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.person_outline_rounded,
                    size: 80, color: AppTokens.textTertiary),
                const SizedBox(height: AppTokens.space4),
                const Text('请先登录',
                    style: TextStyle(
                        fontSize: AppTokens.fontSizeL,
                        color: AppTokens.textPrimary)),
                const SizedBox(height: AppTokens.space6),
                ElevatedButton(
                  onPressed: () => context.push('/login'),
                  child: const Text('去登录'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final user = currentUser;
    final stats = _stats;

    return PopScope(
      canPop: true,
      child: Scaffold(
      appBar: AppBar(
        title: const Text('个人资料'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => context.go('/profile/edit'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTokens.space6),
              decoration: const BoxDecoration(
                gradient: AppTokens.gradientBrand,
              ),
              child: Column(
                children: [
                  AppAvatar.large(
                    name: user.displayName,
                    imageUrl: user.image,
                  ),
                  const SizedBox(height: AppTokens.space3),
                  Text(
                    user.displayName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: AppTokens.fontSizeXXL,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (user.bio != null) ...[
                    const SizedBox(height: AppTokens.space1),
                    Text(
                      user.bio!,
                      style: const TextStyle(
                          color: Colors.white70,
                          fontSize: AppTokens.fontSizeBase),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: AppTokens.space3),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _StatItem(
                        label: '已完成',
                        value: '${user.completedHikes} 次',
                      ),
                      Container(
                        width: 1,
                        height: 24,
                        color: Colors.white30,
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      _StatItem(
                        label: '创建队伍',
                        value: '${stats?.createdTeams ?? 0}',
                      ),
                      Container(
                        width: 1,
                        height: 24,
                        color: Colors.white30,
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      _StatItem(
                        label: '等级',
                        value: _getLevelLabel(user.level),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // 统计卡片区域（对齐 Web 端）
            Padding(
              padding: const EdgeInsets.all(AppTokens.space4),
              child: Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: '我发起的队伍',
                      value: stats?.createdTeams ?? 0,
                      icon: Icons.group_outlined,
                      color: AppTokens.brandPrimary,
                      onTap: () => context.push('/my-teams?tab=created'),
                    ),
                  ),
                  const SizedBox(width: AppTokens.space3),
                  Expanded(
                    child: _StatCard(
                      label: '加入他人队伍',
                      value: stats?.joinedTeams ?? 0,
                      icon: Icons.person_outline,
                      color: AppTokens.semanticInfo,
                      onTap: () => context.push('/my-teams?tab=joined'),
                    ),
                  ),
                  const SizedBox(width: AppTokens.space3),
                  Expanded(
                    child: _StatCard(
                      label: '已完成',
                      value: user.completedHikes,
                      icon: Icons.check_circle_outline,
                      color: AppTokens.semanticSuccess,
                      onTap: () => context.push('/my-teams?tab=history'),
                    ),
                  ),
                ],
              ),
            ),

            // 菜单列表
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppTokens.space4),
              child: Column(
                children: [
                  _MenuTile(
                    icon: Icons.hiking_outlined,
                    title: '我的队伍',
                    onTap: () => context.push('/my-teams'),
                  ),
                  _MenuTile(
                    icon: Icons.group_add_outlined,
                    title: '发布队伍',
                    onTap: () => context.push('/teams/create'),
                  ),
                  _MenuTile(
                    icon: Icons.favorite_border,
                    title: '我的收藏',
                    onTap: () => context.push('/favorites'),
                  ),
                  const Divider(height: 24),
                  _MenuTile(
                    icon: Icons.help_outline,
                    title: '帮助中心',
                    onTap: () => context.push('/help'),
                  ),
                  _MenuTile(
                    icon: Icons.info_outline,
                    title: '关于我们',
                    onTap: () => context.push('/about'),
                  ),
                  _MenuTile(
                    icon: Icons.description_outlined,
                    title: '服务条款',
                    onTap: () => context.push('/terms'),
                  ),
                  _MenuTile(
                    icon: Icons.privacy_tip_outlined,
                    title: '隐私政策',
                    onTap: () => context.push('/privacy'),
                  ),
                  _MenuTile(
                    icon: Icons.feedback_outlined,
                    title: '反馈建议',
                    onTap: () => context.push('/feedback'),
                  ),
                  _MenuTile(
                    icon: Icons.settings_outlined,
                    title: '账号设置',
                    onTap: () => context.push('/account-settings'),
                  ),
                  const Divider(height: 24),
                  _MenuTile(
                    icon: Icons.logout,
                    title: '退出登录',
                    textColor: AppTokens.semanticError,
                    onTap: _handleLogout,
                  ),
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

/// 统计数据项（头部简版）
class _StatItem extends StatelessWidget {
  final String label;
  final String value;

  const _StatItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 12),
        ),
      ],
    );
  }
}

/// 统计卡片（对齐 Web 端）
class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppTokens.space3),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppTokens.radiusL),
          border: Border.all(color: AppTokens.borderDefault),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: AppTokens.space2),
            Text(
              '$value',
              style: TextStyle(
                fontSize: AppTokens.fontSizeXXL,
                fontWeight: FontWeight.bold,
                color: AppTokens.textPrimary,
              ),
            ),
            const SizedBox(height: AppTokens.space1),
            Text(
              label,
              style: TextStyle(
                fontSize: AppTokens.fontSizeS,
                color: AppTokens.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 菜单项
class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color? textColor;

  const _MenuTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: textColor ?? AppTokens.textPrimary),
      title: Text(
        title,
        style: TextStyle(color: textColor ?? AppTokens.textPrimary),
      ),
      trailing: const Icon(Icons.chevron_right, color: AppTokens.textSecondary),
      onTap: onTap,
    );
  }
}
