import 'dart:io';

import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../models/user.dart';
import 'api_client.dart';

/// 认证相关 API 封装（Better Auth 接口）
class AuthApi {
  final ApiClient _client;

  AuthApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 邮箱登录
  /// [email] 邮箱地址
  /// [password] 登录密码
  /// 返回用户信息（session token 由 ApiClient 拦截器从 Set-Cookie 自动持久化）
  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      ApiConstants.signIn,
      data: {
        'email': email,
        'password': password,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return UserModel.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// 邮箱注册
  /// [email] 邮箱地址
  /// [password] 密码（至少 8 位）
  /// [name] 用户名
  /// 返回用户信息（session token 由 ApiClient 拦截器从 Set-Cookie 自动持久化）
  Future<UserModel> register({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _client.post(
      ApiConstants.signUp,
      data: {
        'email': email,
        'password': password,
        'name': name,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return UserModel.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// 更新用户信息
  /// [userId] 用户 ID
  /// 其余字段按需传入，null 表示不更新
  Future<UserModel> updateUser({
    required String userId,
    String? name,
    String? nickname,
    String? bio,
    String? level,
    String? image,
    String? wechat,
    String? gender,
    DateTime? birthday,
    String? experience,
    List<String>? equipment,
  }) async {
    final body = <String, dynamic>{'userId': userId};
    if (name != null) body['name'] = name;
    if (nickname != null) body['nickname'] = nickname;
    if (bio != null) body['bio'] = bio;
    if (level != null) body['level'] = level;
    if (image != null) body['image'] = image;
    if (wechat != null) body['wechat'] = wechat;
    if (gender != null) body['gender'] = gender;
    if (birthday != null) {
      body['birthday'] = birthday.millisecondsSinceEpoch ~/ 1000;
    }
    // extra 字段包含 experience 和 equipment
    final extra = <String, dynamic>{};
    if (experience != null) extra['experience'] = experience;
    if (equipment != null) extra['equipment'] = equipment;
    if (extra.isNotEmpty) body['extra'] = extra;

    final response = await _client.patch(ApiConstants.userUpdate, data: body);
    final data = response.data as Map<String, dynamic>;
    return UserModel.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// 上传头像到 R2
  /// [userId] 用户 ID
  /// [file] 本地图片文件
  /// 返回头像公开 URL
  Future<String> uploadAvatar({
    required String userId,
    required File file,
  }) async {
    final formData = FormData.fromMap({
      'userId': userId,
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.path.split('/').last,
      ),
    });
    final response = await _client.postFormData(
      '${ApiConstants.upload}/avatar',
      data: formData,
    );
    final data = response.data as Map<String, dynamic>;
    return data['url'] as String;
  }

  /// 忘记密码 - 发送重置链接
  /// [email] 邮箱地址
  Future<void> forgotPassword({
    required String email,
  }) async {
    await _client.post(
      ApiConstants.forgotPassword,
      data: {'email': email},
    );
  }

  /// 重置密码 - 使用 token 设置新密码
  /// [token] 重置密码 token（从邮件链接获取）
  /// [newPassword] 新密码
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _client.post(
      ApiConstants.resetPassword,
      data: {
        'token': token,
        'newPassword': newPassword,
      },
    );
  }

  /// 退出登录（清除服务端 session）
  Future<void> logout() async {
    await _client.post(ApiConstants.signOut);
    await _client.clearSession();
  }

  /// 清除本地 session（不请求服务端）
  Future<void> clearSession() async {
    await _client.clearSession();
  }

  /// 获取当前登录用户信息（通过 session cookie 鉴权）
  /// 返回 null 表示未登录或 session 已过期
  /// 获取当前登录用户完整信息
  /// 1. 先从 Better Auth session 拿 userId（轻量鉴权）
  /// 2. 再用 userId 请求 /users/:id 获取实时完整数据（含最新 image、nickname 等）
  Future<UserModel?> getSession() async {
    try {
      final response = await _client.get(ApiConstants.session);
      final data = response.data as Map<String, dynamic>;
      if (data['user'] == null) return null;

      final sessionUser = data['user'] as Map<String, dynamic>;
      final userId = sessionUser['id'] as String?;
      if (userId == null) return null;

      // 用 userId 获取实时完整用户数据（session 缓存可能缺少 image 等字段）
      final profileResponse =
          await _client.get(ApiConstants.userProfile(userId));
      final profileData = profileResponse.data as Map<String, dynamic>;
      if (profileData['user'] != null) {
        return UserModel.fromJson(profileData['user'] as Map<String, dynamic>);
      }

      return UserModel.fromJson(sessionUser);
    } catch (_) {
      return null;
    }
  }
}
