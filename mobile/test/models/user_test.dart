import 'package:flutter_test/flutter_test.dart';
import 'package:gomate/core/models/user.dart';

void main() {
  group('UserModel', () {
    // 完整用户数据（所有字段）
    final fullJson = <String, dynamic>{
      'id': 'user-001',
      'name': 'Zhang San',
      'nickname': '小张',
      'email': 'zhangsan@example.com',
      'emailVerified': true,
      'image': 'https://example.com/avatar.jpg',
      'bio': '热爱徒步的户外爱好者',
      'gender': 'male',
      'level': 'intermediate',
      'completedHikes': 15,
      'wechat': 'zhangsan_wx',
      'role': 'user',
      'status': 'active',
      'createdAt': '2024-01-15T08:30:00.000Z',
    };

    // 最少字段的用户数据（仅必填字段）
    final minimalJson = <String, dynamic>{
      'id': 'user-002',
      'name': 'Li Si',
      'email': 'lisi@example.com',
    };

    // 使用 Unix 时间戳的用户数据
    final unixTimestampJson = <String, dynamic>{
      'id': 'user-003',
      'name': 'Wang Wu',
      'email': 'wangwu@example.com',
      'createdAt': 1705300200, // Unix 时间戳（秒）
    };

    group('fromJson()', () {
      test('正确解析完整用户数据', () {
        // Arrange: 准备完整 JSON 数据
        // Act
        final user = UserModel.fromJson(fullJson);

        // Assert
        expect(user.id, equals('user-001'));
        expect(user.name, equals('Zhang San'));
        expect(user.nickname, equals('小张'));
        expect(user.email, equals('zhangsan@example.com'));
        expect(user.emailVerified, isTrue);
        expect(user.image, equals('https://example.com/avatar.jpg'));
        expect(user.bio, equals('热爱徒步的户外爱好者'));
        expect(user.gender, equals('male'));
        expect(user.level, equals('intermediate'));
        expect(user.completedHikes, equals(15));
        expect(user.wechat, equals('zhangsan_wx'));
        expect(user.role, equals('user'));
        expect(user.status, equals('active'));
        expect(user.createdAt, isNotNull);
      });

      test('处理缺失可选字段时使用默认值', () {
        // Arrange: 仅必填字段
        // Act
        final user = UserModel.fromJson(minimalJson);

        // Assert: 可选字段为 null，必填字段有默认值
        expect(user.id, equals('user-002'));
        expect(user.name, equals('Li Si'));
        expect(user.email, equals('lisi@example.com'));
        expect(user.nickname, isNull);
        expect(user.image, isNull);
        expect(user.bio, isNull);
        expect(user.gender, isNull);
        expect(user.wechat, isNull);
        expect(user.emailVerified, isFalse); // 默认 false
        expect(user.level, equals('beginner')); // 默认 beginner
        expect(user.completedHikes, equals(0)); // 默认 0
        expect(user.role, equals('user')); // 默认 user
        expect(user.status, equals('active')); // 默认 active
        expect(user.createdAt, isNull);
      });

      test('正确解析 Unix 时间戳格式的 createdAt', () {
        // Arrange: 使用秒级 Unix 时间戳
        // Act
        final user = UserModel.fromJson(unixTimestampJson);

        // Assert: 时间戳被正确转换为 DateTime
        expect(user.createdAt, isNotNull);
        expect(user.createdAt!.year, equals(2024));
      });

      test('正确解析 ISO 字符串格式的 createdAt', () {
        // Arrange
        final json = <String, dynamic>{
          'id': 'user-004',
          'name': 'Test User',
          'email': 'test@example.com',
          'createdAt': '2024-03-15T12:00:00.000Z',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.createdAt, isNotNull);
        expect(user.createdAt!.year, equals(2024));
        expect(user.createdAt!.month, equals(3));
      });

      test('createdAt 为 null 时 createdAt 字段也为 null', () {
        // Arrange
        final json = <String, dynamic>{
          'id': 'user-005',
          'name': 'Test User',
          'email': 'test@example.com',
          'createdAt': null,
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.createdAt, isNull);
      });
    });

    group('toJson()', () {
      test('序列化完整用户数据正确', () {
        // Arrange: 先从 JSON 解析出用户对象
        final user = UserModel.fromJson(fullJson);

        // Act
        final json = user.toJson();

        // Assert: 序列化后关键字段正确
        expect(json['id'], equals('user-001'));
        expect(json['name'], equals('Zhang San'));
        expect(json['nickname'], equals('小张'));
        expect(json['email'], equals('zhangsan@example.com'));
        expect(json['emailVerified'], isTrue);
        expect(json['image'], equals('https://example.com/avatar.jpg'));
        expect(json['bio'], equals('热爱徒步的户外爱好者'));
        expect(json['gender'], equals('male'));
        expect(json['level'], equals('intermediate'));
        expect(json['completedHikes'], equals(15));
        expect(json['wechat'], equals('zhangsan_wx'));
        expect(json['role'], equals('user'));
        expect(json['status'], equals('active'));
      });

      test('可选字段为 null 时序列化包含 null 值', () {
        // Arrange
        final user = UserModel.fromJson(minimalJson);

        // Act
        final json = user.toJson();

        // Assert: null 字段显式包含在 map 中
        expect(json.containsKey('nickname'), isTrue);
        expect(json['nickname'], isNull);
        expect(json.containsKey('image'), isTrue);
        expect(json['image'], isNull);
      });
    });

    group('displayName getter', () {
      test('有 nickname 时返回 nickname', () {
        // Arrange
        final user = UserModel.fromJson(fullJson);

        // Act & Assert
        expect(user.displayName, equals('小张'));
      });

      test('nickname 为空时回退到 name', () {
        // Arrange
        final user = UserModel.fromJson(minimalJson);

        // Act & Assert
        expect(user.displayName, equals('Li Si'));
      });

      test('nickname 为空字符串时回退到 name', () {
        // Arrange
        final json = <String, dynamic>{
          'id': 'user-006',
          'name': 'Fallback Name',
          'email': 'fallback@example.com',
          'nickname': '',
        };
        final user = UserModel.fromJson(json);

        // Act & Assert
        expect(user.displayName, equals('Fallback Name'));
      });
    });
  });
}
