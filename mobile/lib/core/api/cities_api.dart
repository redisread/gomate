import '../constants/api_constants.dart';
import 'api_client.dart';

/// 城市数据模型
class CityModel {
  final String id;
  final String name;

  const CityModel({required this.id, required this.name});

  factory CityModel.fromJson(Map<String, dynamic> json) {
    return CityModel(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}

/// 城市相关 API 封装
class CitiesApi {
  final ApiClient _client;

  CitiesApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 获取城市列表
  /// [hotOnly] 是否只返回热门城市
  Future<List<CityModel>> getCities({bool hotOnly = true}) async {
    final queryParams = <String, dynamic>{
      if (hotOnly) 'hot': 'true',
    };

    final response = await _client.get(
      ApiConstants.cities,
      queryParameters: queryParams,
    );
    final list = response.data['cities'] as List<dynamic>;
    return list
        .map((item) => CityModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
