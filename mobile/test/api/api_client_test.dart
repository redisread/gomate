import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ApiClient 响应和错误处理', () {
    // 测试错误拦截器中的 _onError 逻辑：
    // ApiClient 内部的拦截器逻辑为纯 Dart，这里直接验证其行为逻辑

    group('错误响应体解析', () {
      test('从 message 字段提取服务器错误信息', () {
        // Arrange: 模拟包含 message 字段的响应体
        final responseData = <String, dynamic>{
          'message': 'Invalid email or password',
          'code': 'INVALID_CREDENTIALS',
        };

        // Act: 提取逻辑（与 _onError 中相同）
        final serverMessage = responseData['message'] as String? ??
            responseData['error'] as String?;

        // Assert
        expect(serverMessage, equals('Invalid email or password'));
      });

      test('从 error 字段提取服务器错误信息', () {
        // Arrange: 响应体仅有 error 字段
        final responseData = <String, dynamic>{
          'error': 'Unauthorized',
        };

        // Act
        final serverMessage = responseData['message'] as String? ??
            responseData['error'] as String?;

        // Assert
        expect(serverMessage, equals('Unauthorized'));
      });

      test('message 字段优先于 error 字段', () {
        // Arrange: 两个字段都存在
        final responseData = <String, dynamic>{
          'message': 'More specific message',
          'error': 'Generic error',
        };

        // Act
        final serverMessage = responseData['message'] as String? ??
            responseData['error'] as String?;

        // Assert: message 优先
        expect(serverMessage, equals('More specific message'));
      });

      test('响应体没有错误字段时返回 null', () {
        // Arrange: 正常成功响应体
        final responseData = <String, dynamic>{
          'user': {'id': 'user-001'},
        };

        // Act
        final serverMessage = responseData['message'] as String? ??
            responseData['error'] as String?;

        // Assert
        expect(serverMessage, isNull);
      });

      test('响应体为非 Map 类型时不提取错误信息', () {
        // Arrange: 响应体是字符串（非预期格式）
        final dynamic responseData = 'Internal Server Error';

        // Act: 模拟 _onError 中的类型检查
        String? serverMessage;
        if (responseData is Map<String, dynamic>) {
          serverMessage = responseData['message'] as String? ??
              responseData['error'] as String?;
        }

        // Assert
        expect(serverMessage, isNull);
      });
    });

    group('session cookie 解析', () {
      test('从 Set-Cookie 头提取 session_token', () {
        // Arrange: 模拟服务端返回的 Set-Cookie 值
        const cookieHeader =
            'better-auth.session_token=abc123xyz; Path=/; HttpOnly; Secure';

        // Act: 使用与 _onResponse 相同的正则提取
        final match =
            RegExp(r'better-auth\.session_token=([^;]+)').firstMatch(cookieHeader);
        final token = match?.group(1);

        // Assert
        expect(token, equals('abc123xyz'));
      });

      test('cookie 中不包含 session_token 时不提取', () {
        // Arrange: 不含目标 cookie 的 Set-Cookie 值
        const cookieHeader = 'other-cookie=value; Path=/';

        // Act
        final match =
            RegExp(r'better-auth\.session_token=([^;]+)').firstMatch(cookieHeader);
        final token = match?.group(1);

        // Assert
        expect(token, isNull);
      });

      test('多个 Set-Cookie 头中提取正确的 session_token', () {
        // Arrange: 多个 cookie
        final cookies = [
          'csrf_token=csrf_value; Path=/',
          'better-auth.session_token=session_abc; Path=/; HttpOnly',
          'tracking=tracking_val; Path=/',
        ];

        // Act: 模拟 _onResponse 的遍历逻辑
        String? sessionToken;
        for (final cookie in cookies) {
          final match =
              RegExp(r'better-auth\.session_token=([^;]+)').firstMatch(cookie);
          if (match != null) {
            sessionToken = match.group(1);
            break;
          }
        }

        // Assert
        expect(sessionToken, equals('session_abc'));
      });
    });

    group('查询参数构建', () {
      // 辅助函数：与 TeamsApi.getTeams 相同的参数构建逻辑
      Map<String, dynamic> buildTeamQueryParams({
        String? status,
        String? locationId,
        int page = 1,
        int limit = 20,
      }) {
        return <String, dynamic>{
          'page': page,
          'limit': limit,
          if (status != null) 'status': status,
          if (locationId != null) 'locationId': locationId,
        };
      }

      test('含有 null 的查询参数不应包含在请求中', () {
        // Arrange: status 和 locationId 均为 null
        // Act
        final queryParams = buildTeamQueryParams();

        // Assert: null 参数被正确过滤
        expect(queryParams.containsKey('status'), isFalse);
        expect(queryParams.containsKey('locationId'), isFalse);
        expect(queryParams['page'], equals(1));
        expect(queryParams['limit'], equals(20));
      });

      test('非 null 查询参数包含在请求中', () {
        // Arrange: 传入具体状态和地点筛选
        // Act
        final queryParams = buildTeamQueryParams(
          status: 'recruiting',
          locationId: 'loc-001',
          page: 2,
          limit: 10,
        );

        // Assert
        expect(queryParams['status'], equals('recruiting'));
        expect(queryParams['locationId'], equals('loc-001'));
        expect(queryParams['page'], equals(2));
      });
    });
  });
}
