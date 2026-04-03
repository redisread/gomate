import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/auth_api.dart';
import '../models/user.dart';

/// 认证状态
class AuthState {
  final UserModel? user;
  final bool isLoading;

  const AuthState({this.user, this.isLoading = false});

  bool get isLoggedIn => user != null;

  AuthState copyWith({UserModel? user, bool? isLoading, bool clearUser = false}) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

/// 认证状态管理 Notifier
class AuthNotifier extends AsyncNotifier<AuthState> {
  late final AuthApi _authApi;

  @override
  Future<AuthState> build() async {
    _authApi = AuthApi();
    // 应用启动时检查本地 session
    final user = await _authApi.getSession();
    return AuthState(user: user);
  }

  /// 登录
  Future<void> login({required String email, required String password}) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final user = await _authApi.login(email: email, password: password);
      return AuthState(user: user);
    });
  }

  /// 注册
  Future<void> register({
    required String email,
    required String password,
    required String name,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final user = await _authApi.register(
        email: email,
        password: password,
        name: name,
      );
      return AuthState(user: user);
    });
  }

  /// 更新用户信息（昵称、简介、等级、性别、微信、生日、户外经验、装备等）
  /// 成功后刷新 state 中的用户数据
  Future<void> updateUser({
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
    final current = state.valueOrNull;
    if (current?.user == null) throw Exception('未登录');

    final updated = await _authApi.updateUser(
      userId: current!.user!.id,
      name: name,
      nickname: nickname,
      bio: bio,
      level: level,
      image: image,
      wechat: wechat,
      gender: gender,
      birthday: birthday,
      experience: experience,
      equipment: equipment,
    );
    state = AsyncValue.data(current.copyWith(user: updated));
  }

  /// 上传头像，返回头像 URL（不更新 state，由调用方合并到 updateUser 中一次提交）
  Future<String> uploadAvatar(File file) async {
    final current = state.valueOrNull;
    if (current?.user == null) throw Exception('未登录');

    return _authApi.uploadAvatar(
      userId: current!.user!.id,
      file: file,
    );
  }

  /// 退出登录（即使服务端请求失败也清除本地状态）
  Future<void> logout() async {
    try {
      await _authApi.logout();
    } catch (_) {
      // 服务端 sign-out 失败不阻塞退出，仍清除本地 session
      await ApiClient().clearSession();
    }
    state = const AsyncValue.data(AuthState());
  }
}

/// 全局认证 Provider
final authProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
