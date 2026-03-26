import '../constants/api_constants.dart';
import 'api_client.dart';

/// 联系表单 API 封装
class ContactApi {
  final ApiClient _client;

  ContactApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 提交联系表单
  /// [name] 姓名
  /// [email] 邮箱地址
  /// [subject] 主题
  /// [message] 留言内容
  Future<void> submitContact({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) async {
    await _client.post(
      ApiConstants.contact,
      data: {
        'name': name,
        'email': email,
        'subject': subject,
        'message': message,
      },
    );
  }
}
