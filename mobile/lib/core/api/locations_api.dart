import '../constants/api_constants.dart';
import '../models/location.dart';
import '../models/poi.dart';
import 'api_client.dart';

/// 地点相关 API 封装
class LocationsApi {
  final ApiClient _client;

  LocationsApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 获取地点列表
  /// [cityId] 按城市筛选
  /// [difficulty] 难度筛选（easy/moderate/hard/expert）
  /// [type] 地点类型筛选（hiking/explore/leisure/travel）
  /// [tagIds] 标签 ID 列表，多个标签用逗号拼接传递
  /// [page] 页码
  /// [limit] 每页数量
  Future<List<LocationModel>> getLocations({
    String? cityId,
    String? difficulty,
    String? type,
    List<String>? tagIds,
    String? q,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'pageSize': limit,
      if (cityId != null) 'cityId': cityId,
      if (difficulty != null) 'difficulty': difficulty,
      if (type != null) 'type': type,
      if (tagIds != null && tagIds.isNotEmpty) 'tagIds': tagIds.join(','),
      if (q != null && q.isNotEmpty) 'q': q,
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

  /// 获取地点详情（含路线数据）
  /// [id] 地点 ID 或 slug
  Future<LocationModel> getLocation(String id) async {
    final response = await _client.get(ApiConstants.locationDetail(id));
    return LocationModel.fromJson(
        response.data['location'] as Map<String, dynamic>);
  }

  /// 获取地点关联的 POI（打卡点）列表
  /// [locationId] 地点 ID
  Future<List<PoiModel>> getLocationPois(String locationId) async {
    final response = await _client.get(ApiConstants.locationPois(locationId));
    final list = response.data['pois'] as List<dynamic>;
    return list
        .map((item) => PoiModel.fromJson(item as Map<String, dynamic>))
        .toList();
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

  /// 获取当前用户的收藏地点列表
  Future<List<LocationModel>> getFavorites() async {
    final response = await _client.get(
      ApiConstants.favorites,
      queryParameters: {'entityType': 'location'},
    );
    final list = response.data['favorites'] as List<dynamic>;
    return list
        .map((item) => LocationModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// 取消收藏
  /// [locationId] 地点 ID
  Future<void> removeFavorite(String locationId) async {
    await _client.delete(
      '${ApiConstants.favorites}?entityType=location&entityId=$locationId',
    );
  }
}
