import '../constants/api_constants.dart';
import '../models/location.dart';
import '../models/team.dart';
import 'api_client.dart';

/// 队伍相关 API 封装
class TeamsApi {
  final ApiClient _client;

  TeamsApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 获取队伍列表
  /// [status] 队伍状态筛选（recruiting/full/formed/completed/cancelled）
  /// [locationId] 按地点筛选
  /// [difficulty] 难度筛选（多选用逗号分隔）
  /// [q] 关键词搜索
  /// [page] 页码（从 1 开始）
  /// [limit] 每页数量
  Future<List<TeamModel>> getTeams({
    String? status,
    String? locationId,
    String? difficulty,
    String? q,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'pageSize': limit,
      if (status != null) 'status': status,
      if (locationId != null) 'locationId': locationId,
      if (difficulty != null) 'difficulty': difficulty,
      if (q != null && q.isNotEmpty) 'q': q,
    };

    final response = await _client.get(
      ApiConstants.teams,
      queryParameters: queryParams,
    );
    final list = response.data['teams'] as List<dynamic>;
    return list
        .map((item) => TeamModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// 获取队伍详情
  /// [id] 队伍 ID
  Future<TeamModel> getTeam(String id) async {
    final response = await _client.get(ApiConstants.teamDetail(id));
    return TeamModel.fromJson(response.data['team'] as Map<String, dynamic>);
  }

  /// 创建队伍
  /// [data] 队伍信息（title, locationId, routeId, startTime, endTime, maxMembers 等）
  Future<TeamModel> createTeam(Map<String, dynamic> data) async {
    final response = await _client.post(
      ApiConstants.teams,
      data: data,
    );
    return TeamModel.fromJson(response.data['team'] as Map<String, dynamic>);
  }

  /// 申请加入队伍
  /// [id] 队伍 ID
  /// [message] 留言（可选）
  Future<void> joinTeam(String id, {String? message}) async {
    await _client.post(
      ApiConstants.joinTeam(id),
      data: message != null && message.isNotEmpty ? {'message': message} : null,
    );
  }

  /// 退出/取消申请队伍
  /// [id] 队伍 ID
  Future<void> leaveTeam(String id) async {
    await _client.post(ApiConstants.leaveTeam(id));
  }

  /// 获取当前用户在队伍中的状态
  /// [teamId] 队伍 ID
  Future<MyTeamStatus> getMyStatus(String teamId) async {
    final response = await _client.get(ApiConstants.teamMyStatus(teamId));
    return MyTeamStatus.fromJson(response.data as Map<String, dynamic>);
  }

  /// 获取队伍申请列表（领队专用）
  /// [teamId] 队伍 ID
  Future<List<TeamMemberApplication>> getApplications(String teamId) async {
    final response = await _client.get(ApiConstants.teamApplications(teamId));
    final list = response.data['applications'] as List<dynamic>;
    return list
        .map((item) =>
            TeamMemberApplication.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// 审批通过成员申请（领队专用）
  /// [teamId] 队伍 ID，[userId] 申请者用户 ID
  Future<void> approveApplication(String teamId, String userId) async {
    await _client.post(ApiConstants.approveMember(teamId, userId));
  }

  /// 拒绝成员申请（领队专用）
  /// [teamId] 队伍 ID，[userId] 申请者用户 ID
  Future<void> rejectApplication(String teamId, String userId) async {
    await _client.post(ApiConstants.rejectMember(teamId, userId));
  }

  /// 审批通过成员退出申请（领队专用）
  /// [teamId] 队伍 ID，[userId] 申请退出的用户 ID
  Future<void> approveLeave(String teamId, String userId) async {
    await _client.post(ApiConstants.approveLeave(teamId, userId));
  }

  /// 拒绝成员退出申请（领队专用）
  /// [teamId] 队伍 ID，[userId] 申请退出的用户 ID
  Future<void> rejectLeave(String teamId, String userId) async {
    await _client.post(ApiConstants.rejectLeave(teamId, userId));
  }

  /// 申请退出队伍（成员专用）
  /// [teamId] 队伍 ID
  Future<void> requestLeave(String teamId) async {
    await _client.post(ApiConstants.leaveTeamRequest(teamId));
  }

  /// 更新队伍信息（仅队长可操作）
  /// [teamId] 队伍 ID
  /// [data] 更新数据（title, description, maxMembers, requirements, time, durationMin）
  /// 返回更新后的队伍详情
  Future<TeamModel> updateTeam(String teamId, Map<String, dynamic> data) async {
    await _client.put(
      ApiConstants.teamDetail(teamId),
      data: data,
    );
    return getTeam(teamId);
  }

  /// 获取队伍成员列表（仅队长可查看）
  /// [teamId] 队伍 ID
  Future<List<TeamMemberModel>> getTeamMembers(String teamId) async {
    final response = await _client.get(ApiConstants.teamMembers(teamId));
    final list = response.data['members'] as List<dynamic>;
    return list
        .map((item) => TeamMemberModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// 移除队伍成员（仅队长可操作）
  /// [teamId] 队伍 ID，[userId] 要移除的成员用户 ID
  Future<void> removeMember(String teamId, String userId) async {
    await _client.delete(ApiConstants.removeMember(teamId, userId));
  }

  /// 解散队伍（仅队长可操作）
  /// [teamId] 队伍 ID
  Future<void> deleteTeam(String teamId) async {
    await _client.delete(ApiConstants.teamDetail(teamId));
  }

  /// 更新队伍状态（仅队长可操作）
  /// [teamId] 队伍 ID，[status] 新状态（recruiting/full/formed/completed）
  Future<TeamModel> updateTeamStatus(String teamId, String status) async {
    await _client.put(
      ApiConstants.teamDetail(teamId),
      data: {'status': status},
    );
    return getTeam(teamId);
  }

  /// 获取地点关联的路线列表（用于创建队伍时选择路线）
  /// [locationId] 地点 ID
  Future<List<RouteModel>> getTeamRoutes(String locationId) async {
    final response = await _client.get(
      ApiConstants.routes,
      queryParameters: {'locationId': locationId},
    );
    final list = response.data['routes'] as List<dynamic>;
    return list
        .map((item) => RouteModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
