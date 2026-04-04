import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/app_tokens.dart';

/// 隐私政策页面
class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          '隐私政策',
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTokens.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 最后更新日期
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTokens.space3),
              decoration: BoxDecoration(
                color: AppTokens.brandPrimaryLight,
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: AppTokens.brandPrimary,
                    size: 20,
                  ),
                  SizedBox(width: AppTokens.space2),
                  Text(
                    '最后更新：2026年3月26日',
                    style: TextStyle(
                      fontSize: AppTokens.fontSizeBase,
                      color: AppTokens.brandPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.space6),

            // 隐私政策内容
            _SectionCard(
              title: '1. 信息收集',
              content: '''我们收集您在使用 GoMate 服务时提供的以下信息：

• 账户信息：邮箱地址、姓名、昵称、头像
• 个人资料：微信号、性别、出生日期、户外经验等级
• 活动信息：您创建或加入的队伍信息
• 使用数据：应用使用情况和设备信息

我们仅在您主动提供或明确同意的情况下收集这些信息。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '2. 信息使用',
              content: '''我们使用您的信息用于以下目的：

• 提供和维护服务
• 处理您的队伍申请和管理
• 发送服务通知和重要更新
• 改进用户体验和服务质量
• 防止欺诈和滥用行为

我们不会将您的个人信息出售给第三方。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '3. 信息保护',
              content: '''我们采取多种安全措施保护您的个人信息：

• 使用行业标准的加密技术
• 定期安全审查和更新
• 限制员工访问权限
• 匿名化处理统计数据

尽管我们努力保护您的信息，但互联网传输无法保证 100% 安全。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '4. Cookie 使用',
              content: '''我们使用 Cookie 和类似技术来：

• 保持您的登录状态
• 记住您的偏好设置
• 分析应用使用情况
• 改进服务性能

您可以通过浏览器设置管理 Cookie 偏好。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '5. 第三方服务',
              content: '''我们可能使用以下第三方服务：

• 地图服务（高德地图）
• 云存储服务（Cloudflare R2）
• 邮件服务（Resend）

这些服务提供商仅能在提供服务的必要范围内访问您的信息。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '6. 用户权利',
              content: '''您对个人信息享有以下权利：

• 访问和查看您的个人信息
• 更正不准确的信息
• 删除您的账户和数据
• 导出您的数据副本
• 撤回同意（可能影响服务使用）

如需行使上述权利，请通过「联系我们」页面与我们取得联系。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '7. 联系我们',
              content: '''如果您对本隐私政策有任何疑问，请通过以下方式联系我们：

邮箱：hello@gomate.live

我们会尽快回复您的咨询。''',
            ),
            const SizedBox(height: AppTokens.space8),
          ],
        ),
      ),
    );
  }
}

/// 章节卡片
class _SectionCard extends StatelessWidget {
  final String title;
  final String content;

  const _SectionCard({required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
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
          Text(
            title,
            style: const TextStyle(
              fontSize: AppTokens.fontSizeL,
              fontWeight: FontWeight.w600,
              color: AppTokens.textPrimary,
            ),
          ),
          const SizedBox(height: AppTokens.space3),
          Text(
            content,
            style: TextStyle(
              fontSize: AppTokens.fontSizeBase,
              color: AppTokens.textSecondary,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}
