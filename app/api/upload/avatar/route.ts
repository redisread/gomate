import { NextRequest, NextResponse } from "next/server";

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// 最大文件大小 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * 生成唯一文件名
 */
function generateFileName(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const extension = originalName.split(".").pop() || "jpg";
  return `avatars/${userId}/${timestamp}-${random}.${extension}`;
}

/**
 * POST /api/upload/avatar
 * 上传用户头像到 R2 存储
 */
export async function POST(request: NextRequest) {
  try {
    // 获取 Cloudflare 上下文和 R2 绑定
    const { env } = await getCloudflareContext();

    if (!env.R2) {
      return NextResponse.json(
        { error: "R2 storage not configured" },
        { status: 500 }
      );
    }

    const r2 = env.R2 as R2Bucket;

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    // 验证参数
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();

    // 生成唯一文件名
    const key = generateFileName(userId, file.name);

    // 上传到 R2
    await r2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000", // 1 year cache
      },
    });

    // 获取公开 URL
    // 本地开发模式下使用 /api/r2/ 路径访问，生产环境使用 R2_PUBLIC_URL
    // 通过检查请求头判断是否是本地开发环境
    const host = request.headers.get("host") || "";
    const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
    const publicUrl = isLocalDev
      ? `/api/r2/${key}`
      : `${process.env.R2_PUBLIC_URL || ""}/${key}`;

    return NextResponse.json({
      success: true,
      key,
      url: publicUrl,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload/avatar
 * 删除用户头像
 */
export async function DELETE(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();

    if (!env.R2) {
      return NextResponse.json(
        { error: "R2 storage not configured" },
        { status: 500 }
      );
    }

    const r2 = env.R2 as R2Bucket;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Object key is required" },
        { status: 400 }
      );
    }

    await r2.delete(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
