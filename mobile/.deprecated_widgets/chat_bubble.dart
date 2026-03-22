import 'package:flutter/material.dart';
import '../core/theme/app_tokens.dart';

/// 消息来源类型
enum ChatBubbleRole {
  /// 用户消息（右对齐，品牌色背景）
  user,

  /// AI 消息（左对齐，surface 背景）
  ai,
}

/// AI 对话气泡组件
///
/// 特性：
/// - 用户消息：右对齐，品牌渐变背景，白色文字
/// - AI 消息：左对齐，surface 背景，主色文字
/// - 出现动画（SlideTransition + FadeTransition）
/// - 时间戳显示（可选）
class ChatBubble extends StatefulWidget {
  const ChatBubble({
    super.key,
    required this.message,
    required this.role,
    this.timestamp,
    this.showAvatar = true,
    this.isLatest = false,
  });

  final String message;
  final ChatBubbleRole role;

  /// 消息时间（null 则不显示）
  final DateTime? timestamp;

  /// 是否显示头像
  final bool showAvatar;

  /// 是否是最新消息（控制动画是否播放）
  final bool isLatest;

  @override
  State<ChatBubble> createState() => _ChatBubbleState();
}

class _ChatBubbleState extends State<ChatBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  bool get _isUser => widget.role == ChatBubbleRole.user;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppTokens.durationMedium,
    );

    _slideAnimation = Tween<Offset>(
      // 用户：从右下进入；AI：从左下进入
      begin: Offset(_isUser ? 0.3 : -0.3, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: AppTokens.curveSpring,
    ));

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    // 最新消息播放入场动画，历史消息直接显示
    if (widget.isLatest) {
      _controller.forward();
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space16,
            vertical: AppTokens.space6,
          ),
          child: Row(
            mainAxisAlignment: _isUser
                ? MainAxisAlignment.end
                : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: _isUser
                ? [_buildBubbleContent(), _buildAvatar()]
                : [_buildAvatar(), _buildBubbleContent()],
          ),
        ),
      ),
    );
  }

  /// 头像
  Widget _buildAvatar() {
    if (!widget.showAvatar) {
      return const SizedBox(width: 36);
    }

    final avatar = _isUser ? _UserAvatar() : _AiAvatar();

    return Padding(
      padding: EdgeInsets.only(
        left: _isUser ? AppTokens.space8 : 0,
        right: _isUser ? 0 : AppTokens.space8,
      ),
      child: avatar,
    );
  }

  /// 气泡主体（含文字和时间戳）
  Widget _buildBubbleContent() {
    return Flexible(
      child: Column(
        crossAxisAlignment:
            _isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          _BubbleBox(
            message: widget.message,
            isUser: _isUser,
          ),
          if (widget.timestamp != null) ...[
            const SizedBox(height: AppTokens.space4),
            _Timestamp(time: widget.timestamp!),
          ],
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  气泡容器
// ──────────────────────────────────────────────────────────────────

class _BubbleBox extends StatelessWidget {
  const _BubbleBox({required this.message, required this.isUser});

  final String message;
  final bool isUser;

  @override
  Widget build(BuildContext context) {
    if (isUser) {
      // 用户气泡：品牌渐变背景
      return Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.72,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.space16,
          vertical: AppTokens.space12,
        ),
        decoration: BoxDecoration(
          gradient: AppTokens.gradientBrand,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(AppTokens.radiusLG),
            topRight: Radius.circular(AppTokens.radiusLG),
            bottomLeft: Radius.circular(AppTokens.radiusLG),
            bottomRight: Radius.circular(AppTokens.radiusXS),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x202DD4BF),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontSize: AppTokens.fontSizeMD,
            height: 1.5,
          ),
        ),
      );
    }

    // AI 气泡：surface 背景 + 边框
    return Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.of(context).size.width * 0.72,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space16,
        vertical: AppTokens.space12,
      ),
      decoration: BoxDecoration(
        color: AppTokens.colorBgSurface,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppTokens.radiusXS),
          topRight: Radius.circular(AppTokens.radiusLG),
          bottomLeft: Radius.circular(AppTokens.radiusLG),
          bottomRight: Radius.circular(AppTokens.radiusLG),
        ),
        border: Border.all(color: AppTokens.colorBorder, width: 1),
        boxShadow: AppTokens.shadowXS,
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: AppTokens.colorTextPrimary,
          fontSize: AppTokens.fontSizeMD,
          height: 1.6,
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  头像
// ──────────────────────────────────────────────────────────────────

class _UserAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        gradient: AppTokens.gradientBrand,
        shape: BoxShape.circle,
      ),
      child: const Icon(
        Icons.person_rounded,
        color: Colors.white,
        size: 18,
      ),
    );
  }
}

class _AiAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: AppTokens.colorPrimaryContainer,
        shape: BoxShape.circle,
        border: Border.all(color: AppTokens.colorBorder, width: 1),
      ),
      child: const Icon(
        Icons.auto_awesome_rounded,
        color: AppTokens.colorPrimary,
        size: 16,
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  时间戳
// ──────────────────────────────────────────────────────────────────

class _Timestamp extends StatelessWidget {
  const _Timestamp({required this.time});

  final DateTime time;

  String _format(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _format(time),
      style: const TextStyle(
        color: AppTokens.colorTextTertiary,
        fontSize: AppTokens.fontSizeXS,
        height: 1.2,
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  打字指示器（3个点动画）
// ──────────────────────────────────────────────────────────────────

/// AI 正在输入的指示器（3个跳动小圆点）
class TypingIndicator extends StatefulWidget {
  const TypingIndicator({super.key, this.showAvatar = true});

  final bool showAvatar;

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  final List<AnimationController> _controllers = [];
  final List<Animation<double>> _animations = [];

  @override
  void initState() {
    super.initState();
    for (int i = 0; i < 3; i++) {
      final controller = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 600),
      );

      final animation = Tween<double>(begin: 0.0, end: -6.0).animate(
        CurvedAnimation(parent: controller, curve: Curves.easeInOut),
      );

      _controllers.add(controller);
      _animations.add(animation);

      // 错开启动时间（依次延迟 150ms）
      Future.delayed(Duration(milliseconds: i * 150), () {
        if (mounted) {
          controller.repeat(reverse: true);
        }
      });
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space16,
        vertical: AppTokens.space6,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (widget.showAvatar) ...[
            _AiAvatar(),
            const SizedBox(width: AppTokens.space8),
          ],
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTokens.space16,
              vertical: AppTokens.space12,
            ),
            decoration: BoxDecoration(
              color: AppTokens.colorBgSurface,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(AppTokens.radiusXS),
                topRight: Radius.circular(AppTokens.radiusLG),
                bottomLeft: Radius.circular(AppTokens.radiusLG),
                bottomRight: Radius.circular(AppTokens.radiusLG),
              ),
              border: Border.all(color: AppTokens.colorBorder, width: 1),
              boxShadow: AppTokens.shadowXS,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (index) {
                return AnimatedBuilder(
                  animation: _animations[index],
                  builder: (context, child) {
                    return Transform.translate(
                      offset: Offset(0, _animations[index].value),
                      child: child,
                    );
                  },
                  child: Padding(
                    padding: EdgeInsets.only(
                      left: index > 0 ? AppTokens.space4 : 0,
                    ),
                    child: Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: AppTokens.colorPrimary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
