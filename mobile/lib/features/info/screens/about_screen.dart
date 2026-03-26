import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/app_tokens.dart';

/// 关于我们页面
class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      appBar: AppBar(
        backgroundColor: AppTokens.bgBase,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          '关于我们',
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
            // 品牌 Logo
            Center(
              child: Column(
                children: [
                  ShaderMask(
                    shaderCallback: (bounds) =>
                        AppTokens.gradientBrand.createShader(bounds),
                    blendMode: BlendMode.srcIn,
                    child: const Text(
                      'GoMate',
                      style: TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTokens.space2),
                  const Text(
                    '地点组队平台',
                    style: TextStyle(
                      fontSize: AppTokens.fontSizeL,
                      color: AppTokens.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.space8),

            // 品牌介绍
            _SectionCard(
              title: '关于 GoMate',
              child: Text(
                'GoMate 是一个极简的「地点组队」平台，专注于深圳徒步场景，帮助户外爱好者通过结构化组队找到志同道合的徒步伙伴。我们相信，最好的户外体验来自于与合适的人一起探索。',
                style: TextStyle(
                  fontSize: AppTokens.fontSizeBase,
                  color: AppTokens.textSecondary,
                  height: 1.6,
                ),
              ),
            ),
            const SizedBox(height: AppTokens.space4),

            // 核心特色
            _SectionCard(
              title: '核心特色',
              child: Column(
                children: [
                  _FeatureItem(
                    icon: Icons.map_outlined,
                    title: '发现地点',
                    description: '探索深圳及周边优质徒步路线，获取详细的路线信息和难度评估',
                  ),
                  const SizedBox(height: AppTokens.space4),
                  _FeatureItem(
                    icon: Icons.group_outlined,
                    title: '组建队伍',
                    description: '根据时间、难度、人数需求，快速组建或加入合适的徒步队伍',
                  ),
                  const SizedBox(height: AppTokens.space4),
                  _FeatureItem(
                    icon: Icons.favorite_border,
                    title: '收藏路线',
                    description: '收藏心仪的地点，随时查看和分享给你的朋友',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.space4),

            // 联系信息
            _SectionCard(
              title: '联系我们',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ContactItem(
                    icon: Icons.email_outlined,
                    label: '邮箱',
                    value: 'hello@gomate.live',
                  ),
                  const SizedBox(height: AppTokens.space2),
                  Text(
                    '如有任何问题或建议，欢迎随时联系我们。我们期待听到您的声音！',
                    style: TextStyle(
                      fontSize: AppTokens.fontSizeBase,
                      color: AppTokens.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.space8),

            // 版本号
            Center(
              child: Text(
                'Version 1.0.0',
                style: TextStyle(
                  fontSize: AppTokens.fontSizeS,
                  color: AppTokens.textTertiary,
                ),
              ),
            ),
            const SizedBox(height: AppTokens.space4),
          ],
        ),
      ),
    );
  }
}

/// 章节卡片
class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({required this.title, required this.child});

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
          child,
        ],
      ),
    );
  }
}

/// 特色项
class _FeatureItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _FeatureItem({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(AppTokens.space2),
          decoration: BoxDecoration(
            color: AppTokens.brandPrimaryLight,
            borderRadius: BorderRadius.circular(AppTokens.radiusM),
          ),
          child: Icon(
            icon,
            color: AppTokens.brandPrimary,
            size: AppTokens.iconM,
          ),
        ),
        const SizedBox(width: AppTokens.space3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: AppTokens.fontSizeBase,
                  fontWeight: FontWeight.w600,
                  color: AppTokens.textPrimary,
                ),
              ),
              const SizedBox(height: AppTokens.space1),
              Text(
                description,
                style: TextStyle(
                  fontSize: AppTokens.fontSizeBase,
                  color: AppTokens.textSecondary,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// 联系项
class _ContactItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ContactItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: AppTokens.iconS,
          color: AppTokens.textTertiary,
        ),
        const SizedBox(width: AppTokens.space2),
        Text(
          '$label：',
          style: TextStyle(
            fontSize: AppTokens.fontSizeBase,
            color: AppTokens.textSecondary,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: AppTokens.fontSizeBase,
            fontWeight: FontWeight.w500,
            color: AppTokens.textPrimary,
          ),
        ),
      ],
    );
  }
}
