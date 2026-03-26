import '../constants/api_constants.dart';
import '../models/user.dart';
import 'api_client.dart';

/// 用户相关 API 封装
class UsersApi {
  final ApiClient _client;

  UsersApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 获取用户公开资料
  /// [id] 用户 ID
  /// 返回用户公开信息（不包含敏感字段如 email）
  Future<UserModel> getUser(String id) async {
    final response = await _client.get(ApiConstants.userProfile(id));
    final data = response.data as Map<String, dynamic>;
    if (data['user'] != null) {
      return UserModel.fromJson(data['user'] as Map<String, dynamic>);
    }
    throw Exception('User not found');
  }
}
