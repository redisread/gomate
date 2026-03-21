import '../constants/api_constants.dart';
import '../models/location.dart';
import 'api_client.dart';

/// 地点相关 API 封装
class LocationsApi {
  final ApiClient _client;

  LocationsApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 获取地点列表
  /// [cityId] 按城市筛选
  /// [difficulty] 难度筛选（easy/moderate/hard/expert）
  /// [tagIds] 标签 ID 列表，多个标签用逗号拼接传递
  /// [page] 页码
  /// [limit] 每页数量
  Future<List<LocationModel>> getLocations({
    String? cityId,
    String? difficulty,
    List<String>? tagIds,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'pageSize': limit,
      if (cityId != null) 'cityId': cityId,
      if (difficulty != null) 'difficulty': difficulty,
      if (tagIds != null && tagIds.isNotEmpty) 'tagIds': tagIds.join(','),
    };

    final response = await _client.get(
      ApiConstants.locations,
      queryParameters: queryParams,
    );
    final list = response.data['locations'] as List<dynamic>;
    return list
        .map((item) => LocationModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// 获取地点详情（含路线和 POI 数据）
  /// [id] 地点 ID 或 slug
  Future<LocationModel> getLocation(String id) async {
    final response = await _client.get(ApiConstants.locationDetail(id));
    return LocationModel.fromJson(
        response.data['location'] as Map<String, dynamic>);
  }

  /// 切换地点收藏状态
  /// [locationId] 地点 ID
  /// 收藏则添加，已收藏则取消
  Future<bool> favoriteLocation(String locationId) async {
    final response = await _client.post(
      ApiConstants.favoriteToggle('location', locationId),
    );
    return response.data['favorited'] as bool;
  }
}
