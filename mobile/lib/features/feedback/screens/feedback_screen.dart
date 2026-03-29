import 'dart:io';

import 'package:flutter/material.dart';

import '../../../core/api/feedback_api.dart';
import '../../../core/i18n/app_strings.dart';
import '../../../shared/theme/app_tokens.dart';

/// 反馈类型
enum FeedbackType { suggestion, bug }

/// 设备类型选项
enum DeviceType { ios, android }

/// 反馈建议页面
class FeedbackScreen extends StatefulWidget {
  final String? initialPageUrl;

  const FeedbackScreen({super.key, this.initialPageUrl});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final _feedbackApi = FeedbackApi();

  // 表单控制器
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _contentController = TextEditingController();
  final _stepsController = TextEditingController();
  final _pageUrlController = TextEditingController();

  // 设备类型选择
  DeviceType? _selectedDeviceType;

  bool _isSubmitting = false;
  bool _isSubmitted = false;
  String? _errorMessage;

  FeedbackType get _currentType =>
      _tabController.index == 0 ? FeedbackType.suggestion : FeedbackType.bug;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);

    // 自动填充设备类型
    if (Platform.isIOS) {
      _selectedDeviceType = DeviceType.ios;
    } else if (Platform.isAndroid) {
      _selectedDeviceType = DeviceType.android;
    }

    // 自动填充问题页面路径（如果从外部传入）
    if (widget.initialPageUrl != null) {
      _pageUrlController.text = widget.initialPageUrl!;
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _contentController.dispose();
    _stepsController.dispose();
    _pageUrlController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await _feedbackApi.submitFeedback(
      type: _currentType == FeedbackType.suggestion ? 'suggestion' : 'bug',
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      content: _contentController.text.trim(),
      device: _currentType == FeedbackType.bug
          ? _selectedDeviceType == DeviceType.ios
              ? 'iOS'
              : 'Android'
          : null,
      steps: _currentType == FeedbackType.bug
          ? _stepsController.text.trim()
          : null,
      pageUrl: _currentType == FeedbackType.bug
          ? _pageUrlController.text.trim()
          : null,
    );

    if (mounted) {
      setState(() {
        _isSubmitting = false;
        if (result.success) {
          _isSubmitted = true;
          _errorMessage = null;
        } else {
          _errorMessage = result.message;
        }
      });
    }
  }

  void _resetForm() {
    _nameController.clear();
    _emailController.clear();
    _contentController.clear();
    _stepsController.clear();
    _pageUrlController.clear();
    setState(() {
      _isSubmitted = false;
      _errorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.feedbackTitle),
      ),
      body: _isSubmitted ? _buildSuccessView() : _buildFormView(),
    );
  }

  /// 成功视图
  Widget _buildSuccessView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTokens.space6),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTokens.semanticSuccess.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_outline,
                size: 48,
                color: AppTokens.semanticSuccess,
              ),
            ),
            const SizedBox(height: AppTokens.space4),
            const Text(
              AppStrings.feedbackSuccessTitle,
              style: TextStyle(
                fontSize: AppTokens.fontSizeXXL,
                fontWeight: FontWeight.bold,
                color: AppTokens.textPrimary,
              ),
            ),
            const SizedBox(height: AppTokens.space2),
            const Text(
              AppStrings.feedbackSuccessDesc,
              style: TextStyle(
                fontSize: AppTokens.fontSizeBase,
                color: AppTokens.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppTokens.space6),
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
                  borderRadius: BorderRadius.circular(AppTokens.radiusFull),
                ),
              ),
              child: const Text('继续提交'),
            ),
          ],
        ),
      ),
    );
  }

  /// 表单视图
  Widget _buildFormView() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          // Tab 切换
          Container(
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppTokens.bgDivider),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: _currentType == FeedbackType.bug
                  ? AppTokens.semanticError
                  : AppTokens.brandPrimary,
              unselectedLabelColor: AppTokens.textSecondary,
              indicatorColor: _currentType == FeedbackType.bug
                  ? AppTokens.semanticError
                  : AppTokens.brandPrimary,
              indicatorWeight: 2,
              tabs: [
                Tab(
                  icon: const Icon(Icons.lightbulb_outline),
                  text: AppStrings.feedbackTabSuggestion,
                ),
                Tab(
                  icon: const Icon(Icons.bug_report_outlined),
                  text: AppStrings.feedbackTabBug,
                ),
              ],
            ),
          ),

          // 表单内容
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppTokens.space4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 姓名 + 邮箱
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          controller: _nameController,
                          label: AppStrings.feedbackNameLabel,
                          validator: (v) => v?.isEmpty == true ? '请输入姓名' : null,
                        ),
                      ),
                      const SizedBox(width: AppTokens.space3),
                      Expanded(
                        child: _buildTextField(
                          controller: _emailController,
                          label: AppStrings.feedbackEmailLabel,
                          keyboardType: TextInputType.emailAddress,
                          validator: (v) {
                            if (v?.isEmpty == true) return '请输入邮箱';
                            if (!RegExp(r'^[\w-\.]+@[\w-]+\.[a-z]{2,}$')
                                .hasMatch(v!)) {
                              return '请输入有效的邮箱';
                            }
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),

                  // Bug 专属字段
                  if (_currentType == FeedbackType.bug) ...[
                    const SizedBox(height: AppTokens.space4),
                    Container(
                      padding: const EdgeInsets.all(AppTokens.space3),
                      decoration: BoxDecoration(
                        color: AppTokens.semanticError.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(AppTokens.radiusL),
                        border: Border.all(
                          color: AppTokens.semanticError.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '问题详情（选填）',
                            style: TextStyle(
                              fontSize: AppTokens.fontSizeS,
                              color: AppTokens.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: AppTokens.space3),
                          // 设备类型下拉选择
                          _buildDeviceDropdown(),
                          const SizedBox(height: AppTokens.space3),
                          _buildTextField(
                            controller: _pageUrlController,
                            label: AppStrings.feedbackPageUrlLabel,
                            placeholder: 'gomate://...',
                          ),
                          const SizedBox(height: AppTokens.space3),
                          _buildTextField(
                            controller: _stepsController,
                            label: AppStrings.feedbackStepsLabel,
                            placeholder: AppStrings.feedbackStepsPlaceholder,
                            maxLines: 3,
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: AppTokens.space4),

                  // 详细描述
                  _buildTextField(
                    controller: _contentController,
                    label: AppStrings.feedbackContentLabel,
                    placeholder: _currentType == FeedbackType.suggestion
                        ? AppStrings.feedbackContentPlaceholderSuggestion
                        : AppStrings.feedbackContentPlaceholderBug,
                    maxLines: 6,
                    validator: (v) => v?.isEmpty == true ? '请输入内容' : null,
                  ),

                  // 错误提示
                  if (_errorMessage != null) ...[
                    const SizedBox(height: AppTokens.space3),
                    Container(
                      padding: const EdgeInsets.all(AppTokens.space3),
                      decoration: BoxDecoration(
                        color: AppTokens.semanticError.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppTokens.radiusM),
                      ),
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(
                          color: AppTokens.semanticError,
                          fontSize: AppTokens.fontSizeS,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: AppTokens.space6),

                  // 提交按钮
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _currentType == FeedbackType.bug
                          ? AppTokens.semanticError
                          : AppTokens.brandPrimary,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor:
                          AppTokens.brandPrimary.withValues(alpha: 0.5),
                      padding: const EdgeInsets.symmetric(
                        vertical: AppTokens.space3,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(AppTokens.radiusFull),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text(AppStrings.feedbackSubmitBtn),
                  ),

                  const SizedBox(height: AppTokens.space6),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    String? placeholder,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: AppTokens.fontSizeS,
            fontWeight: FontWeight.w500,
            color: AppTokens.textPrimary,
          ),
        ),
        const SizedBox(height: AppTokens.space1),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          validator: validator,
          decoration: InputDecoration(
            hintText: placeholder,
            hintStyle: const TextStyle(color: AppTokens.textTertiary),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTokens.radiusM),
              borderSide: const BorderSide(color: AppTokens.borderDefault),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTokens.radiusM),
              borderSide: const BorderSide(color: AppTokens.borderDefault),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTokens.radiusM),
              borderSide: BorderSide(
                color: _currentType == FeedbackType.bug
                    ? AppTokens.semanticError
                    : AppTokens.brandPrimary,
                width: 1.5,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppTokens.space3,
              vertical: AppTokens.space2,
            ),
          ),
        ),
      ],
    );
  }

  /// 设备类型下拉选择
  Widget _buildDeviceDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppStrings.feedbackDeviceLabel,
          style: const TextStyle(
            fontSize: AppTokens.fontSizeS,
            fontWeight: FontWeight.w500,
            color: AppTokens.textPrimary,
          ),
        ),
        const SizedBox(height: AppTokens.space1),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppTokens.radiusM),
            border: Border.all(color: AppTokens.borderDefault),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<DeviceType>(
              value: _selectedDeviceType,
              isExpanded: true,
              hint: const Text(
                '选择设备类型',
                style: TextStyle(color: AppTokens.textTertiary),
              ),
              icon: const Icon(Icons.keyboard_arrow_down,
                  color: AppTokens.textSecondary),
              padding: const EdgeInsets.symmetric(horizontal: AppTokens.space3),
              borderRadius: BorderRadius.circular(AppTokens.radiusM),
              items: const [
                DropdownMenuItem(
                  value: DeviceType.ios,
                  child: Text('iOS'),
                ),
                DropdownMenuItem(
                  value: DeviceType.android,
                  child: Text('Android'),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedDeviceType = value;
                });
              },
            ),
          ),
        ),
      ],
    );
  }
}
