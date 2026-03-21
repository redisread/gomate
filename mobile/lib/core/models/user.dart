/// 用户数据模型（对应 db/schema.ts users 表）
class UserModel {
  final String id;
  final String name;
  final String? nickname; // 昵称（展示优先级高于 name）
  final String? email; // 列表接口不返回 email
  final bool emailVerified;
  final String? image; // 头像 URL
  final String? bio; // 个人简介
  final String? gender; // male | female | other
  final String level; // beginner | intermediate | advanced | expert
  final int completedHikes; // 已完成徒步次数
  final String? wechat; // 微信号
  final String role; // user | admin
  final String status; // active | suspended | banned | deleted
  final DateTime? createdAt;

  const UserModel({
    required this.id,
    required this.name,
    this.nickname,
    this.email,
    required this.emailVerified,
    this.image,
    this.bio,
    this.gender,
    required this.level,
    required this.completedHikes,
    this.wechat,
    required this.role,
    required this.status,
    this.createdAt,
  });

  /// 展示名称：优先使用 nickname，回退到 name
  String get displayName => nickname?.isNotEmpty == true ? nickname! : name;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      nickname: json['nickname'] as String?,
      email: json['email'] as String?,
      emailVerified: json['emailVerified'] as bool? ?? false,
      // API 列表接口返回 avatar，详情接口返回 image
      image: (json['image'] ?? json['avatar']) as String?,
      bio: json['bio'] as String?,
      gender: json['gender'] as String?,
      level: json['level'] as String? ?? 'beginner',
      completedHikes: json['completedHikes'] as int? ?? 0,
      wechat: json['wechat'] as String?,
      role: json['role'] as String? ?? 'user',
      status: json['status'] as String? ?? 'active',
      // Better Auth 返回的 createdAt 可能是 ISO 字符串或 Unix 时间戳（int/double）
      createdAt: json['createdAt'] != null
          ? (json['createdAt'] is String
              ? DateTime.tryParse(json['createdAt'] as String)
              : DateTime.fromMillisecondsSinceEpoch(
                  ((json['createdAt'] as num).toDouble() * 1000).round()))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'nickname': nickname,
      'email': email,
      'emailVerified': emailVerified,
      'image': image,
      'bio': bio,
      'gender': gender,
      'level': level,
      'completedHikes': completedHikes,
      'wechat': wechat,
      'role': role,
      'status': status,
    };
  }
}
