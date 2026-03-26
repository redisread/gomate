import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_tokens.dart';

/// 登录页面
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _errorMessage = null);

    try {
      await ref.read(authProvider.notifier).login(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
      // 登录成功后路由守卫会自动重定向到首页
    } on DioException catch (e) {
      setState(() {
        if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
          _errorMessage = '邮箱或密码错误，请重试';
        } else if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          _errorMessage = '网络超时，请检查网络连接后重试';
        } else if (e.type == DioExceptionType.connectionError) {
          _errorMessage = '无法连接到服务器，请检查网络';
        } else {
          _errorMessage = e.message?.isNotEmpty == true
              ? '登录失败：${e.message}'
              : '登录失败，请稍后重试';
        }
      });
    } catch (e) {
      setState(() => _errorMessage = '登录失败，请稍后重试');
    }
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
                const SizedBox(height: 32),

                // Logo 区：品牌渐变文字
                ShaderMask(
                  shaderCallback: (bounds) =>
                      AppTokens.gradientBrand.createShader(bounds),
                  blendMode: BlendMode.srcIn,
                  child: const Text(
                    'GoMate',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // 副标题
                const Text(
                  '地点组队平台',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
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
                    labelStyle:
                        const TextStyle(color: AppTokens.textSecondary),
                    hintText: 'your@email.com',
                    hintStyle:
                        const TextStyle(color: AppTokens.textTertiary),
                    prefixIcon: const Icon(Icons.email_outlined,
                        color: AppTokens.textTertiary),
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide:
                          const BorderSide(color: AppTokens.borderDefault, width: 1),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide:
                          const BorderSide(color: AppTokens.borderDefault, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.brandPrimary, width: 1.5),
                    ),
                    errorBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.semanticError, width: 1),
                    ),
                    focusedErrorBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.semanticError, width: 1.5),
                    ),
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
                  decoration: InputDecoration(
                    labelText: '密码',
                    labelStyle:
                        const TextStyle(color: AppTokens.textSecondary),
                    prefixIcon: const Icon(Icons.lock_outlined,
                        color: AppTokens.textTertiary),
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide:
                          const BorderSide(color: AppTokens.borderDefault, width: 1),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide:
                          const BorderSide(color: AppTokens.borderDefault, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.brandPrimary, width: 1.5),
                    ),
                    errorBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.semanticError, width: 1),
                    ),
                    focusedErrorBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.semanticError, width: 1.5),
                    ),
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

                // 忘记密码链接
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => context.push('/forgot-password'),
                    child: const Text(
                      '忘记密码？',
                      style: TextStyle(color: AppTokens.textSecondary),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 登录按钮（渐变背景）
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
                      onTap: isLoading ? null : _handleLogin,
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
                                '登录',
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

                // 注册入口
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      '还没有账号？',
                      style: TextStyle(color: AppTokens.textSecondary),
                    ),
                    TextButton(
                      onPressed: () => context.push('/register'),
                      child: const Text(
                        '立即注册',
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
