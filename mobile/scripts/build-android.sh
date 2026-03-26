#!/bin/bash
# GoMate Android 发布构建脚本
# 使用方法: ./build-android.sh [apk|aab]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   GoMate Android 发布构建脚本${NC}"
echo -e "${GREEN}=========================================${NC}"
echo

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MOBILE_DIR="$SCRIPT_DIR/.."

cd "$MOBILE_DIR"

# 密钥配置
KEYSTORE_FILE="$MOBILE_DIR/android/app/keys/gomate-release.keystore"
KEYSTORE_PASS="gomate2024"
KEY_ALIAS="gomate"
KEY_PASS="gomate2024"

# 检查签名密钥是否存在
if [ ! -f "$KEYSTORE_FILE" ]; then
    echo -e "${RED}错误：签名密钥不存在！${NC}"
    echo "请确保已创建签名密钥："
    echo "  cd android/app/keys"
    echo "  keytool -genkey -v -keystore gomate-release.keystore -alias gomate -keyalg RSA -keysize 2048 -validity 10000"
    exit 1
fi

# 清理旧构建
echo -e "${YELLOW}1. 清理旧构建...${NC}"
flutter clean

# 获取依赖
echo -e "${YELLOW}2. 获取依赖...${NC}"
flutter pub get

# 构建类型
BUILD_TYPE="${1:-apk}"

if [ "$BUILD_TYPE" = "apk" ]; then
    echo -e "${YELLOW}3. 构建发布 APK...${NC}"
    flutter build apk --release

    echo -e "${YELLOW}4. 签名 APK...${NC}"
    jarsigner -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASS" \
        -keypass "$KEY_PASS" "build/app/outputs/flutter-apk/app-release.apk" "$KEY_ALIAS"

    echo -e "${YELLOW}5. 验证签名...${NC}"
    jarsigner -verify "build/app/outputs/flutter-apk/app-release.apk" > /dev/null 2>&1 && echo "签名验证成功" || echo "签名验证失败"

    echo
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}   APK 构建成功！${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo
    echo "文件位置："
    echo "  build/app/outputs/flutter-apk/app-release.apk"
    echo
    echo "APK 信息："
    ls -lh build/app/outputs/flutter-apk/app-release.apk

elif [ "$BUILD_TYPE" = "aab" ]; then
    echo -e "${YELLOW}3. 构建发布 AAB (Google Play)...${NC}"
    flutter build appbundle --release

    echo
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}   AAB 构建成功！${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo
    echo "文件位置："
    echo "  build/app/outputs/bundle/release/app-release.aab"
    echo
    echo "AAB 信息："
    ls -lh build/app/outputs/bundle/release/app-release.aab
else
    echo -e "${RED}错误：未知的构建类型 '$BUILD_TYPE'${NC}"
    echo "使用方法:"
    echo "  ./build-android.sh apk   # 构建 APK"
    echo "  ./build-android.sh aab   # 构建 AAB (Google Play)"
    exit 1
fi

echo
echo -e "${GREEN}下一步操作：${NC}"
if [ "$BUILD_TYPE" = "apk" ]; then
    echo "  1. 安装到设备测试："
    echo "     adb install build/app/outputs/flutter-apk/app-release.apk"
    echo
    echo "  2. 上传到应用市场："
    echo "     - 腾讯应用宝"
    echo "     - 小米应用商店"
    echo "     - 华为应用市场"
    echo "     - 其他"
else
    echo "  1. 登录 Google Play Console"
    echo "     https://play.google.com/console"
    echo
    echo "  2. 上传 AAB 文件到 Play Console"
    echo "  3. 配置应用信息并发布"
fi
