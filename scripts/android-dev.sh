#!/bin/bash
# 启动 Android AVD 模拟器并运行 Flutter 应用

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$SCRIPT_DIR/../mobile"

echo "检查可用的 Android 模拟器..."
EMULATOR_LIST=$(flutter emulators 2>/dev/null)

if echo "$EMULATOR_LIST" | grep -q "Unable to find\|No emulator"; then
  echo "❌ 未找到 Android AVD"
  echo ""
  echo "请先创建 Android 模拟器："
  echo "  1. 打开 Android Studio"
  echo "  2. 进入 Tools > Device Manager"
  echo "  3. 点击 Create Device，选择设备型号和系统镜像"
  echo ""
  open -a "Android Studio" 2>/dev/null && echo "已自动打开 Android Studio" || true
  exit 1
fi

# 获取第一个可用的模拟器 ID
EMULATOR_ID=$(flutter emulators 2>/dev/null | grep -v "^$\|^Flutter\|^[0-9]\|Unable\|No emulator" | awk 'NR==1{print $1}')

if [ -z "$EMULATOR_ID" ]; then
  echo "❌ 无法解析模拟器 ID，请手动运行：flutter emulators"
  exit 1
fi

echo "启动模拟器: $EMULATOR_ID"
flutter emulators --launch "$EMULATOR_ID"

echo "等待模拟器启动..."
sleep 15

echo "运行 Flutter 应用..."
cd "$MOBILE_DIR" && flutter run
