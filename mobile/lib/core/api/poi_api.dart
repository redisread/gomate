import '../constants/api_constants.dart';
import '../models/poi.dart';
import 'api_client.dart';

/// POI（打卡点）相关 API 封装
class PoiApi {
  final ApiClient _client;

  PoiApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 获取单个 POI 详情
  /// [poiId] POI ID
  Future<PoiModel> getPoi(String poiId) async {
    final response = await _client.get(ApiConstants.poiDetail(poiId));
    return PoiModel.fromJson(response.data['poi'] as Map<String, dynamic>);
  }

  /// 搜索 POI（用于管理员搜索添加）
  /// [search] 关键词搜索
  /// [limit] 返回数量限制
  Future<List<PoiModel>> searchPois({
    String? search,
    int? limit,
  }) async {
    final queryParams = <String, dynamic>{
      if (search != null && search.isNotEmpty) 'search': search,
      if (limit != null) 'limit': limit,
    };

    final response = await _client.get(
      ApiConstants.pois,
      queryParameters: queryParams,
    );
    final list = response.data['pois'] as List<dynamic>;
    return list
        .map((item) => PoiModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// 创建新 POI（管理员）
  /// [data] POI 数据（name, description, coordinates, images）
  Future<PoiModel> createPoi(Map<String, dynamic> data) async {
    final response = await _client.post(
      ApiConstants.pois,
      data: data,
    );
    final poiId = response.data['poiId'] as String;
    return getPoi(poiId);
  }

  /// 更新 POI（管理员）
  /// [poiId] POI ID
  /// [data] 更新数据（name, description, coordinates, images）
  Future<PoiModel> updatePoi(String poiId, Map<String, dynamic> data) async {
    await _client.put(
      ApiConstants.poiDetail(poiId),
      data: data,
    );
    return getPoi(poiId);
  }

  /// 删除 POI（管理员）
  /// [poiId] POI ID
  Future<void> deletePoi(String poiId) async {
    await _client.delete(ApiConstants.poiDetail(poiId));
  }
}
