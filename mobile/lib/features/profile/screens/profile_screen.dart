import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

/// 个人资料页面
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
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
    // 退出登录后路由守卫会自动重定向到登录页
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    if (authState.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final currentUser = authState.valueOrNull?.user;

    // 未登录时显示登录入口（路由守卫会重定向，此处作为兜底）
    if (currentUser == null) {
      return Scaffold(
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
      );
    }

    final user = currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('个人资料'),
        // Tab 页面无需返回按钮，移除 leading
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
            // 头部用户信息（蓝绿渐变）
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTokens.space6),
              decoration: const BoxDecoration(
                gradient: AppTokens.gradientBrand,
              ),
              child: Column(
                children: [
                  // 头像
                  _UserAvatar(
                    imageUrl: user.image,
                    displayName: user.displayName,
                    radius: 40,
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
                  // 统计数据
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
                        label: '等级',
                        value: _getLevelLabel(user.level),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // 菜单列表
            Padding(
              padding: const EdgeInsets.all(AppTokens.space4),
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
                    onTap: () {},
                  ),
                  _MenuTile(
                    icon: Icons.feedback_outlined,
                    title: '反馈建议',
                    onTap: () => context.push('/feedback'),
                  ),
                  _MenuTile(
                    icon: Icons.settings_outlined,
                    title: '账号设置',
                    onTap: () {},
                  ),
                  const Divider(height: 24),
                  _MenuTile(
                    icon: Icons.logout,
                    title: '退出登录',
                    textColor: AppTokens.semanticError,
                    onTap: () => _handleLogout(context, ref),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 等级中文映射
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
}

/// 统计数据项
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
          style:
              const TextStyle(color: Colors.white70, fontSize: 12),
        ),
      ],
    );
  }
}

/// 用户头像（支持网络图片 + 加载失败回退首字母）
class _UserAvatar extends StatelessWidget {
  final String? imageUrl;
  final String displayName;
  final double radius;

  const _UserAvatar({
    required this.imageUrl,
    required this.displayName,
    required this.radius,
  });

  @override
  Widget build(BuildContext context) {
    final placeholder = CircleAvatar(
      radius: radius,
      backgroundColor: Colors.white24,
      child: Text(
        displayName.isNotEmpty ? displayName.substring(0, 1) : '?',
        style: TextStyle(
          fontSize: radius * 0.8,
          color: Colors.white,
          fontWeight: FontWeight.bold,
        ),
      ),
    );

    if (imageUrl == null || imageUrl!.isEmpty) {
      debugPrint('[_UserAvatar] imageUrl is null/empty, showing placeholder');
      return placeholder;
    }

    debugPrint('[_UserAvatar] loading imageUrl: $imageUrl');

    return CachedNetworkImage(
      imageUrl: imageUrl!,
      imageBuilder: (context, imageProvider) => CircleAvatar(
        radius: radius,
        backgroundImage: imageProvider,
      ),
      placeholder: (context, url) => placeholder,
      errorWidget: (context, url, error) {
        debugPrint('[_UserAvatar] load FAILED: $url, error: $error');
        return placeholder;
      },
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
      trailing:
          const Icon(Icons.chevron_right, color: AppTokens.textSecondary),
      onTap: onTap,
    );
  }
}
