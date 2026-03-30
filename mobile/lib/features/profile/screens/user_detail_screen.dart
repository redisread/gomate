import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/users_api.dart';
import '../../../core/models/user.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_empty_state.dart';
import '../../../shared/widgets/app_shimmer.dart';

/// 用户公开资料页
class UserDetailScreen extends StatefulWidget {
  final String userId;

  const UserDetailScreen({
    super.key,
    required this.userId,
  });

  @override
  State<UserDetailScreen> createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends State<UserDetailScreen> {
  UserModel? _user;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      final user = await UsersApi().getUser(widget.userId);
      setState(() {
        _user = user;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = '加载用户信息失败';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          '用户资料',
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
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return _buildShimmer();
    }

    if (_errorMessage != null) {
      return Center(
        child: AppErrorState(
          message: _errorMessage,
          onRetry: _loadUser,
        ),
      );
    }

    if (_user == null) {
      return const Center(
        child: AppEmptyState(
          icon: Icons.person_off_outlined,
          title: '用户不存在',
          subtitle: '该用户可能已被删除或不存在',
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTokens.space4),
      child: Column(
        children: [
          // 用户卡片
          _buildUserCard(_user!),
          const SizedBox(height: AppTokens.space4),

          // 统计卡片
          _buildStatsCard(_user!),
          const SizedBox(height: AppTokens.space4),

          // 额外信息
          if (_user!.bio != null && _user!.bio!.isNotEmpty) ...[
            _buildInfoCard(
              title: '个人简介',
              icon: Icons.person_outline,
              content: _user!.bio!,
            ),
            const SizedBox(height: AppTokens.space4),
          ],

          // 微信号（如果有）
          if (_user!.wechat != null && _user!.wechat!.isNotEmpty) ...[
            _buildInfoCard(
              title: '微信号',
              icon: Icons.chat_bubble_outline,
              content: _user!.wechat!,
              isCopyable: true,
            ),
            const SizedBox(height: AppTokens.space4),
          ],

          // 加入日期
          _buildInfoCard(
            title: '加入日期',
            icon: Icons.calendar_today_outlined,
            content: _formatDate(_user!.createdAt),
          ),
          const SizedBox(height: AppTokens.space4),

          // 户外经验（如果有）
          if (_user!.experience != null && _user!.experience!.isNotEmpty) ...[
            _buildInfoCard(
              title: '户外经验',
              icon: Icons.hiking_outlined,
              content: _user!.experience!,
            ),
            const SizedBox(height: AppTokens.space4),
          ],

          // 装备清单（如果有）
          if (_user!.equipment.isNotEmpty) ...[
            _buildEquipmentCard(_user!.equipment),
            const SizedBox(height: AppTokens.space4),
          ],
        ],
      ),
    );
  }

  Widget _buildUserCard(UserModel user) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppTokens.space6),
      decoration: BoxDecoration(
        gradient: AppTokens.gradientBrand,
        borderRadius: BorderRadius.circular(AppTokens.radiusL),
        boxShadow: [
          BoxShadow(
            color: AppTokens.brandPrimary.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // 头像
          AppAvatar.large(
            name: user.displayName,
            imageUrl: user.image,
          ),
          const SizedBox(height: AppTokens.space3),
          // 名称
          Text(
            user.displayName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: AppTokens.fontSizeXXL,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppTokens.space2),
          // 等级徽章
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTokens.space3,
              vertical: AppTokens.space1,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(AppTokens.radiusS),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _getLevelIcon(user.level),
                  size: 16,
                  color: Colors.white,
                ),
                const SizedBox(width: AppTokens.space1),
                Text(
                  _getLevelLabel(user.level),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: AppTokens.fontSizeS,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          // 性别和年龄（如果有）
          if (user.gender != null) ...[
            const SizedBox(height: AppTokens.space2),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  user.gender == 'male'
                      ? Icons.male
                      : user.gender == 'female'
                          ? Icons.female
                          : Icons.person,
                  size: 16,
                  color: Colors.white70,
                ),
                const SizedBox(width: AppTokens.space1),
                Text(
                  user.gender == 'male' ? '男' : user.gender == 'female' ? '女' : '其他',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: AppTokens.fontSizeBase,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatsCard(UserModel user) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppTokens.space4),
      decoration: BoxDecoration(
        color: AppTokens.bgSurface,
        borderRadius: BorderRadius.circular(AppTokens.radiusL),
        border: Border.all(color: AppTokens.borderDefault, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '数据统计',
            style: TextStyle(
              fontSize: AppTokens.fontSizeL,
              fontWeight: FontWeight.w600,
              color: AppTokens.textPrimary,
            ),
          ),
          const SizedBox(height: AppTokens.space4),
          Row(
            children: [
              Expanded(
                child: _StatItem(
                  icon: Icons.flag_outlined,
                  label: '创建队伍',
                  value: '${user.stats?.createdTeams ?? 0}',
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.hiking_outlined,
                  label: '参加活动',
                  value: '${user.stats?.joinedTeams ?? 0}',
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.check_circle_outline,
                  label: '完成活动',
                  value: '${user.stats?.completedTeams ?? 0}',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    required String content,
    bool isCopyable = false,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppTokens.space4),
      decoration: BoxDecoration(
        color: AppTokens.bgSurface,
        borderRadius: BorderRadius.circular(AppTokens.radiusL),
        border: Border.all(color: AppTokens.borderDefault, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: AppTokens.iconS,
                color: AppTokens.textTertiary,
              ),
              const SizedBox(width: AppTokens.space2),
              Text(
                title,
                style: const TextStyle(
                  fontSize: AppTokens.fontSizeBase,
                  fontWeight: FontWeight.w600,
                  color: AppTokens.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.space2),
          Row(
            children: [
              Expanded(
                child: Text(
                  content,
                  style: TextStyle(
                    fontSize: AppTokens.fontSizeBase,
                    color: AppTokens.textSecondary,
                  ),
                ),
              ),
              if (isCopyable)
                IconButton(
                  icon: const Icon(
                    Icons.copy_outlined,
                    size: 20,
                    color: AppTokens.textTertiary,
                  ),
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: content));
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('已复制'),
                        duration: Duration(seconds: 1),
                      ),
                    );
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return Padding(
      padding: const EdgeInsets.all(AppTokens.space4),
      child: Column(
        children: [
          // 用户卡片骨架屏
          Container(
            width: double.infinity,
            height: 200,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppTokens.radiusL),
            ),
            child: const AppShimmer(
              width: double.infinity,
              height: 200,
              borderRadius: AppTokens.radiusL,
            ),
          ),
          const SizedBox(height: AppTokens.space4),
          // 统计卡片骨架屏
          Container(
            width: double.infinity,
            height: 120,
            padding: const EdgeInsets.all(AppTokens.space4),
            decoration: BoxDecoration(
              color: AppTokens.bgSurface,
              borderRadius: BorderRadius.circular(AppTokens.radiusL),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppShimmer(width: 80, height: 20),
                SizedBox(height: AppTokens.space4),
                Row(
                  children: [
                    Expanded(child: AppShimmer(width: double.infinity, height: 60)),
                    SizedBox(width: AppTokens.space3),
                    Expanded(child: AppShimmer(width: double.infinity, height: 60)),
                    SizedBox(width: AppTokens.space3),
                    Expanded(child: AppShimmer(width: double.infinity, height: 60)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
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

  IconData _getLevelIcon(String level) {
    switch (level) {
      case 'beginner':
        return Icons.eco;
      case 'intermediate':
        return Icons.terrain;
      case 'advanced':
        return Icons.landscape;
      case 'expert':
        return Icons.filter_hdr;
      default:
        return Icons.eco;
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '未知';
    return '${date.year}年${date.month}月${date.day}日';
  }

  Widget _buildEquipmentCard(List<String> equipment) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppTokens.space4),
      decoration: BoxDecoration(
        color: AppTokens.bgSurface,
        borderRadius: BorderRadius.circular(AppTokens.radiusL),
        border: Border.all(color: AppTokens.borderDefault, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.backpack_outlined,
                size: AppTokens.iconS,
                color: AppTokens.textTertiary,
              ),
              const SizedBox(width: AppTokens.space2),
              Text(
                '装备清单',
                style: const TextStyle(
                  fontSize: AppTokens.fontSizeBase,
                  fontWeight: FontWeight.w600,
                  color: AppTokens.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.space3),
          Wrap(
            spacing: AppTokens.space2,
            runSpacing: AppTokens.space2,
            children: equipment.map((item) {
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTokens.space3,
                  vertical: AppTokens.space1,
                ),
                decoration: BoxDecoration(
                  color: AppTokens.brandPrimaryLight,
                  borderRadius: BorderRadius.circular(AppTokens.radiusS),
                ),
                child: Text(
                  item,
                  style: TextStyle(
                    fontSize: AppTokens.fontSizeS,
                    color: AppTokens.brandPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

/// 统计项
class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(
          icon,
          size: AppTokens.iconM,
          color: AppTokens.brandPrimary,
        ),
        const SizedBox(height: AppTokens.space1),
        Text(
          value,
          style: const TextStyle(
            fontSize: AppTokens.fontSizeXL,
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
    );
  }
}
