import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';

/// 反馈 API 客户端
class FeedbackApi {
  final ApiClient _client = ApiClient();

  /// 提交用户反馈
  ///
  /// [type] 反馈类型: 'suggestion' | 'bug'
  /// [name] 用户姓名
  /// [email] 联系邮箱
  /// [content] 反馈内容
  /// [device] 设备类型: 'iOS' | 'Android'（Bug 反馈）
  /// [steps] 复现步骤（Bug 反馈）
  /// [pageUrl] 问题页面路径（Bug 反馈）
  /// 返回包含成功状态和消息的结果
  Future<FeedbackResult> submitFeedback({
    required String type,
    required String name,
    required String email,
    required String content,
    String? device,
    String? steps,
    String? pageUrl,
  }) async {
    try {
      final data = <String, dynamic>{
        'type': type,
        'name': name,
        'email': email,
        'content': content,
      };

      // Bug 反馈的额外字段
      if (device != null && device.isNotEmpty) data['device'] = device;
      if (steps != null && steps.isNotEmpty) data['steps'] = steps;
      if (pageUrl != null && pageUrl.isNotEmpty) data['pageUrl'] = pageUrl;

      final response = await _client.post('/feedback', data: data);

      // 接受 200 或 201 状态码
      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>?;
        return FeedbackResult(
          success: true,
          message: responseData?['message'] as String? ?? '感谢您的反馈！',
        );
      }

      return FeedbackResult(
        success: false,
        message: '服务器返回异常状态码: ${response.statusCode}',
      );
    } on DioException catch (e) {
      // 从响应中提取错误信息
      String errorMessage = '提交失败，请稍后重试';
      if (e.response?.data != null) {
        final data = e.response!.data as Map<String, dynamic>?;
        if (data?['error'] != null) {
          errorMessage = data!['error'] as String;
        } else if (data?['message'] != null) {
          errorMessage = data!['message'] as String;
        }
      }
      debugPrint('[FeedbackApi] DioException: $errorMessage');
      return FeedbackResult(success: false, message: errorMessage);
    } catch (e) {
      debugPrint('[FeedbackApi] Error: $e');
      return const FeedbackResult(
        success: false,
        message: '网络错误，请检查网络连接',
      );
    }
  }
}

/// 反馈提交结果
class FeedbackResult {
  final bool success;
  final String message;

  const FeedbackResult({
    required this.success,
    required this.message,
  });
}
