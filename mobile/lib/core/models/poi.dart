/// POI 角色类型枚举
enum PoiRoleType {
  waypoint, // 路线节点
  checkpoint, // 检查点
  viewpoint, // 观景点
  facility, // 设施
  poi; // 兴趣点

  static PoiRoleType fromString(String value) {
    switch (value) {
      case 'waypoint':
        return PoiRoleType.waypoint;
      case 'checkpoint':
        return PoiRoleType.checkpoint;
      case 'viewpoint':
        return PoiRoleType.viewpoint;
      case 'facility':
        return PoiRoleType.facility;
      case 'poi':
        return PoiRoleType.poi;
      default:
        return PoiRoleType.poi;
    }
  }

  String get label {
    switch (this) {
      case PoiRoleType.waypoint:
        return '路线节点';
      case PoiRoleType.checkpoint:
        return '打卡点';
      case PoiRoleType.viewpoint:
        return '观景点';
      case PoiRoleType.facility:
        return '设施';
      case PoiRoleType.poi:
        return '兴趣点';
    }
  }

  String get icon {
    switch (this) {
      case PoiRoleType.waypoint:
        return '📍';
      case PoiRoleType.checkpoint:
        return '✅';
      case PoiRoleType.viewpoint:
        return '👀';
      case PoiRoleType.facility:
        return '🛖';
      case PoiRoleType.poi:
        return '⭐';
    }
  }
}

/// POI 数据模型（对应 db/schema.ts pois 表 + entityToPois 关联信息）
class PoiModel {
  final String id;
  final String name;
  final String? description;
  final Coordinates? coordinates;
  final List<String> images;
  final int? order;
  final PoiRoleType roleType;
  final Map<String, dynamic>? roleSpecificData;

  const PoiModel({
    required this.id,
    required this.name,
    this.description,
    this.coordinates,
    required this.images,
    this.order,
    required this.roleType,
    this.roleSpecificData,
  });

  factory PoiModel.fromJson(Map<String, dynamic> json) {
    List<String> parseImages(dynamic raw) {
      if (raw == null) return [];
      if (raw is List) {
        return raw.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
      }
      return [];
    }

    Coordinates? parseCoords(dynamic raw) {
      if (raw == null || raw is! Map) return null;
      try {
        return Coordinates.fromJson(raw as Map<String, dynamic>);
      } catch (_) {
        return null;
      }
    }

    return PoiModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      coordinates: parseCoords(json['coordinates']),
      images: parseImages(json['images']),
      order: json['order'] as int?,
      roleType: PoiRoleType.fromString(json['roleType'] as String),
      roleSpecificData: json['roleSpecificData'] as Map<String, dynamic>?,
    );
  }
}

/// 坐标数据（复用 location.dart 中的定义，这里单独定义避免循环依赖）
class Coordinates {
  final double lat;
  final double lng;

  const Coordinates({required this.lat, required this.lng});

  factory Coordinates.fromJson(Map<String, dynamic> json) {
    return Coordinates(
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {'lat': lat, 'lng': lng};
}
