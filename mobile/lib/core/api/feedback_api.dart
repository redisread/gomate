import 'package:flutter/foundation.dart';

import '../api/api_client.dart';

/// 反馈 API 客户端
class FeedbackApi {
  final ApiClient _client = ApiClient();

  /// 提交用户反馈
  ///
  /// [type] 反馈类型: 'suggestion' | 'bug'
  /// [name] 用户姓名
  /// [email] 联系邮箱
  /// [content] 反馈内容
  /// [device] 设备类型（Bug 反馈）
  /// [browser] 浏览器信息（Bug 反馈）
  /// [steps] 复现步骤（Bug 反馈）
  /// [pageUrl] 问题页面 URL（Bug 反馈）
  Future<bool> submitFeedback({
    required String type,
    required String name,
    required String email,
    required String content,
    String? device,
    String? browser,
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
      if (device != null) data['device'] = device;
      if (browser != null) data['browser'] = browser;
      if (steps != null) data['steps'] = steps;
      if (pageUrl != null) data['pageUrl'] = pageUrl;

      final response = await _client.post('/feedback', data: data);
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[FeedbackApi] Error: $e');
      return false;
    }
  }
}