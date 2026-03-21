/// 坐标数据
class Coordinates {
  final double lat;
  final double lng;

  const Coordinates({required this.lat, required this.lng});

  factory Coordinates.fromJson(Map<String, dynamic> json) {
    return Coordinates(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {'lat': lat, 'lng': lng};
}

/// 地点数据模型（对应 db/schema.ts locations 表）
class LocationModel {
  final String id;
  final String name;
  final String slug; // URL 友好标识
  final String? subtitle; // 副标题
  final String description;
  final String? address;
  final String cityId;
  final String? cityName;
  final List<String> bestSeason; // 最佳季节
  final String coverImage;
  final List<String> images;
  final Coordinates coordinates;
  final List<RouteModel> routes; // 关联路线（按需加载）
  final List<String> tags; // 标签
  final DateTime createdAt;

  const LocationModel({
    required this.id,
    required this.name,
    required this.slug,
    this.subtitle,
    required this.description,
    this.address,
    required this.cityId,
    this.cityName,
    required this.bestSeason,
    required this.coverImage,
    required this.images,
    required this.coordinates,
    required this.routes,
    required this.tags,
    required this.createdAt,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    // 解析字符串数组：支持字符串列表和 JSON 字符串两种格式
    List<String> parseStringList(dynamic raw) {
      if (raw == null) return [];
      if (raw is List) {
        return raw
            .map((e) => e is String ? e : e.toString())
            .where((e) => e.isNotEmpty)
            .toList();
      }
      if (raw is String && raw.isNotEmpty) {
        return raw
            .replaceAll('[', '')
            .replaceAll(']', '')
            .split(',')
            .map((e) => e.trim().replaceAll('"', ''))
            .where((e) => e.isNotEmpty)
            .toList();
      }
      return [];
    }

    // 解析 tags：API 返回 [{id, name, type}] 对象数组，取 name 字段
    List<String> parseTags(dynamic raw) {
      if (raw == null) return [];
      if (raw is List) {
        return raw.map((e) {
          if (e is Map) return (e['name'] ?? '').toString();
          return e.toString();
        }).where((e) => e.isNotEmpty).toList();
      }
      return parseStringList(raw);
    }

    // 解析时间：支持 ISO 字符串和 Unix 时间戳（秒）
    DateTime parseDateTime(dynamic raw) {
      if (raw == null) return DateTime.now();
      if (raw is int) return DateTime.fromMillisecondsSinceEpoch(raw * 1000);
      if (raw is String) return DateTime.tryParse(raw) ?? DateTime.now();
      return DateTime.now();
    }

    return LocationModel(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      subtitle: json['subtitle'] as String?,
      description: json['description'] as String,
      address: json['address'] as String?,
      cityId: json['cityId'] as String,
      cityName: json['cityName'] as String?,
      bestSeason: parseStringList(json['bestSeason']),
      coverImage: json['coverImage'] as String,
      images: parseStringList(json['images']),
      coordinates: Coordinates.fromJson(
        json['coordinates'] is Map
            ? json['coordinates'] as Map<String, dynamic>
            : <String, dynamic>{'lat': 0.0, 'lng': 0.0},
      ),
      routes: (json['routes'] as List<dynamic>?)
              ?.map((r) => RouteModel.fromJson(r as Map<String, dynamic>))
              .toList() ??
          [],
      tags: parseTags(json['tags']),
      createdAt: parseDateTime(json['createdAt']),
    );
  }
}

/// 路线难度枚举
enum Difficulty {
  easy,     // 简单
  moderate, // 中等
  hard,     // 困难
  expert;   // 专家

  static Difficulty fromString(String value) {
    switch (value) {
      case 'easy':
        return Difficulty.easy;
      case 'moderate':
        return Difficulty.moderate;
      case 'hard':
        return Difficulty.hard;
      case 'expert':
        return Difficulty.expert;
      default:
        return Difficulty.moderate;
    }
  }

  /// 中文显示文本
  String get label {
    switch (this) {
      case Difficulty.easy:
        return '简单';
      case Difficulty.moderate:
        return '中等';
      case Difficulty.hard:
        return '困难';
      case Difficulty.expert:
        return '专家';
    }
  }
}

/// 路线数据模型（对应 db/schema.ts routes 表）
class RouteModel {
  final String id;
  final String locationId;
  final String name;
  final String? description;
  final Difficulty difficulty;
  final int durationMin; // 最短耗时（分钟）
  final int durationMax; // 最长耗时（分钟）
  final double distance; // 路线长度（公里）
  final int? elevation; // 累计爬升（米）

  const RouteModel({
    required this.id,
    required this.locationId,
    required this.name,
    this.description,
    required this.difficulty,
    required this.durationMin,
    required this.durationMax,
    required this.distance,
    this.elevation,
  });

  factory RouteModel.fromJson(Map<String, dynamic> json) {
    return RouteModel(
      id: json['id'] as String,
      locationId: json['locationId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      difficulty: Difficulty.fromString(json['difficulty'] as String),
      durationMin: json['durationMin'] as int,
      durationMax: json['durationMax'] as int,
      distance: (json['distance'] as num).toDouble(),
      elevation: json['elevation'] as int?,
    );
  }
}
