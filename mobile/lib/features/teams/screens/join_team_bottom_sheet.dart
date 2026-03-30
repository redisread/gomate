import 'package:flutter/material.dart';
import '../../../shared/theme/app_tokens.dart';

/// 申请加入队伍的 Bottom Sheet
class JoinTeamBottomSheet extends StatefulWidget {
  final Future<String?> Function(String message) onJoin;

  const JoinTeamBottomSheet({super.key, required this.onJoin});

  @override
  State<JoinTeamBottomSheet> createState() => _JoinTeamBottomSheetState();
}

class _JoinTeamBottomSheetState extends State<JoinTeamBottomSheet> {
  final _controller = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_isSubmitting) return;
    
    final message = _controller.text.trim();
    setState(() => _isSubmitting = true);
    
    try {
      final result = await widget.onJoin(message);
      if (result != null && mounted) {
        Navigator.pop(context);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTokens.bgBase,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 顶部把手
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 16),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTokens.borderDefault,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // 标题
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '申请加入',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTokens.textPrimary,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTokens.textSecondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          // 留言输入框
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '给队长留言（可选）',
                  style: TextStyle(
                    color: AppTokens.textSecondary,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _controller,
                  maxLines: 3,
                  maxLength: 100,
                  decoration: InputDecoration(
                    hintText: '例如：我有3年徒步经验，装备齐全...',
                    hintStyle: TextStyle(color: AppTokens.textTertiary, fontSize: 14),
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppTokens.borderDefault),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppTokens.brandPrimary),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ],
            ),
          ),
          // 按钮
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTokens.textSecondary,
                      side: const BorderSide(color: AppTokens.borderDefault),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('取消'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTokens.brandPrimary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('提交申请', style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}