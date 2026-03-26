# ProGuard 规则
# 保留 Flutter 相关类
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class io.flutter.embedding.** { *; }

# 保留 Better Auth 相关类
-keep class com.betterauth.** { *; }

# 保留 JSON 序列化类
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# 保留 Dio HTTP 客户端
-keep class com.google.gson.** { *; }
-keep class okhttp3.** { *; }

# 保留 Riverpod
-keep class io.flutter_riverpod.** { *; }

# 删除日志
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# 修复 R8 缺失类问题（Play Core）
-dontwarn com.google.android.play.core.splitcompat.SplitCompatApplication
-dontwarn com.google.android.play.core.splitinstall.**
-dontwarn com.google.android.play.core.tasks.**

