import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

/// 注册页面
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _termsAccepted = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _errorMessage = null);

    try {
      await ref.read(authProvider.notifier).register(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            name: _nameController.text.trim(),
          );
      // 注册成功后路由守卫会自动重定向到首页
    } on DioException catch (e) {
      setState(() {
        if (e.response?.statusCode == 422 || e.response?.statusCode == 409) {
          _errorMessage = '该邮箱已被注册，请直接登录';
        } else if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          _errorMessage = '网络超时，请检查网络连接后重试';
        } else if (e.type == DioExceptionType.connectionError) {
          _errorMessage = '无法连接到服务器，请检查网络';
        } else {
          _errorMessage = e.message?.isNotEmpty == true
              ? '注册失败：${e.message}'
              : '注册失败，请稍后重试';
        }
      });
    } catch (e) {
      setState(() => _errorMessage = '注册失败，请稍后重试');
    }
  }

  /// 构建统一风格的输入框装饰
  InputDecoration _buildInputDecoration({
    required String labelText,
    String? hintText,
    required Widget prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: labelText,
      labelStyle: const TextStyle(color: AppTokens.textSecondary),
      hintText: hintText,
      hintStyle: const TextStyle(color: AppTokens.textTertiary),
      prefixIcon: prefixIcon,
      suffixIcon: suffixIcon,
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider).isLoading;
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
                // 自定义顶部：左上角返回按钮（仅在有路由历史时显示）
                if (context.canPop())
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back,
                          color: AppTokens.textPrimary),
                      onPressed: () => context.pop(),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ),
                const SizedBox(height: 24),

                // 标题：创建账号
                const Text(
                  '创建账号',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppTokens.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                // 副标题
                const Text(
                  '加入 GoMate，找到志同道合的徒步伙伴',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTokens.textSecondary,
                  ),
                ),
                const SizedBox(height: 32),

                // 用户名输入框
                TextFormField(
                  controller: _nameController,
                  style: const TextStyle(color: AppTokens.textPrimary),
                  decoration: _buildInputDecoration(
                    labelText: '用户名',
                    hintText: '请输入你的名字',
                    prefixIcon: const Icon(Icons.person_outlined,
                        color: AppTokens.textTertiary),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '请输入用户名';
                    }
                    if (value.length < 2) {
                      return '用户名至少 2 个字符';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // 邮箱输入框
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: AppTokens.textPrimary),
                  decoration: _buildInputDecoration(
                    labelText: '邮箱',
                    hintText: 'your@email.com',
                    prefixIcon: const Icon(Icons.email_outlined,
                        color: AppTokens.textTertiary),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '请输入邮箱地址';
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                        .hasMatch(value)) {
                      return '请输入有效的邮箱地址';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // 密码输入框
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  style: const TextStyle(color: AppTokens.textPrimary),
                  decoration: _buildInputDecoration(
                    labelText: '密码',
                    hintText: '至少 8 个字符',
                    prefixIcon: const Icon(Icons.lock_outlined,
                        color: AppTokens.textTertiary),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: AppTokens.textTertiary,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '请输入密码';
                    }
                    if (value.length < 8) {
                      return '密码至少 8 个字符';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // 确认密码输入框
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirm,
                  style: const TextStyle(color: AppTokens.textPrimary),
                  decoration: _buildInputDecoration(
                    labelText: '确认密码',
                    prefixIcon: const Icon(Icons.lock_outlined,
                        color: AppTokens.textTertiary),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirm
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: AppTokens.textTertiary,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscureConfirm = !_obscureConfirm;
                        });
                      },
                    ),
                  ),
                  validator: (value) {
                    if (value != _passwordController.text) {
                      return '两次密码输入不一致';
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
                      style: const TextStyle(
                          color: AppTokens.semanticError, fontSize: 14),
                    ),
                  ),

                const SizedBox(height: 16),

                // 服务条款同意复选框
                Row(
                  children: [
                    Checkbox(
                      value: _termsAccepted,
                      onChanged: (bool? value) {
                        setState(() {
                          _termsAccepted = value ?? false;
                        });
                      },
                      activeColor: AppTokens.brandPrimary,
                    ),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          text: '我已阅读并同意 ',
                          style: const TextStyle(
                            color: AppTokens.textPrimary,
                            fontSize: 14,
                          ),
                          children: [
                            WidgetSpan(
                              child: GestureDetector(
                                onTap: () {
                                  context.push('/terms');
                                },
                                child: Text(
                                  '服务条款',
                                  style: TextStyle(
                                    color: AppTokens.brandPrimary,
                                    fontSize: 14,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ),
                            const TextSpan(
                              text: ' 和 ',
                              style: TextStyle(
                                color: AppTokens.textPrimary,
                                fontSize: 14,
                              ),
                            ),
                            WidgetSpan(
                              child: GestureDetector(
                                onTap: () {
                                  context.push('/privacy');
                                },
                                child: Text(
                                  '隐私政策',
                                  style: TextStyle(
                                    color: AppTokens.brandPrimary,
                                    fontSize: 14,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // 服务条款验证错误
                if (!_termsAccepted && _formKey.currentState?.validate() == false)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      '请同意服务条款和隐私政策',
                      style: const TextStyle(
                          color: AppTokens.semanticError, fontSize: 14),
                    ),
                  ),

                const SizedBox(height: 24),

                // 注册按钮（渐变背景）
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
                      onTap: isLoading ? null : _handleRegister,
                      child: Center(
                        child: isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                '注册',
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

                const SizedBox(height: 16),

                // 登录入口
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      '已有账号？',
                      style: TextStyle(color: AppTokens.textSecondary),
                    ),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: const Text(
                        '立即登录',
                        style: TextStyle(color: AppTokens.brandPrimary),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}