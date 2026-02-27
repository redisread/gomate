import { NextRequest, NextResponse } from "next/server";
import { uploadUserAvatar, deleteImage } from "@/lib/storage";

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// 最大文件大小 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload/avatar
 * 上传用户头像到 R2 存储
 */
export async function POST(request: NextRequest) {
  try {
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

    // 使用 lib/storage.ts 中的上传函数
    const result = await uploadUserAvatar(
      arrayBuffer,
      file.name,
      file.type
    );

    // 本地开发模式下使用 /api/r2/ 路径访问
    const host = request.headers.get("host") || "";
    const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
    const publicUrl = isLocalDev
      ? `/api/r2/${result.key}`
      : result.publicUrl;

    return NextResponse.json({
      success: true,
      key: result.key,
      url: publicUrl,
      size: result.size,
      type: `image/${result.format}`,
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
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Object key is required" },
        { status: 400 }
      );
    }

    await deleteImage(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}