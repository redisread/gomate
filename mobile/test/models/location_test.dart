import 'package:flutter_test/flutter_test.dart';
import 'package:gomate/core/models/location.dart';

void main() {
  group('Difficulty', () {
    group('fromString()', () {
      test('正确映射所有已知难度枚举值', () {
        // Arrange & Act & Assert
        expect(Difficulty.fromString('easy'), equals(Difficulty.easy));
        expect(Difficulty.fromString('moderate'), equals(Difficulty.moderate));
        expect(Difficulty.fromString('hard'), equals(Difficulty.hard));
        expect(Difficulty.fromString('expert'), equals(Difficulty.expert));
      });

      test('未知值回退到 moderate', () {
        // Arrange & Act & Assert
        expect(Difficulty.fromString('unknown'), equals(Difficulty.moderate));
        expect(Difficulty.fromString(''), equals(Difficulty.moderate));
      });
    });

    group('label getter', () {
      test('各难度返回正确中文标签', () {
        // Arrange & Act & Assert
        expect(Difficulty.easy.label, equals('简单'));
        expect(Difficulty.moderate.label, equals('中等'));
        expect(Difficulty.hard.label, equals('困难'));
        expect(Difficulty.expert.label, equals('专家'));
      });
    });
  });

  group('Coordinates', () {
    group('fromJson()', () {
      test('正确解析 double 类型坐标', () {
        // Arrange
        final json = <String, dynamic>{'lat': 22.5431, 'lng': 114.0579};

        // Act
        final coords = Coordinates.fromJson(json);

        // Assert
        expect(coords.lat, equals(22.5431));
        expect(coords.lng, equals(114.0579));
      });

      test('正确解析 int 类型坐标（num 兼容）', () {
        // Arrange
        final json = <String, dynamic>{'lat': 22, 'lng': 114};

        // Act
        final coords = Coordinates.fromJson(json);

        // Assert
        expect(coords.lat, equals(22.0));
        expect(coords.lng, equals(114.0));
      });
    });

    group('toJson()', () {
      test('正确序列化坐标数据', () {
        // Arrange
        const coords = Coordinates(lat: 22.5431, lng: 114.0579);

        // Act
        final json = coords.toJson();

        // Assert
        expect(json['lat'], equals(22.5431));
        expect(json['lng'], equals(114.0579));
      });
    });
  });

  group('LocationModel', () {
    // 完整地点 JSON 数据
    final fullLocationJson = <String, dynamic>{
      'id': 'loc-001',
      'name': '梧桐山',
      'slug': 'wutongshan',
      'subtitle': '深圳最高峰',
      'description': '深圳最高的山，海拔943.7米',
      'address': '深圳市盐田区',
      'cityId': 'shenzhen',
      'cityName': '深圳',
      'bestSeason': ['spring', 'autumn'],
      'coverImage': 'https://example.com/cover.jpg',
      'images': ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      'coordinates': {'lat': 22.6055, 'lng': 114.2285},
      'routes': [
        {
          'id': 'route-001',
          'locationId': 'loc-001',
          'name': '北坡主线',
          'difficulty': 'moderate',
          'durationMin': 180,
          'durationMax': 240,
          'distance': 8.5,
          'elevation': 800,
        }
      ],
      'tags': ['徒步', '观景台'],
      'createdAt': 1705280000,
    };

    // 最少字段地点 JSON
    final minimalLocationJson = <String, dynamic>{
      'id': 'loc-002',
      'name': '大南山',
      'slug': 'dananshan',
      'description': '适合入门的城市公园',
      'cityId': 'shenzhen',
      'coverImage': 'https://example.com/cover2.jpg',
      'coordinates': {'lat': 22.4910, 'lng': 113.9150},
    };

    group('fromJson()', () {
      test('正确解析完整地点数据', () {
        // Arrange: 准备完整 JSON 数据
        // Act
        final location = LocationModel.fromJson(fullLocationJson);

        // Assert
        expect(location.id, equals('loc-001'));
        expect(location.name, equals('梧桐山'));
        expect(location.slug, equals('wutongshan'));
        expect(location.subtitle, equals('深圳最高峰'));
        expect(location.description, equals('深圳最高的山，海拔943.7米'));
        expect(location.address, equals('深圳市盐田区'));
        expect(location.cityId, equals('shenzhen'));
        expect(location.cityName, equals('深圳'));
        expect(location.bestSeason, equals(['spring', 'autumn']));
        expect(location.coverImage, equals('https://example.com/cover.jpg'));
        expect(location.images.length, equals(2));
        expect(location.coordinates.lat, equals(22.6055));
        expect(location.coordinates.lng, equals(114.2285));
        expect(location.routes.length, equals(1));
        expect(location.routes.first.name, equals('北坡主线'));
        expect(location.tags, equals(['徒步', '观景台']));
      });

      test('处理可选字段缺失', () {
        // Arrange: 仅必填字段
        // Act
        final location = LocationModel.fromJson(minimalLocationJson);

        // Assert
        expect(location.id, equals('loc-002'));
        expect(location.subtitle, isNull);
        expect(location.address, isNull);
        expect(location.cityName, isNull);
        expect(location.bestSeason, isEmpty);
        expect(location.images, isEmpty);
        expect(location.routes, isEmpty);
        expect(location.tags, isEmpty);
        expect(location.createdAt, isNotNull); // 无 createdAt 时使用 now()
      });

      test('坐标字段无效时使用默认值 (0, 0)', () {
        // Arrange: 不传 coordinates（内部兜底）
        final json = Map<String, dynamic>.from(minimalLocationJson)
          ..['coordinates'] = null;

        // Act: coordinates 为 null，内部回退到 {lat:0, lng:0}
        final location = LocationModel.fromJson(json);

        // Assert
        expect(location.coordinates.lat, equals(0.0));
        expect(location.coordinates.lng, equals(0.0));
      });

      test('正确解析路线列表', () {
        // Arrange & Act
        final location = LocationModel.fromJson(fullLocationJson);
        final route = location.routes.first;

        // Assert
        expect(route.id, equals('route-001'));
        expect(route.difficulty, equals(Difficulty.moderate));
        expect(route.durationMin, equals(180));
        expect(route.durationMax, equals(240));
        expect(route.distance, equals(8.5));
        expect(route.elevation, equals(800));
      });

      test('bestSeason/images/tags 为 JSON 字符串时正确解析', () {
        // Arrange: 模拟 SQLite 存储的 JSON 字符串
        final json = Map<String, dynamic>.from(fullLocationJson)
          ..['bestSeason'] = '["spring","autumn"]'
          ..['tags'] = '["徒步","观景台"]';

        // Act
        final location = LocationModel.fromJson(json);

        // Assert: 字符串解析结果
        expect(location.bestSeason, isNotEmpty);
        expect(location.tags, isNotEmpty);
      });
    });
  });

  group('RouteModel', () {
    group('fromJson()', () {
      test('正确解析路线数据（含 elevation）', () {
        // Arrange
        final json = <String, dynamic>{
          'id': 'route-001',
          'locationId': 'loc-001',
          'name': '主峰路线',
          'description': '经典主峰路线，难度适中',
          'difficulty': 'hard',
          'durationMin': 240,
          'durationMax': 300,
          'distance': 12.0,
          'elevation': 1200,
        };

        // Act
        final route = RouteModel.fromJson(json);

        // Assert
        expect(route.id, equals('route-001'));
        expect(route.locationId, equals('loc-001'));
        expect(route.name, equals('主峰路线'));
        expect(route.description, equals('经典主峰路线，难度适中'));
        expect(route.difficulty, equals(Difficulty.hard));
        expect(route.durationMin, equals(240));
        expect(route.durationMax, equals(300));
        expect(route.distance, equals(12.0));
        expect(route.elevation, equals(1200));
      });

      test('elevation 缺失时为 null', () {
        // Arrange
        final json = <String, dynamic>{
          'id': 'route-002',
          'locationId': 'loc-001',
          'name': '简单路线',
          'difficulty': 'easy',
          'durationMin': 60,
          'durationMax': 90,
          'distance': 3.5,
        };

        // Act
        final route = RouteModel.fromJson(json);

        // Assert
        expect(route.elevation, isNull);
        expect(route.description, isNull);
      });
    });
  });
}
