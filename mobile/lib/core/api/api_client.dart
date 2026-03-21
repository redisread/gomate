import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/api_constants.dart';

/// Dio HTTP 客户端：统一管理请求配置、认证 Cookie 和错误处理
class ApiClient {
  static ApiClient? _instance;

  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiClient._internal() {
    final url = ApiConstants.baseUrl;
    debugPrint('[ApiClient] baseUrl = $url');
    _dio = Dio(
      BaseOptions(
        baseUrl: url,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // 添加请求拦截器：自动携带 session cookie
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _onRequest,
        onResponse: _onResponse,
        onError: _onError,
      ),
    );
  }

  /// 单例工厂
  factory ApiClient() {
    _instance ??= ApiClient._internal();
    return _instance!;
  }

  /// 请求拦截：注入存储的 session cookie
  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    debugPrint('[ApiClient] --> ${options.method} ${options.uri}');
    final sessionToken = await _storage.read(key: 'session_token');
    if (sessionToken != null) {
      options.headers['Cookie'] = 'better-auth.session_token=$sessionToken';
    }
    handler.next(options);
  }

  /// 响应拦截：提取并持久化 session cookie
  /// Dio 的 headers.map['set-cookie'] 返回所有 set-cookie 值列表
  void _onResponse(Response response, ResponseInterceptorHandler handler) {
    final cookies = response.headers.map['set-cookie'] ?? [];
    for (final cookie in cookies) {
      final match = RegExp(r'better-auth\.session_token=([^;]+)').firstMatch(cookie);
      if (match != null) {
        _storage.write(key: 'session_token', value: match.group(1));
        break;
      }
    }
    handler.next(response);
  }

  /// 错误拦截：将 HTTP 错误信息附加到异常 message，方便上层捕获
  void _onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint('[ApiClient] ERROR ${err.requestOptions.uri}: ${err.type} ${err.message}');
    // 尝试从响应体提取 Better Auth 的错误信息
    final responseData = err.response?.data;
    String? serverMessage;
    if (responseData is Map<String, dynamic>) {
      serverMessage = responseData['message'] as String? ??
          responseData['error'] as String?;
    }
    if (serverMessage != null) {
      handler.next(
        err.copyWith(
          message: serverMessage,
        ),
      );
    } else {
      handler.next(err);
    }
  }

  /// GET 请求
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.get(path, queryParameters: queryParameters);
  }

  /// POST 请求
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.post(path, data: data, queryParameters: queryParameters);
  }

  /// POST multipart/form-data 请求（用于文件上传）
  Future<Response> postFormData(
    String path, {
    required FormData data,
  }) async {
    return _dio.post(
      path,
      data: data,
      options: Options(contentType: 'multipart/form-data'),
    );
  }

  /// PUT 请求
  Future<Response> put(
    String path, {
    dynamic data,
  }) async {
    return _dio.put(path, data: data);
  }

  /// PATCH 请求
  Future<Response> patch(
    String path, {
    dynamic data,
  }) async {
    return _dio.patch(path, data: data);
  }

  /// DELETE 请求
  Future<Response> delete(String path) async {
    return _dio.delete(path);
  }

  /// 清除本地 session（登出时调用）
  Future<void> clearSession() async {
    await _storage.delete(key: 'session_token');
  }
}
