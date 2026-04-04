import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/app_tokens.dart';

/// 服务条款页面
class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          '服务条款',
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
              child: Row(
                children: [
                  const Icon(
                    Icons.gavel_outlined,
                    color: AppTokens.brandPrimary,
                    size: 20,
                  ),
                  const SizedBox(width: AppTokens.space2),
                  const Text(
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

            // 条款内容
            _SectionCard(
              title: '1. 接受条款',
              content: '''欢迎使用 GoMate！通过访问或使用我们的服务，您同意遵守以下服务条款。如果您不同意这些条款，请勿使用我们的服务。

我们保留随时修改这些条款的权利。修改后的条款将在应用内公布，继续使用服务即表示您接受修改后的条款。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '2. 服务描述',
              content: '''GoMate 是一个户外徒步组队平台，提供以下服务：

• 浏览和搜索徒步地点信息
• 创建和加入徒步队伍
• 与其他用户交流和协调
• 收藏感兴趣的地点

我们致力于为用户提供安全、便捷的户外组队体验。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '3. 用户账号',
              content: '''使用我们的服务需要注册账号。您同意：

• 提供真实、准确、完整的个人信息
• 妥善保管账号和密码
• 对账号下的所有活动负责
• 及时更新个人信息
• 不共享账号或转让给他人

如发现账号被盗用或存在安全问题，请立即联系我们。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '4. 用户行为准则',
              content: '''使用 GoMate 服务时，您同意不会：

• 发布虚假、误导性或欺诈性信息
• 骚扰、威胁或侵犯他人权利
• 发送垃圾信息或进行恶意营销
• 尝试破坏或干扰服务正常运行
• 收集或存储其他用户的个人信息
• 从事任何违法或不道德的活动

违反上述规定可能导致账号被暂停或终止。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '5. 内容所有权',
              content: '''关于您在平台上发布的内容：

• 您保留自己发布内容的知识产权
• 您授予我们使用这些内容来提供服务的权利
• 您发布的内容不得侵犯第三方权利
• 我们有权移除违反条款的内容

我们鼓励用户分享真实的户外体验和有用的信息。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '6. 免责声明',
              content: '''使用 GoMate 服务即表示您理解并同意：

• 户外活动存在固有风险，请自行评估并做好准备
• 我们不对用户之间的线下活动负责
• 服务按"现状"提供，不作任何明示或暗示的保证
• 我们不保证服务不会中断或无错误
• 您使用服务的风险由自己承担''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '7. 责任限制',
              content: '''在法律允许的最大范围内：

• 我们不对任何间接、附带或后果性损害负责
• 我们的总责任不超过您在过去 12 个月内支付给我们的金额
• 某些司法管辖区可能不允许上述限制，此时适用当地法律规定的最低标准''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '8. 协议终止',
              content: '''我们可能在以下情况下终止服务协议：

• 您违反本服务条款
• 您长时间不活跃（超过 2 年）
• 我们停止提供相关服务
• 法律要求或法院命令

协议终止后，您将无法继续使用服务，但某些条款（如免责声明）继续有效。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '9. 适用法律',
              content: '''本服务条款适用中华人民共和国法律（不包括冲突法规则）。

因本条款引起的任何争议，双方应首先通过友好协商解决。协商不成的，任何一方均可向我们所在地有管辖权的法院提起诉讼。''',
            ),
            const SizedBox(height: AppTokens.space4),

            _SectionCard(
              title: '10. 联系我们',
              content: '''如果您对本服务条款有任何疑问，请通过以下方式联系我们：

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
