# GoMate Android 发布指南

## 快速开始

### 一键构建 APK
```bash
cd mobile
./scripts/build-android.sh apk
```

### 一键构建 AAB (Google Play)
```bash
cd mobile
./scripts/build-android.sh aab
```

## 发布流程

### 1. 准备签名密钥（已完成 ✅）

签名密钥已创建在：
- `android/app/keys/gomate-release.keystore`
- `android/app/keys/keystore.properties`

**重要**：密钥文件已加入 `.gitignore`，不会被提交到版本控制。

### 2. 配置检查

#### 应用 ID
已配置为：`com.wujiahong.gomate`

#### 应用名称
已配置为：`GoMate`

#### 版本号
编辑 `pubspec.yaml`：
```yaml
version: 1.0.0+1
```
- `1.0.0` - 版本名称（显示给用户）
- `+1` - 版本代码（内部使用，每次发布递增）

### 3. 构建发布包

#### 选项 A：APK（适合直接安装）
```bash
flutter build apk --release
```
输出：`build/app/outputs/flutter-apk/app-release.apk`

#### 选项 B：AAB（适合 Google Play）
```bash
flutter build appbundle --release
```
输出：`build/app/outputs/bundle/release/app-release.aab`

### 4. 验证签名

```bash
# 验证 APK 签名
jarsigner -verify -verbose -certs build/app/outputs/flutter-apk/app-release.apk

# 查看 APK 信息
keytool -printcert -jarfile build/app/outputs/flutter-apk/app-release.apk
```

### 5. 安装测试

```bash
# 安装到连接的设备
adb install build/app/outputs/flutter-apk/app-release.apk
```

## 发布到应用市场

### 国内应用市场

1. **腾讯应用宝**
   - 官网：https://app.open.qq.com/
   - 需要：APK、应用截图、应用描述

2. **小米应用商店**
   - 官网：https://dev.mi.com/
   - 需要：APK、应用截图、隐私政策

3. **华为应用市场**
   - 官网：https://developer.huawei.com/
   - 需要：APK、应用截图、软件著作权

4. **OPPO/vivo/其他**
   - 各厂商开发者平台

### Google Play

1. 访问 https://play.google.com/console
2. 创建应用，上传 AAB 文件
3. 填写应用信息、截图、描述
4. 配置隐私政策
5. 提交审核

## 发布前检查清单

- [ ] 更新版本号（pubspec.yaml）
- [ ] 运行 Flutter 分析无错误
- [ ] 测试发布包功能正常
- [ ] 更新发布说明（CHANGELOG）
- [ ] 准备应用截图（手机+平板）
- [ ] 准备应用描述和关键词
- [ ] 准备隐私政策链接

## 签名密钥备份

**重要**：请备份以下文件到安全位置！

```
android/app/keys/
├── gomate-release.keystore      # 签名密钥（必须备份）
├── gomate-release.keystore.old  # 旧格式备份
└── keystore.properties           # 密钥配置
```

如果丢失签名密钥，将无法更新已发布的应用！

## 常见问题

### Q: 构建失败，提示签名错误？
A: 检查 `android/app/keys/keystore.properties` 是否存在且配置正确。

### Q: 如何更新签名密钥？
A: 不能直接更新，需要创建新密钥并重新发布应用。

### Q: 支持哪些 ABI？
A: 默认支持：arm64-v8a, armeabi-v7a, x86_64

### Q: 如何减小 APK 大小？
A: 已启用 ProGuard 代码混淆和资源压缩。

## 技术支持

- Flutter 文档：https://flutter.dev/deployment/android
- Android 签名指南：https://developer.android.com/studio/publish/app-signing
