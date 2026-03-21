import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:gomate/core/api/api_client.dart';
import 'package:gomate/core/api/teams_api.dart';
import 'package:gomate/core/models/team.dart';

import 'teams_api_test.mocks.dart';

@GenerateMocks([ApiClient])
void main() {
  late MockApiClient mockClient;
  late TeamsApi teamsApi;

  setUp(() {
    mockClient = MockApiClient();
    teamsApi = TeamsApi(client: mockClient);
  });

  // 标准队伍响应数据
  Map<String, dynamic> makeTeamJson({
    String id = 'team-001',
    String status = 'recruiting',
  }) =>
      {
        'id': id,
        'locationId': 'loc-001',
        'leaderId': 'user-001',
        'title': '梧桐山周末徒步',
        'startTime': 1705300200,
        'endTime': 1705320000,
        'status': status,
        'members': <dynamic>[],
        'createdAt': 1705280000,
      };

  group('TeamsApi', () {
    group('getTeams()', () {
      test('成功获取队伍列表并解析为 TeamModel 列表', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {
                'teams': [makeTeamJson(), makeTeamJson(id: 'team-002')],
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams'),
            ));

        // Act
        final teams = await teamsApi.getTeams();

        // Assert
        expect(teams, isA<List<TeamModel>>());
        expect(teams.length, equals(2));
        expect(teams.first.id, equals('team-001'));
        expect(teams.last.id, equals('team-002'));
      });

      test('默认页码和 limit 参数正确传递', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {'teams': <dynamic>[]},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams'),
            ));

        // Act
        await teamsApi.getTeams();

        // Assert: 默认 page=1, limit=20
        verify(mockClient.get(
          '/teams',
          queryParameters: {'page': 1, 'limit': 20},
        )).called(1);
      });

      test('按 status 和 locationId 过滤时参数正确传递', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {'teams': <dynamic>[]},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams'),
            ));

        // Act
        await teamsApi.getTeams(
          status: 'recruiting',
          locationId: 'loc-001',
          page: 2,
          limit: 10,
        );

        // Assert: 带过滤参数
        verify(mockClient.get(
          '/teams',
          queryParameters: {
            'page': 2,
            'limit': 10,
            'status': 'recruiting',
            'locationId': 'loc-001',
          },
        )).called(1);
      });

      test('列表为空时返回空列表', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenAnswer((_) async => Response(
              data: {'teams': <dynamic>[]},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams'),
            ));

        // Act
        final teams = await teamsApi.getTeams();

        // Assert
        expect(teams, isEmpty);
      });

      test('网络请求失败时抛出 DioException', () async {
        // Arrange
        when(mockClient.get(
          any,
          queryParameters: anyNamed('queryParameters'),
        )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/teams'),
          type: DioExceptionType.connectionTimeout,
        ));

        // Act & Assert
        expect(
          () => teamsApi.getTeams(),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('getTeam()', () {
      test('成功获取单个队伍详情', () async {
        // Arrange
        when(mockClient.get(any)).thenAnswer((_) async => Response(
              data: {'team': makeTeamJson()},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams/team-001'),
            ));

        // Act
        final team = await teamsApi.getTeam('team-001');

        // Assert
        expect(team, isA<TeamModel>());
        expect(team.id, equals('team-001'));
        expect(team.title, equals('梧桐山周末徒步'));
      });

      test('请求路径包含正确的队伍 ID', () async {
        // Arrange
        when(mockClient.get(any)).thenAnswer((_) async => Response(
              data: {'team': makeTeamJson(id: 'team-xyz')},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams/team-xyz'),
            ));

        // Act
        await teamsApi.getTeam('team-xyz');

        // Assert: 路径正确
        verify(mockClient.get('/teams/team-xyz')).called(1);
      });

      test('队伍不存在（404）时抛出 DioException', () async {
        // Arrange
        when(mockClient.get(any)).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/teams/not-exist'),
          response: Response(
            statusCode: 404,
            data: {'message': 'Team not found'},
            requestOptions: RequestOptions(path: '/teams/not-exist'),
          ),
          type: DioExceptionType.badResponse,
        ));

        // Act & Assert
        expect(
          () => teamsApi.getTeam('not-exist'),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('createTeam()', () {
      test('成功创建队伍并返回 TeamModel', () async {
        // Arrange
        final createData = {
          'title': '新队伍',
          'locationId': 'loc-001',
          'startTime': 1705300200,
          'endTime': 1705320000,
          'maxMembers': 8,
        };
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenAnswer((_) async => Response(
              data: {'team': makeTeamJson()},
              statusCode: 201,
              requestOptions: RequestOptions(path: '/teams'),
            ));

        // Act
        final team = await teamsApi.createTeam(createData);

        // Assert
        expect(team, isA<TeamModel>());
        expect(team.id, equals('team-001'));
      });

      test('未登录（401）时创建队伍抛出 DioException', () async {
        // Arrange
        when(mockClient.post(
          any,
          data: anyNamed('data'),
        )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/teams'),
          response: Response(
            statusCode: 401,
            data: {'message': 'Unauthorized'},
            requestOptions: RequestOptions(path: '/teams'),
          ),
          type: DioExceptionType.badResponse,
        ));

        // Act & Assert
        expect(
          () => teamsApi.createTeam({'title': 'Test'}),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('joinTeam()', () {
      test('成功申请加入队伍', () async {
        // Arrange
        when(mockClient.post(any)).thenAnswer((_) async => Response(
              data: {'message': 'success'},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams/team-001/join'),
            ));

        // Act & Assert: 不抛出异常
        await expectLater(teamsApi.joinTeam('team-001'), completes);
        verify(mockClient.post('/teams/team-001/join')).called(1);
      });

      test('已是成员（409）时抛出 DioException', () async {
        // Arrange
        when(mockClient.post(any)).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/teams/team-001/join'),
          response: Response(
            statusCode: 409,
            data: {'message': 'Already a member'},
            requestOptions: RequestOptions(path: '/teams/team-001/join'),
          ),
          type: DioExceptionType.badResponse,
        ));

        // Act & Assert
        expect(
          () => teamsApi.joinTeam('team-001'),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('leaveTeam()', () {
      test('成功退出队伍', () async {
        // Arrange
        when(mockClient.post(any)).thenAnswer((_) async => Response(
              data: {'message': 'success'},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/teams/team-001/leave'),
            ));

        // Act & Assert
        await expectLater(teamsApi.leaveTeam('team-001'), completes);
        verify(mockClient.post('/teams/team-001/leave')).called(1);
      });
    });
  });
}
