import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/auth_api.dart';
import '../../../shared/theme/app_tokens.dart';

/// 重置密码页面
/// 通过邮件链接访问，携带 token 参数
class ResetPasswordScreen extends ConsumerStatefulWidget {
  final String? token;

  const ResetPasswordScreen({super.key, this.token});

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;
  bool _isSuccess = false;
  String? _errorMessage;

  String? _token;
  bool _tokenLoaded = false;

  @override
  void initState() {
    super.initState();
    _token = widget.token;
    _tokenLoaded = true;
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return '请输入新密码';
    }
    if (value.length < 8) {
      return '密码至少 8 个字符';
    }
    return null;
  }

  String? _validateConfirm(String? value) {
    if (value == null || value.isEmpty) {
      return '请确认新密码';
    }
    if (value != _passwordController.text) {
      return '两次输入的密码不一致';
    }
    return null;
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_token == null || _token!.isEmpty) {
      setState(() => _errorMessage = '重置链接无效，请重新获取');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await AuthApi().resetPassword(
        token: _token!,
        newPassword: _passwordController.text,
      );
      setState(() => _isSuccess = true);
    } on DioException catch (e) {
      setState(() {
        final data = e.response?.data;
        if (data is Map && data['error'] != null) {
          _errorMessage = data['error'].toString();
        } else if (e.response?.statusCode == 400) {
          _errorMessage = '重置链接已过期或无效，请重新获取';
        } else if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          _errorMessage = '网络超时，请检查网络连接后重试';
        } else if (e.type == DioExceptionType.connectionError) {
          _errorMessage = '无法连接到服务器，请检查网络';
        } else {
          _errorMessage = e.message?.isNotEmpty == true
              ? '重置失败：${e.message}'
              : '重置失败，请稍后重试';
        }
      });
    } catch (e) {
      setState(() => _errorMessage = '重置失败，请稍后重试');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Widget _buildTokenLoading() {
    return const Scaffold(
      backgroundColor: AppTokens.bgBase,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppTokens.brandPrimary,
              ),
            ),
            SizedBox(height: 16),
            Text(
              '加载中...',
              style: TextStyle(color: AppTokens.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvalidToken() {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back,
                      color: AppTokens.textPrimary),
                  onPressed: () => context.go('/'),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ),
              const Spacer(),
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTokens.brandAccentLight,
                  borderRadius: BorderRadius.circular(40),
                ),
                child: const Icon(
                  Icons.key_off_outlined,
                  size: 40,
                  color: AppTokens.semanticError,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                '重置链接无效',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppTokens.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                '该链接已过期或不存在，请重新申请重置密码',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTokens.textSecondary,
                    ),
              ),
              const SizedBox(height: 32),
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
                    onTap: () => context.push('/forgot-password'),
                    child: const Center(
                      child: Text(
                        '重新获取重置链接',
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
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSuccess() {
    return Scaffold(
      backgroundColor: AppTokens.bgBase,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTokens.brandPrimaryLight,
                  borderRadius: BorderRadius.circular(40),
                ),
                child: const Icon(
                  Icons.check_circle_outline,
                  size: 40,
                  color: AppTokens.brandPrimary,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                '密码重置成功',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppTokens.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                '您的新密码已生效，请使用新密码登录',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTokens.textSecondary,
                    ),
              ),
              const SizedBox(height: 32),
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
                    onTap: () => context.go('/login'),
                    child: const Center(
                      child: Text(
                        '返回登录',
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
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
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
                Align(
                  alignment: Alignment.centerLeft,
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back,
                        color: AppTokens.textPrimary),
                    onPressed: () => context.go('/login'),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ),
                const SizedBox(height: 32),
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppTokens.brandPrimaryLight,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.lock_outlined,
                    size: 32,
                    color: AppTokens.brandPrimary,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  '重置密码',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppTokens.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  '请设置您的新密码',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTokens.textSecondary,
                      ),
                ),
                const SizedBox(height: 48),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  style: const TextStyle(color: AppTokens.textPrimary),
                  decoration: InputDecoration(
                    labelText: '新密码',
                    labelStyle: const TextStyle(color: AppTokens.textSecondary),
                    hintText: '请输入新密码（至少 6 位）',
                    hintStyle: const TextStyle(color: AppTokens.textTertiary),
                    prefixIcon: const Icon(Icons.lock_outlined,
                        color: AppTokens.textTertiary),
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.borderDefault, width: 1),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.borderDefault, width: 1),
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
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: _validatePassword,
                  onChanged: (_) => setState(() => _errorMessage = null),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmController,
                  obscureText: _obscureConfirm,
                  style: const TextStyle(color: AppTokens.textPrimary),
                  decoration: InputDecoration(
                    labelText: '确认密码',
                    labelStyle: const TextStyle(color: AppTokens.textSecondary),
                    hintText: '请再次输入新密码',
                    hintStyle: const TextStyle(color: AppTokens.textTertiary),
                    prefixIcon: const Icon(Icons.lock_outlined,
                        color: AppTokens.textTertiary),
                    filled: true,
                    fillColor: AppTokens.bgSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.borderDefault, width: 1),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      borderSide: const BorderSide(
                          color: AppTokens.borderDefault, width: 1),
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
                        _obscureConfirm
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: AppTokens.textTertiary,
                      ),
                      onPressed: () =>
                          setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                  ),
                  validator: _validateConfirm,
                  onChanged: (_) => setState(() => _errorMessage = null),
                ),
                const SizedBox(height: 8),
                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppTokens.brandAccentLight,
                      borderRadius: BorderRadius.circular(AppTokens.radiusS),
                      border: Border.all(
                          color:
                              AppTokens.semanticError.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded,
                            size: 18, color: AppTokens.semanticError),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                                color: AppTokens.semanticError, fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 24),
                Container(
                  width: double.infinity,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: _isLoading ? null : AppTokens.gradientBrand,
                    color: _isLoading
                        ? AppTokens.brandPrimary.withValues(alpha: 0.6)
                        : null,
                    borderRadius: BorderRadius.circular(AppTokens.radiusM),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      onTap: _isLoading ? null : _handleSubmit,
                      child: Center(
                        child: _isLoading
                            ? const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  ),
                                  SizedBox(width: 12),
                                  Text(
                                    '重置中...',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.lock_outlined,
                                      color: Colors.white, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    '重置密码',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text(
                    '返回登录',
                    style: TextStyle(color: AppTokens.brandPrimary),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_tokenLoaded) {
      return _buildTokenLoading();
    }

    if (_token == null || _token!.isEmpty) {
      return _buildInvalidToken();
    }

    if (_isSuccess) {
      return _buildSuccess();
    }

    return _buildForm();
  }
}
