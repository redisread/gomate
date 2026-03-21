import 'package:flutter_test/flutter_test.dart';
import 'package:gomate/core/models/team.dart';

void main() {
  group('TeamStatus', () {
    group('fromString()', () {
      test('正确映射所有已知枚举值', () {
        // Arrange & Act & Assert
        expect(TeamStatus.fromString('recruiting'), equals(TeamStatus.recruiting));
        expect(TeamStatus.fromString('full'), equals(TeamStatus.full));
        expect(TeamStatus.fromString('formed'), equals(TeamStatus.formed));
        expect(TeamStatus.fromString('completed'), equals(TeamStatus.completed));
        expect(TeamStatus.fromString('cancelled'), equals(TeamStatus.cancelled));
      });

      test('未知值回退到 recruiting', () {
        // Arrange & Act & Assert
        expect(TeamStatus.fromString('unknown_status'), equals(TeamStatus.recruiting));
        expect(TeamStatus.fromString(''), equals(TeamStatus.recruiting));
      });
    });

    group('label getter', () {
      test('各状态返回正确的中文标签', () {
        // Arrange & Act & Assert
        expect(TeamStatus.recruiting.label, equals('招募中'));
        expect(TeamStatus.full.label, equals('已满'));
        expect(TeamStatus.formed.label, equals('已组建'));
        expect(TeamStatus.completed.label, equals('已完成'));
        expect(TeamStatus.cancelled.label, equals('已取消'));
      });
    });
  });

  group('TeamMemberStatus', () {
    group('fromString()', () {
      test('正确映射所有已知枚举值', () {
        // Arrange & Act & Assert
        expect(TeamMemberStatus.fromString('pending'), equals(TeamMemberStatus.pending));
        expect(TeamMemberStatus.fromString('approved'), equals(TeamMemberStatus.approved));
        expect(TeamMemberStatus.fromString('rejected'), equals(TeamMemberStatus.rejected));
        expect(TeamMemberStatus.fromString('leave_pending'), equals(TeamMemberStatus.leavePending));
      });

      test('未知值回退到 pending', () {
        // Arrange & Act & Assert
        expect(TeamMemberStatus.fromString('unknown'), equals(TeamMemberStatus.pending));
      });
    });
  });

  group('TeamModel', () {
    // 完整队伍 JSON 数据（对应 API 实际返回结构）
    final fullTeamJson = <String, dynamic>{
      'id': 'team-001',
      'locationId': 'loc-001',
      'routeId': 'route-001',
      'leaderId': 'user-001',
      'title': '周末梧桐山徒步',
      'description': '适合新手的轻松徒步',
      'date': '2024-01-15',
      'time': '09:00',
      'durationMin': 180,
      'maxMembers': 8,
      'currentMembers': 1,
      'requirements': ['自备干粮', '穿登山鞋'],
      'icon': '🏔️',
      'status': 'recruiting',
      'leader': {
        'id': 'user-001',
        'name': 'Leader Name',
        'email': 'leader@example.com',
      },
      'createdAt': '2024-01-15T01:00:00.000Z',
    };

    // 最少字段队伍 JSON
    final minimalTeamJson = <String, dynamic>{
      'id': 'team-002',
      'locationId': 'loc-002',
      'leaderId': 'user-003',
      'title': '最简队伍',
      'date': '2024-01-15',
      'time': '09:00',
      'status': 'full',
      'createdAt': '2024-01-15T01:00:00.000Z',
    };

    group('fromJson()', () {
      test('正确解析完整队伍数据', () {
        // Arrange: 准备完整 JSON 数据
        // Act
        final team = TeamModel.fromJson(fullTeamJson);

        // Assert
        expect(team.id, equals('team-001'));
        expect(team.locationId, equals('loc-001'));
        expect(team.routeId, equals('route-001'));
        expect(team.leaderId, equals('user-001'));
        expect(team.title, equals('周末梧桐山徒步'));
        expect(team.description, equals('适合新手的轻松徒步'));
        expect(team.durationMin, equals(180));
        expect(team.maxMembers, equals(8));
        expect(team.requirements, equals(['自备干粮', '穿登山鞋']));
        expect(team.icon, equals('🏔️'));
        expect(team.status, equals(TeamStatus.recruiting));
        expect(team.leader, isNotNull);
        expect(team.currentMembers, equals(1));
      });

      test('处理可选字段缺失时使用默认值', () {
        // Arrange: 仅必填字段
        // Act
        final team = TeamModel.fromJson(minimalTeamJson);

        // Assert
        expect(team.id, equals('team-002'));
        expect(team.routeId, isNull);
        expect(team.description, isNull);
        expect(team.durationMin, equals(240)); // 默认值
        expect(team.maxMembers, equals(10)); // 默认值
        expect(team.requirements, isEmpty);
        expect(team.icon, equals('⛰️')); // 默认图标
        expect(team.status, equals(TeamStatus.full));
        expect(team.leader, isNull);
        expect(team.currentMembers, equals(0)); // 默认值
      });

      test('正确解析 date/time 字段', () {
        // Arrange & Act
        final team = TeamModel.fromJson(fullTeamJson);

        // Assert: date/time 直接来自 API 字符串
        expect(team.date, equals('2024-01-15'));
        expect(team.time, equals('09:00'));
        expect(team.createdAt, isNotNull);
      });

      test('requirements 为 List 时正确解析', () {
        // Arrange
        final json = Map<String, dynamic>.from(minimalTeamJson)
          ..['requirements'] = ['带足饮水', '报备紧急联系人'];

        // Act
        final team = TeamModel.fromJson(json);

        // Assert
        expect(team.requirements.length, equals(2));
        expect(team.requirements.first, equals('带足饮水'));
      });
    });

    group('approvedMemberCount getter', () {
      test('返回 currentMembers 字段值', () {
        // Arrange
        final json = Map<String, dynamic>.from(fullTeamJson)
          ..['currentMembers'] = 3;
        final team = TeamModel.fromJson(json);

        // Act & Assert
        expect(team.approvedMemberCount, equals(3));
      });
    });

    group('hasVacancy getter', () {
      test('currentMembers 小于 maxMembers 时返回 true', () {
        // Arrange: maxMembers=8, currentMembers=1
        final team = TeamModel.fromJson(fullTeamJson);

        // Act & Assert
        expect(team.hasVacancy, isTrue);
      });

      test('currentMembers 等于 maxMembers 时返回 false', () {
        // Arrange: maxMembers=2, currentMembers=2
        final json = Map<String, dynamic>.from(fullTeamJson)
          ..['maxMembers'] = 2
          ..['currentMembers'] = 2;
        final team = TeamModel.fromJson(json);

        // Act & Assert
        expect(team.hasVacancy, isFalse);
      });
    });
  });

  group('TeamMemberModel', () {
    group('fromJson()', () {
      test('正确解析成员数据（含关联用户）', () {
        // Arrange
        final json = <String, dynamic>{
          'id': 'member-001',
          'teamId': 'team-001',
          'userId': 'user-002',
          'status': 'approved',
          'joinedAt': 1705295000,
          'createdAt': 1705290000,
          'user': {
            'id': 'user-002',
            'name': 'Member Name',
            'email': 'member@example.com',
          },
        };

        // Act
        final member = TeamMemberModel.fromJson(json);

        // Assert
        expect(member.id, equals('member-001'));
        expect(member.teamId, equals('team-001'));
        expect(member.userId, equals('user-002'));
        expect(member.status, equals(TeamMemberStatus.approved));
        expect(member.joinedAt, isNotNull);
        expect(member.user, isNotNull);
        expect(member.user!.name, equals('Member Name'));
      });

      test('joinedAt 为 null 时字段也为 null', () {
        // Arrange
        final json = <String, dynamic>{
          'id': 'member-002',
          'teamId': 'team-001',
          'userId': 'user-003',
          'status': 'pending',
          'createdAt': 1705290000,
        };

        // Act
        final member = TeamMemberModel.fromJson(json);

        // Assert
        expect(member.joinedAt, isNull);
        expect(member.user, isNull);
      });
    });
  });
}
