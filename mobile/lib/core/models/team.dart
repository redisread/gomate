import 'user.dart';

/// 当前用户在队伍中的身份角色
enum MyTeamRole {
  visitor, // 访客（未加入）
  member,  // 普通成员
  leader;  // 领队

  static MyTeamRole fromString(String value) {
    switch (value) {
      case 'leader':
        return MyTeamRole.leader;
      case 'member':
        return MyTeamRole.member;
      default:
        return MyTeamRole.visitor;
    }
  }
}

/// 当前用户在队伍中的状态信息
class MyTeamStatus {
  final MyTeamRole role;
  /// 成员状态（pending/approved/rejected/leave_pending），访客时为 null
  final String? memberStatus;

  const MyTeamStatus({required this.role, this.memberStatus});

  factory MyTeamStatus.fromJson(Map<String, dynamic> json) {
    final roleStr = json['role'] as String? ?? 'visitor';
    final statusStr = json['status'] as String?;
    return MyTeamStatus(
      role: MyTeamRole.fromString(roleStr),
      memberStatus: statusStr,
    );
  }
}

/// 队伍申请成员数据模型
class TeamMemberApplication {
  final String id;
  final String userId;
  final String userName;
  final String? wechat;
  final DateTime createdAt;
  final String status;

  const TeamMemberApplication({
    required this.id,
    required this.userId,
    required this.userName,
    this.wechat,
    required this.createdAt,
    required this.status,
  });

  factory TeamMemberApplication.fromJson(Map<String, dynamic> json) {
    return TeamMemberApplication(
      id: json['id'] as String,
      userId: json['userId'] as String,
      userName: json['userName'] as String? ?? '',
      wechat: json['wechat'] as String?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
          (json['createdAt'] as int) * 1000),
      status: json['status'] as String? ?? 'pending',
    );
  }
}

/// 队伍成员状态枚举
enum TeamMemberStatus {
  pending,    // 待审核
  approved,   // 已通过
  rejected,   // 已拒绝
  leavePending; // 退出申请中

  static TeamMemberStatus fromString(String value) {
    switch (value) {
      case 'pending':
        return TeamMemberStatus.pending;
      case 'approved':
        return TeamMemberStatus.approved;
      case 'rejected':
        return TeamMemberStatus.rejected;
      case 'leave_pending':
        return TeamMemberStatus.leavePending;
      default:
        return TeamMemberStatus.pending;
    }
  }
}

/// 队伍状态枚举
enum TeamStatus {
  recruiting, // 招募中
  full,       // 已满
  formed,     // 已组建
  completed,  // 已完成
  cancelled;  // 已取消

  static TeamStatus fromString(String value) {
    switch (value) {
      case 'recruiting':
        return TeamStatus.recruiting;
      case 'full':
        return TeamStatus.full;
      case 'formed':
        return TeamStatus.formed;
      case 'completed':
        return TeamStatus.completed;
      case 'cancelled':
        return TeamStatus.cancelled;
      default:
        return TeamStatus.recruiting;
    }
  }

  /// 状态对应的中文显示文本
  String get label {
    switch (this) {
      case TeamStatus.recruiting:
        return '招募中';
      case TeamStatus.full:
        return '已满';
      case TeamStatus.formed:
        return '已组建';
      case TeamStatus.completed:
        return '已完成';
      case TeamStatus.cancelled:
        return '已取消';
    }
  }
}

/// 队伍成员数据模型
class TeamMemberModel {
  final String id;
  final String teamId;
  final String userId;
  final TeamMemberStatus status;
  final UserModel? user; // 关联用户信息（可选，按需加载）
  final DateTime? joinedAt;
  final DateTime createdAt;

  const TeamMemberModel({
    required this.id,
    required this.teamId,
    required this.userId,
    required this.status,
    this.user,
    this.joinedAt,
    required this.createdAt,
  });

  factory TeamMemberModel.fromJson(Map<String, dynamic> json) {
    return TeamMemberModel(
      id: json['id'] as String,
      teamId: json['teamId'] as String,
      userId: json['userId'] as String,
      status: TeamMemberStatus.fromString(json['status'] as String),
      user: json['user'] != null
          ? UserModel.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      joinedAt: json['joinedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch((json['joinedAt'] as int) * 1000)
          : null,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
          (json['createdAt'] as int) * 1000),
    );
  }
}

/// 队伍数据模型（对应 db/schema.ts teams 表）
class TeamModel {
  final String id;
  final String locationId;
  final String? routeId;
  final String leaderId;
  final String title;
  final String? description;
  /// 活动日期，格式 "2026-03-30"
  final String date;
  /// 活动时间，格式 "09:00"
  final String time;
  final int durationMin; // 活动时长（分钟）
  final int maxMembers;
  /// 当前已审核通过的成员数（来自 API currentMembers 字段）
  final int currentMembers;
  final List<String> requirements; // 入队要求
  final String icon; // 队伍图标（emoji）
  final TeamStatus status;
  final UserModel? leader; // 领队用户信息（可选，按需加载）
  final DateTime createdAt;

  const TeamModel({
    required this.id,
    required this.locationId,
    this.routeId,
    required this.leaderId,
    required this.title,
    this.description,
    required this.date,
    required this.time,
    required this.durationMin,
    required this.maxMembers,
    required this.currentMembers,
    required this.requirements,
    required this.icon,
    required this.status,
    this.leader,
    required this.createdAt,
  });

  /// 当前已审核通过的成员数量
  int get approvedMemberCount => currentMembers;

  /// 是否还有空位
  bool get hasVacancy => currentMembers < maxMembers;

  factory TeamModel.fromJson(Map<String, dynamic> json) {
    // 解析入队要求（JSON 字符串数组）
    final requirementsRaw = json['requirements'];
    List<String> requirements = [];
    if (requirementsRaw is List) {
      requirements = requirementsRaw.cast<String>();
    }

    // createdAt 可能是 ISO 字符串或 Unix 时间戳（秒）
    DateTime parseCreatedAt(dynamic raw) {
      if (raw == null) return DateTime.now();
      if (raw is int) return DateTime.fromMillisecondsSinceEpoch(raw * 1000);
      if (raw is String) return DateTime.tryParse(raw) ?? DateTime.now();
      return DateTime.now();
    }

    return TeamModel(
      id: json['id'] as String,
      locationId: json['locationId'] as String,
      routeId: json['routeId'] as String?,
      leaderId: json['leaderId'] as String? ?? '',
      title: json['title'] as String,
      description: json['description'] as String?,
      date: json['date'] as String? ?? '',
      time: json['time'] as String? ?? '',
      durationMin: json['durationMin'] as int? ?? 240,
      maxMembers: json['maxMembers'] as int? ?? 10,
      currentMembers: json['currentMembers'] as int? ?? 0,
      requirements: requirements,
      icon: json['icon'] as String? ?? '⛰️',
      status: TeamStatus.fromString(json['status'] as String),
      leader: json['leader'] != null
          ? UserModel.fromJson(json['leader'] as Map<String, dynamic>)
          : null,
      createdAt: parseCreatedAt(json['createdAt']),
    );
  }
}
