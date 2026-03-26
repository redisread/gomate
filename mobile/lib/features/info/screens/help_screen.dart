import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/app_tokens.dart';

/// 帮助中心页面
class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  final List<FAQItem> _faqs = [
    FAQItem(
      question: '如何加入队伍？',
      answer: '在队伍详情页，如果队伍正在招募且有名额，点击「申请加入」按钮即可提交申请。队长审批通过后，你就成为队伍成员了。',
    ),
    FAQItem(
      question: '如何创建队伍？',
      answer: '点击底部导航栏的「发布」按钮，填写队伍标题、选择地点、设置活动时间和人数限制，然后点击发布即可创建队伍。',
    ),
    FAQItem(
      question: '如何联系队长？',
      answer: '加入队伍后，在队伍详情页可以看到队长的微信号（如果队长已填写）。你也可以通过队伍留言区与队长沟通。',
    ),
    FAQItem(
      question: '队伍状态说明',
      answer: '''• 招募中：正在招募队员，可以申请加入
• 已满：人数已达上限，暂时无法加入
• 已组建：队伍已成立，不再接受新成员
• 已完成：活动已结束''',
    ),
    FAQItem(
      question: '如何修改个人资料？',
      answer: '进入「我的」页面，点击右上角的编辑图标，即可修改头像、昵称、等级、微信号等个人信息。',
    ),
    FAQItem(
      question: '忘记密码怎么办？',
      answer: '在登录页面点击「忘记密码」，输入注册邮箱，我们会发送密码重置链接到你的邮箱。点击链接即可设置新密码。',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          '帮助中心',
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
            // 标题
            Text(
              '常见问题',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppTokens.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: AppTokens.space2),
            Text(
              '以下是用户最常问的问题，希望能帮到你',
              style: TextStyle(
                fontSize: AppTokens.fontSizeBase,
                color: AppTokens.textSecondary,
              ),
            ),
            const SizedBox(height: AppTokens.space6),

            // FAQ 列表
            Container(
              decoration: BoxDecoration(
                color: AppTokens.bgSurface,
                borderRadius: BorderRadius.circular(AppTokens.radiusL),
                border: Border.all(color: AppTokens.borderDefault, width: 1),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppTokens.radiusL),
                child: ExpansionPanelList.radio(
                  elevation: 0,
                  dividerColor: AppTokens.borderDefault,
                  children: _faqs.map((faq) {
                    return ExpansionPanelRadio(
                      value: faq.question,
                      canTapOnHeader: true,
                      headerBuilder: (context, isExpanded) {
                        return Padding(
                          padding: const EdgeInsets.all(AppTokens.space4),
                          child: Text(
                            faq.question,
                            style: const TextStyle(
                              fontSize: AppTokens.fontSizeBase,
                              fontWeight: FontWeight.w600,
                              color: AppTokens.textPrimary,
                            ),
                          ),
                        );
                      },
                      body: Padding(
                        padding: const EdgeInsets.fromLTRB(
                          AppTokens.space4,
                          0,
                          AppTokens.space4,
                          AppTokens.space4,
                        ),
                        child: Text(
                          faq.answer,
                          style: TextStyle(
                            fontSize: AppTokens.fontSizeBase,
                            color: AppTokens.textSecondary,
                            height: 1.6,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: AppTokens.space8),

            // 联系入口
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTokens.space4),
              decoration: BoxDecoration(
                gradient: AppTokens.gradientBrand,
                borderRadius: BorderRadius.circular(AppTokens.radiusL),
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.support_agent,
                    size: 48,
                    color: Colors.white,
                  ),
                  const SizedBox(height: AppTokens.space2),
                  const Text(
                    '还有其他问题？',
                    style: TextStyle(
                      fontSize: AppTokens.fontSizeL,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: AppTokens.space1),
                  const Text(
                    '我们的团队随时为你提供帮助',
                    style: TextStyle(
                      fontSize: AppTokens.fontSizeBase,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: AppTokens.space4),
                  ElevatedButton(
                    onPressed: () => context.push('/contact'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppTokens.brandPrimary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppTokens.space6,
                        vertical: AppTokens.space3,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      ),
                    ),
                    child: const Text(
                      '联系我们',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.space4),
          ],
        ),
      ),
    );
  }
}

/// FAQ 数据项
class FAQItem {
  final String question;
  final String answer;

  FAQItem({required this.question, required this.answer});
}
