import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:gomate/core/api/api_client.dart';
import 'package:gomate/core/api/locations_api.dart';
import 'package:gomate/core/models/location.dart';

import 'locations_api_test.mocks.dart';

@GenerateMocks([ApiClient])
void main() {
  late MockApiClient mockClient;
  late LocationsApi locationsApi;

  setUp(() {
    mockClient = MockApiClient();
    locationsApi = LocationsApi(client: mockClient);
  });

  // 构建标准地点 JSON
  Map<String, dynamic> makeLocationJson({String id = 'loc-001'}) => {
        'id': id,
        'name': '梧桐山',
        'slug': 'wutongshan',
        'description': '深圳最高峰，海拔943.7米',
        'cityId': 'shenzhen',
        'coverImage': 'https://example.com/cover.jpg',
        'coordinates': {'lat': 22.6055, 'lng': 114.2285},
        'createdAt': 1705280000,
      };

  group('LocationsApi', () {
    group('getLocations()', () {
      test('成功获取地点列表并解析为 LocationModel 列表', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {
                'locations': [
                  makeLocationJson(),
                  makeLocationJson(id: 'loc-002'),
                ],
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: '/locations'),
            ));

        // Act
        final locations = await locationsApi.getLocations();

        // Assert
        expect(locations, isA<List<LocationModel>>());
        expect(locations.length, equals(2));
        expect(locations.first.id, equals('loc-001'));
      });

      test('默认页码和 limit 参数正确传递', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {'locations': <dynamic>[]},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/locations'),
            ));

        // Act
        await locationsApi.getLocations();

        // Assert
        verify(mockClient.get(
          '/locations',
          queryParameters: {'page': 1, 'limit': 20},
        )).called(1);
      });

      test('按 cityId 和 difficulty 过滤时参数正确传递', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {'locations': <dynamic>[]},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/locations'),
            ));

        // Act
        await locationsApi.getLocations(
          cityId: 'shenzhen',
          difficulty: 'moderate',
          page: 1,
          limit: 10,
        );

        // Assert: 带过滤参数
        verify(mockClient.get(
          '/locations',
          queryParameters: {
            'page': 1,
            'limit': 10,
            'cityId': 'shenzhen',
            'difficulty': 'moderate',
          },
        )).called(1);
      });

      test('返回空列表时正确处理', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {'locations': <dynamic>[]},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/locations'),
            ));

        // Act
        final locations = await locationsApi.getLocations();

        // Assert
        expect(locations, isEmpty);
      });

      test('网络超时时抛出 DioException', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/locations'),
          type: DioExceptionType.receiveTimeout,
        ));

        // Act & Assert
        expect(
          () => locationsApi.getLocations(),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('getLocation()', () {
      test('成功获取地点详情', () async {
        // Arrange
        when(mockClient.get(any)).thenAnswer((_) async => Response(
              data: {'location': makeLocationJson()},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/locations/loc-001'),
            ));

        // Act
        final location = await locationsApi.getLocation('loc-001');

        // Assert
        expect(location, isA<LocationModel>());
        expect(location.id, equals('loc-001'));
        expect(location.name, equals('梧桐山'));
        expect(location.slug, equals('wutongshan'));
      });

      test('使用 slug 查询时路径正确', () async {
        // Arrange
        when(mockClient.get(any)).thenAnswer((_) async => Response(
              data: {'location': makeLocationJson()},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/locations/wutongshan'),
            ));

        // Act
        await locationsApi.getLocation('wutongshan');

        // Assert: 路径包含 slug
        verify(mockClient.get('/locations/wutongshan')).called(1);
      });

      test('地点不存在（404）时抛出 DioException', () async {
        // Arrange
        when(mockClient.get(any)).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/locations/not-exist'),
          response: Response(
            statusCode: 404,
            data: {'message': 'Location not found'},
            requestOptions: RequestOptions(path: '/locations/not-exist'),
          ),
          type: DioExceptionType.badResponse,
        ));

        // Act & Assert
        expect(
          () => locationsApi.getLocation('not-exist'),
          throwsA(isA<DioException>().having(
            (e) => e.response?.statusCode,
            'statusCode',
            equals(404),
          )),
        );
      });

      test('含路线列表的地点详情正确解析', () async {
        // Arrange: 带路线的地点数据
        final locationWithRoutes = Map<String, dynamic>.from(makeLocationJson())
          ..['routes'] = [
            {
              'id': 'route-001',
              'locationId': 'loc-001',
              'name': '北坡主线',
              'difficulty': 'moderate',
              'durationMin': 180,
              'durationMax': 240,
              'distance': 8.5,
            }
          ];
        when(mockClient.get(any)).thenAnswer((_) async => Response(
              data: {'location': locationWithRoutes},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/locations/loc-001'),
            ));

        // Act
        final location = await locationsApi.getLocation('loc-001');

        // Assert: 路线列表正确解析
        expect(location.routes.length, equals(1));
        expect(location.routes.first.name, equals('北坡主线'));
        expect(location.routes.first.difficulty, equals(Difficulty.moderate));
      });
    });

    group('favoriteLocation()', () {
      test('收藏地点时返回 true', () async {
        // Arrange
        when(mockClient.post(any)).thenAnswer((_) async => Response(
              data: {'favorited': true},
              statusCode: 200,
              requestOptions: RequestOptions(
                  path: '/favorites/location/loc-001'),
            ));

        // Act
        final result = await locationsApi.favoriteLocation('loc-001');

        // Assert
        expect(result, isTrue);
      });

      test('取消收藏时返回 false', () async {
        // Arrange
        when(mockClient.post(any)).thenAnswer((_) async => Response(
              data: {'favorited': false},
              statusCode: 200,
              requestOptions: RequestOptions(
                  path: '/favorites/location/loc-001'),
            ));

        // Act
        final result = await locationsApi.favoriteLocation('loc-001');

        // Assert
        expect(result, isFalse);
      });

      test('请求路径包含正确的 entityType 和 locationId', () async {
        // Arrange
        when(mockClient.post(any)).thenAnswer((_) async => Response(
              data: {'favorited': true},
              statusCode: 200,
              requestOptions: RequestOptions(
                  path: '/favorites/location/loc-xyz'),
            ));

        // Act
        await locationsApi.favoriteLocation('loc-xyz');

        // Assert
        verify(mockClient.post('/favorites/location/loc-xyz')).called(1);
      });

      test('未登录（401）时抛出 DioException', () async {
        // Arrange
        when(mockClient.post(any)).thenThrow(DioException(
          requestOptions: RequestOptions(
              path: '/favorites/location/loc-001'),
          response: Response(
            statusCode: 401,
            data: {'message': 'Unauthorized'},
            requestOptions: RequestOptions(
                path: '/favorites/location/loc-001'),
          ),
          type: DioExceptionType.badResponse,
        ));

        // Act & Assert
        expect(
          () => locationsApi.favoriteLocation('loc-001'),
          throwsA(isA<DioException>()),
        );
      });
    });
  });
}
