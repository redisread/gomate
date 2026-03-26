import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/contact_api.dart';
import '../../../shared/theme/app_tokens.dart';

/// 联系我们页面
class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();

  bool _isLoading = false;
  bool _isSuccess = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ContactApi().submitContact(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        subject: _subjectController.text.trim(),
        message: _messageController.text.trim(),
      );
      setState(() => _isSuccess = true);
    } on DioException catch (e) {
      setState(() {
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          _errorMessage = '网络超时，请检查网络连接后重试';
        } else if (e.type == DioExceptionType.connectionError) {
          _errorMessage = '无法连接到服务器，请检查网络';
        } else {
          _errorMessage = '提交失败，请稍后重试';
        }
      });
    } catch (e) {
      setState(() => _errorMessage = '提交失败，请稍后重试');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _resetForm() {
    setState(() {
      _isSuccess = false;
      _nameController.clear();
      _emailController.clear();
      _subjectController.clear();
      _messageController.clear();
    });
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
          '联系我们',
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
        child: _isSuccess ? _buildSuccessView() : _buildForm(),
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 说明文字
          Text(
            '有任何问题或建议？欢迎随时联系我们',
            style: TextStyle(
              fontSize: AppTokens.fontSizeBase,
              color: AppTokens.textSecondary,
            ),
          ),
          const SizedBox(height: AppTokens.space6),

          // 姓名输入框
          _buildTextField(
            controller: _nameController,
            label: '姓名',
            hint: '请输入您的姓名',
            icon: Icons.person_outline,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入姓名';
              }
              return null;
            },
          ),
          const SizedBox(height: AppTokens.space4),

          // 邮箱输入框
          _buildTextField(
            controller: _emailController,
            label: '邮箱',
            hint: '请输入您的邮箱地址',
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入邮箱';
              }
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                return '请输入有效的邮箱地址';
              }
              return null;
            },
          ),
          const SizedBox(height: AppTokens.space4),

          // 主题输入框
          _buildTextField(
            controller: _subjectController,
            label: '主题',
            hint: '请输入主题',
            icon: Icons.subject,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入主题';
              }
              return null;
            },
          ),
          const SizedBox(height: AppTokens.space4),

          // 留言输入框
          _buildTextField(
            controller: _messageController,
            label: '留言',
            hint: '请详细描述您的问题或建议...',
            icon: Icons.message_outlined,
            maxLines: 5,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入留言内容';
              }
              if (value.length < 10) {
                return '留言内容至少需要 10 个字符';
              }
              return null;
            },
          ),
          const SizedBox(height: AppTokens.space4),

          // 错误提示
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: AppTokens.space4),
              child: Text(
                _errorMessage!,
                style: const TextStyle(
                  color: AppTokens.semanticError,
                  fontSize: AppTokens.fontSizeBase,
                ),
              ),
            ),

          // 提交按钮
          Container(
            width: double.infinity,
            height: 52,
            decoration: BoxDecoration(
              gradient: AppTokens.gradientBrand,
              borderRadius: BorderRadius.circular(AppTokens.radiusM),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
                onTap: _isLoading ? null : _handleSubmit,
                child: Center(
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          '提交',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessView() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppTokens.space8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.check_circle_outline,
            size: 80,
            color: AppTokens.semanticSuccess,
          ),
          const SizedBox(height: AppTokens.space4),
          Text(
            '提交成功',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: AppTokens.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: AppTokens.space2),
          Text(
            '感谢您的反馈，我们会尽快回复您',
            style: TextStyle(
              fontSize: AppTokens.fontSizeBase,
              color: AppTokens.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppTokens.space8),
          ElevatedButton(
            onPressed: _resetForm,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTokens.brandPrimary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: AppTokens.space6,
                vertical: AppTokens.space3,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTokens.radiusM),
              ),
            ),
            child: const Text('再次提交'),
          ),
          const SizedBox(height: AppTokens.space4),
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('返回'),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    int? maxLines,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines ?? 1,
      style: const TextStyle(color: AppTokens.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppTokens.textSecondary),
        hintText: hint,
        hintStyle: const TextStyle(color: AppTokens.textTertiary),
        prefixIcon: Icon(icon, color: AppTokens.textTertiary),
        filled: true,
        fillColor: AppTokens.bgSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          borderSide: const BorderSide(color: AppTokens.borderDefault, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          borderSide: const BorderSide(color: AppTokens.borderDefault, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          borderSide: const BorderSide(color: AppTokens.brandPrimary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          borderSide: const BorderSide(color: AppTokens.semanticError, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusM),
          borderSide: const BorderSide(color: AppTokens.semanticError, width: 1.5),
        ),
      ),
      validator: validator,
    );
  }
}
