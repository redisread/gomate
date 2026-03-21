import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 认证服务：基于 flutter_secure_storage 的 session token 本地持久化
class AuthService {
  static const _storage = FlutterSecureStorage();
  static const _sessionKey = 'session_token';

  /// 持久化 session token
  static Future<void> saveSession(String token) =>
      _storage.write(key: _sessionKey, value: token);

  /// 读取本地 session token，未登录时返回 null
  static Future<String?> getSession() =>
      _storage.read(key: _sessionKey);

  /// 清除 session token（退出登录时调用）
  static Future<void> clearSession() =>
      _storage.delete(key: _sessionKey);
}
