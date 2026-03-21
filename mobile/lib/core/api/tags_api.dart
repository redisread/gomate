import '../constants/api_constants.dart';
import 'api_client.dart';

/// 标签数据模型
class TagModel {
  final String id;
  final String name;

  const TagModel({required this.id, required this.name});

  factory TagModel.fromJson(Map<String, dynamic> json) {
    return TagModel(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}

/// 标签相关 API 封装
class TagsApi {
  final ApiClient _client;

  TagsApi({ApiClient? client}) : _client = client ?? ApiClient();

  /// 获取地点类型标签列表
  Future<List<TagModel>> getLocationTags() async {
    final response = await _client.get(
      ApiConstants.tags,
      queryParameters: {'type': 'location'},
    );
    final list = response.data['tags'] as List<dynamic>;
    return list
        .map((item) => TagModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
