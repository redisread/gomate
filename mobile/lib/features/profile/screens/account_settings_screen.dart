import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

/// 账号设置页面
class AccountSettingsScreen extends ConsumerWidget {
  const AccountSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider).valueOrNull;
    final user = authState?.user;

    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          '账号设置',
          style: TextStyle(
            color: AppTokens.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTokens.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 账号信息
          _buildSection(
            title: '账号信息',
            children: [
              _buildTile(
                icon: Icons.email_outlined,
                title: '邮箱',
                value: user?.email ?? '未设置',
                onTap: () => _showComingSoon(context),
              ),
              _buildTile(
                icon: Icons.chat_outlined,
                title: '微信',
                value: user?.wechat ?? '未绑定',
                onTap: () => _showComingSoon(context),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // 安全设置
          _buildSection(
            title: '安全设置',
            children: [
              _buildTile(
                icon: Icons.lock_outline,
                title: '修改密码',
                onTap: () => context.push('/reset-password'),
              ),
              _buildTile(
                icon: Icons.security_outlined,
                title: '账号安全',
                onTap: () => _showComingSoon(context),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // 第三方账号
          _buildSection(
            title: '第三方账号',
            children: [
              _buildTile(
                icon: Icons.wechat,
                title: '微信',
                value: '未绑定',
                onTap: () => _showComingSoon(context),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // 危险操作
          _buildSection(
            title: '账号管理',
            children: [
              _buildTile(
                icon: Icons.delete_outline,
                title: '注销账号',
                titleColor: AppTokens.semanticError,
                onTap: () => _showDeleteAccountDialog(context, ref),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTokens.textSecondary,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: AppTokens.bgSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTokens.borderDefault),
          ),
          child: Column(
            children: _divideChildren(children),
          ),
        ),
      ],
    );
  }

  List<Widget> _divideChildren(List<Widget> children) {
    final result = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      result.add(children[i]);
      if (i < children.length - 1) {
        result.add(const Divider(height: 1, indent: 56));
      }
    }
    return result;
  }

  Widget _buildTile({
    required IconData icon,
    required String title,
    String? value,
    Color? titleColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 24, color: titleColor ?? AppTokens.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  color: titleColor ?? AppTokens.textPrimary,
                ),
              ),
            ),
            if (value != null) ...[
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTokens.textTertiary,
                ),
              ),
              const SizedBox(width: 8),
            ],
            const Icon(
              Icons.chevron_right,
              size: 20,
              color: AppTokens.textTertiary,
            ),
          ],
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('该功能正在开发中，敬请期待'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('注销账号'),
        content: const Text('确定要注销账号吗？此操作不可恢复，所有数据将被永久删除。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('请联系客服进行账号注销'),
                  duration: Duration(seconds: 3),
                ),
              );
            },
            style: TextButton.styleFrom(foregroundColor: AppTokens.semanticError),
            child: const Text('确认注销'),
          ),
        ],
      ),
    );
  }
}