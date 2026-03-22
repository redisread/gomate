import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

/// 应用入口
///
/// 职责：
/// 1. 初始化 Flutter binding
/// 2. 配置系统 UI 样式（状态栏/导航栏透明化）
/// 3. 加载 .env 环境变量
/// 4. 启动 Riverpod ProviderScope
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 沉浸式系统 UI（状态栏透明，图标深色）
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarBrightness: Brightness.light,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // 仅支持竖屏
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // 加载 .env 环境变量文件（API 地址等）
  await dotenv.load(fileName: '.env');

  runApp(
    // ProviderScope 是 Riverpod 的全局根节点
    const ProviderScope(
      child: GomateApp(),
    ),
  );
}
