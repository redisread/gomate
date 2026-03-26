import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/auth_api.dart';
import '../../../shared/theme/app_tokens.dart';

/// 忘记密码页面
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _isSent = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await AuthApi().forgotPassword(
        email: _emailController.text.trim(),
      );
      setState(() => _isSent = true);
    } on DioException catch (e) {
      setState(() {
        if (e.response?.statusCode == 404) {
          _errorMessage = '该邮箱地址未注册';
        } else if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          _errorMessage = '网络超时，请检查网络连接后重试';
        } else if (e.type == DioExceptionType.connectionError) {
          _errorMessage = '无法连接到服务器，请检查网络';
        } else {
          _errorMessage = e.message?.isNotEmpty == true
              ? '发送失败：${e.message}'
              : '发送失败，请稍后重试';
        }
      });
    } catch (e) {
      setState(() => _errorMessage = '发送失败，请稍后重试');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 返回按钮
                Align(
                  alignment: Alignment.centerLeft,
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: AppTokens.textPrimary),
                    onPressed: () => context.pop(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ),
                const SizedBox(height: 32),

                // 成功状态
                if (_isSent) ...[
                  const Icon(
                    Icons.check_circle_outline,
                    size: 64,
                    color: AppTokens.semanticSuccess,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    '重置链接已发送',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: AppTokens.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '请检查 ${_emailController.text} 的收件箱，并按照邮件中的指示重置您的密码。如果未收到邮件，请检查垃圾邮件文件夹。',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTokens.textSecondary,
                        ),
                  ),
                  const SizedBox(height: 32),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('返回登录'),
                  ),
                ]

                // 表单状态
                else ...[
                  // 标题
                  Text(
                    '忘记密码',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: AppTokens.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '输入您的注册邮箱，我们将向您发送密码重置链接',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTokens.textSecondary,
                        ),
                  ),
                  const SizedBox(height: 48),

                  // 邮箱输入框
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: AppTokens.textPrimary),
                    decoration: InputDecoration(
                      labelText: '邮箱',
                      labelStyle: const TextStyle(color: AppTokens.textSecondary),
                      hintText: 'your@email.com',
                      hintStyle: const TextStyle(color: AppTokens.textTertiary),
                      prefixIcon: const Icon(Icons.email_outlined, color: AppTokens.textTertiary),
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
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return '请输入邮箱地址';
                      }
                      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                        return '请输入有效的邮箱地址';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),

                  // 错误提示
                  if (_errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AppTokens.semanticError, fontSize: 14),
                      ),
                    ),

                  const SizedBox(height: 24),

                  // 发送按钮
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
                                  '发送重置链接',
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

                  const SizedBox(height: 24),

                  // 返回登录
                  TextButton(
                    onPressed: () => context.pop(),
                    child: const Text(
                      '返回登录',
                      style: TextStyle(color: AppTokens.brandPrimary),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
