import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

/// 应用入口：初始化 Riverpod 状态管理，加载环境变量
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 加载 .env 环境变量文件
  await dotenv.load(fileName: '.env');

  runApp(
    // ProviderScope 是 Riverpod 的根节点，所有 Provider 都在此作用域内
    const ProviderScope(
      child: GomateApp(),
    ),
  );
}
