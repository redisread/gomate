import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:gomate/core/api/api_client.dart';
import 'package:gomate/core/api/auth_api.dart';
import 'package:gomate/core/models/user.dart';

import 'auth_api_test.mocks.dart';

// 生成 ApiClient Mock：运行 `flutter pub run build_runner build`
@GenerateMocks([ApiClient])
void main() {
  late MockApiClient mockClient;
  late AuthApi authApi;

  setUp(() {
    mockClient = MockApiClient();
    authApi = AuthApi(client: mockClient);
  });

  group('AuthApi', () {
    // 成功登录的标准响应数据
    final loginSuccessData = {
      'user': {
        'id': 'user-001',
        'name': 'Zhang San',
        'email': 'zhangsan@example.com',
        'emailVerified': true,
        'level': 'intermediate',
        'completedHikes': 5,
        'role': 'user',
        'status': 'active',
      },
      'session': {
        'token': 'session_abc123',
        'expiresAt': '2024-12-31T23:59:59Z',
      },
    };

    // 成功注册的标准响应数据
    final registerSuccessData = {
      'user': {
        'id': 'user-002',
        'name': 'New User',
        'email': 'newuser@example.com',
        'emailVerified': false,
        'level': 'beginner',
        'completedHikes': 0,
        'role': 'user',
        'status': 'active',
      },
      'session': {
        'token': 'session_new_user',
      },
    };

    group('login()', () {
      test('登录成功时返回正确的 UserModel', () async {
        // Arrange: mock ApiClient.post 返回成功响应
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenAnswer((_) async => Response(
              data: loginSuccessData,
              statusCode: 200,
              requestOptions: RequestOptions(path: '/auth/sign-in/email'),
            ));

        // Act
        final user = await authApi.login(
          email: 'zhangsan@example.com',
          password: 'password123',
        );

        // Assert: 返回正确解析的用户
        expect(user, isA<UserModel>());
        expect(user.id, equals('user-001'));
        expect(user.name, equals('Zhang San'));
        expect(user.email, equals('zhangsan@example.com'));
        expect(user.emailVerified, isTrue);
        expect(user.level, equals('intermediate'));
      });

      test('登录时传入正确的请求参数', () async {
        // Arrange
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenAnswer((_) async => Response(
              data: loginSuccessData,
              statusCode: 200,
              requestOptions: RequestOptions(path: '/auth/sign-in/email'),
            ));

        // Act
        await authApi.login(
          email: 'test@example.com',
          password: 'myPassword',
        );

        // Assert: 验证请求参数正确传递
        verify(mockClient.post(
          '/auth/sign-in/email',
          data: {
            'email': 'test@example.com',
            'password': 'myPassword',
          },
        )).called(1);
      });

      test('登录失败（401）时抛出 DioException', () async {
        // Arrange: mock 返回 401 错误
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/sign-in/email'),
          response: Response(
            statusCode: 401,
            data: {'message': 'Invalid email or password'},
            requestOptions: RequestOptions(path: '/auth/sign-in/email'),
          ),
          type: DioExceptionType.badResponse,
          message: 'Invalid email or password',
        ));

        // Act & Assert: 预期抛出 DioException
        expect(
          () => authApi.login(
            email: 'wrong@example.com',
            password: 'wrongpassword',
          ),
          throwsA(isA<DioException>()),
        );
      });

      test('服务器 500 错误时抛出异常', () async {
        // Arrange: mock 服务器内部错误
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/sign-in/email'),
          response: Response(
            statusCode: 500,
            data: {'message': 'Internal Server Error'},
            requestOptions: RequestOptions(path: '/auth/sign-in/email'),
          ),
          type: DioExceptionType.badResponse,
        ));

        // Act & Assert
        expect(
          () => authApi.login(email: 'user@example.com', password: 'pass'),
          throwsA(isA<DioException>()),
        );
      });

      test('网络超时时抛出 DioException', () async {
        // Arrange: mock 连接超时
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/sign-in/email'),
          type: DioExceptionType.connectionTimeout,
          message: 'Connection timeout',
        ));

        // Act & Assert
        expect(
          () => authApi.login(email: 'user@example.com', password: 'pass'),
          throwsA(isA<DioException>().having(
            (e) => e.type,
            'type',
            DioExceptionType.connectionTimeout,
          )),
        );
      });
    });

    group('register()', () {
      test('注册成功时返回正确的 UserModel', () async {
        // Arrange
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenAnswer((_) async => Response(
              data: registerSuccessData,
              statusCode: 200,
              requestOptions: RequestOptions(path: '/auth/sign-up/email'),
            ));

        // Act
        final user = await authApi.register(
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        );

        // Assert
        expect(user, isA<UserModel>());
        expect(user.id, equals('user-002'));
        expect(user.name, equals('New User'));
        expect(user.email, equals('newuser@example.com'));
        expect(user.emailVerified, isFalse); // 新注册用户邮箱未验证
        expect(user.level, equals('beginner')); // 新用户默认级别
      });

      test('注册时传入正确的请求参数', () async {
        // Arrange
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenAnswer((_) async => Response(
              data: registerSuccessData,
              statusCode: 200,
              requestOptions: RequestOptions(path: '/auth/sign-up/email'),
            ));

        // Act
        await authApi.register(
          email: 'newuser@example.com',
          password: 'securepass',
          name: 'New User',
        );

        // Assert: 验证请求参数
        verify(mockClient.post(
          '/auth/sign-up/email',
          data: {
            'email': 'newuser@example.com',
            'password': 'securepass',
            'name': 'New User',
          },
        )).called(1);
      });

      test('邮箱已存在（400）时抛出异常', () async {
        // Arrange: 邮箱重复注册
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/sign-up/email'),
          response: Response(
            statusCode: 400,
            data: {'message': 'Email already exists'},
            requestOptions: RequestOptions(path: '/auth/sign-up/email'),
          ),
          type: DioExceptionType.badResponse,
          message: 'Email already exists',
        ));

        // Act & Assert
        expect(
          () => authApi.register(
            email: 'existing@example.com',
            password: 'pass',
            name: 'User',
          ),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('logout()', () {
      test('退出登录时调用 signOut 端点并清除 session', () async {
        // Arrange
        when(mockClient.post(any)).thenAnswer((_) async => Response(
              data: {'success': true},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/auth/sign-out'),
            ));
        when(mockClient.clearSession()).thenAnswer((_) async {});

        // Act
        await authApi.logout();

        // Assert: 验证调用了 signOut 端点和 clearSession
        verify(mockClient.post('/auth/sign-out')).called(1);
        verify(mockClient.clearSession()).called(1);
      });
    });

    group('getSession()', () {
      test('session 有效时返回用户信息', () async {
        // Arrange
        when(mockClient.get(any)).thenAnswer((_) async => Response(
              data: {
                'user': {
                  'id': 'user-001',
                  'name': 'Zhang San',
                  'email': 'zhangsan@example.com',
                  'level': 'intermediate',
                  'completedHikes': 5,
                  'role': 'user',
                  'status': 'active',
                },
                'session': {'expiresAt': '2024-12-31T23:59:59Z'},
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: '/auth/get-session'),
            ));

        // Act
        final user = await authApi.getSession();

        // Assert
        expect(user, isNotNull);
        expect(user!.id, equals('user-001'));
      });

      test('user 字段为 null 时返回 null（未登录状态）', () async {
        // Arrange: 未登录时响应体 user 为 null
        when(mockClient.get(any)).thenAnswer((_) async => Response(
              data: {'user': null},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/auth/get-session'),
            ));

        // Act
        final user = await authApi.getSession();

        // Assert
        expect(user, isNull);
      });

      test('请求抛出异常时返回 null（session 已过期）', () async {
        // Arrange: 模拟 401 或网络错误
        when(mockClient.get(any)).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/get-session'),
          type: DioExceptionType.badResponse,
          response: Response(
            statusCode: 401,
            data: {'message': 'Unauthorized'},
            requestOptions: RequestOptions(path: '/auth/get-session'),
          ),
        ));

        // Act
        final user = await authApi.getSession();

        // Assert: getSession 捕获所有异常并返回 null
        expect(user, isNull);
      });
    });
  });
}
